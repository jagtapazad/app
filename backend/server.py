from fastapi import FastAPI, APIRouter, HTTPException, Header, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import requests
import uuid
import httpx

from models import (
    WaitlistEntry, WaitlistCreate, User, UserSession,
    Agent, UserAgent, ChatQuery, ChatMessage, ChatExecuteRequest,
    AnalyticsEntry, UserCredits, SessionDataResponse
)
from agent_orchestrator import AgentOrchestrator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# DeepAgents configuration
DEEPAGENTS_URL = os.environ.get("DEEPAGENTS_URL", "http://108.130.44.215:8000")
DEEPAGENTS_DEFAULT_AGENT = os.environ.get("DEEPAGENTS_DEFAULT_AGENT", "smart_router")
DEEPAGENTS_TIMEOUT = int(os.environ.get("DEEPAGENTS_TIMEOUT", "5000"))

# Create the main app
app = FastAPI()

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Initialize Agent Orchestrator
orchestrator = AgentOrchestrator()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Helper function to get current user from session
async def get_current_user(authorization: Optional[str] = None, session_token_cookie: Optional[str] = None) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    token = session_token_cookie or (authorization.replace("Bearer ", "") if authorization else None)

    if not token:
        return None

    # Check if session exists and not expired
    session = await db.user_sessions.find_one({
        "session_token": token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })

    if not session:
        return None

    # Get user
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None

    return User(**user_doc)

# ===== DeepAgents Helpers =====
async def call_deepagents(agent_name: str, user_query: str, thread_id: str) -> Dict[str, Any]:
    """Invoke DeepAgents chat endpoint and return JSON payload."""
    payload = {
        "agent_name": agent_name,
        "user_query": user_query,
        "thread_id": thread_id,
    }
    return await orchestrator.send_chat(payload)

# ===== WAITLIST ENDPOINTS =====
@api_router.post("/waitlist", response_model=WaitlistEntry)
async def create_waitlist_entry(entry: WaitlistCreate):
    """Submit waitlist entry"""
    # Check if email already exists
    existing = await db.waitlist.find_one({"email": entry.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    waitlist_obj = WaitlistEntry(**entry.model_dump())
    doc = waitlist_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()

    await db.waitlist.insert_one(doc)
    return waitlist_obj

@api_router.get("/admin/waitlist", response_model=List[WaitlistEntry])
async def get_waitlist():
    """Get all waitlist entries (admin only - add auth later)"""
    entries = await db.waitlist.find({}, {"_id": 0}).to_list(1000)

    for entry in entries:
        if isinstance(entry['timestamp'], str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])

    return entries

@api_router.post("/admin/waitlist/{entry_id}/approve")
async def approve_waitlist(entry_id: str):
    """Approve waitlist entry (admin only)"""
    result = await db.waitlist.update_one(
        {"id": entry_id},
        {"$set": {"approved": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"message": "Approved successfully"}

# ===== AUTHENTICATION ENDPOINTS =====
@api_router.post("/auth/session-data", response_model=SessionDataResponse)
async def process_session(x_session_id: str = Header(...)):
    """Process Google OAuth session ID from Emergent Auth"""
    try:
        # Call Emergent auth service
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id},
            timeout=10
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")

        data = response.json()

        # Check if user exists
        user_doc = await db.users.find_one({"email": data["email"]})

        if not user_doc:
            # Create new user
            user = User(
                id=data["id"],
                email=data["email"],
                name=data["name"],
                picture=data.get("picture")
            )
            user_dict = user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)

            # Initialize user credits
            credits = UserCredits(user_id=user.id)
            await db.user_credits.insert_one(credits.model_dump())

        # Create session
        session_token = data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        session = UserSession(
            user_id=data["id"],
            session_token=session_token,
            expires_at=expires_at
        )
        session_dict = session.model_dump()
        session_dict['expires_at'] = session_dict['expires_at'].isoformat()
        session_dict['created_at'] = session_dict['created_at'].isoformat()

        await db.user_sessions.insert_one(session_dict)

        return SessionDataResponse(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            picture=data.get("picture", ""),
            session_token=session_token
        )

    except requests.RequestException as e:
        logger.error(f"Error calling auth service: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/auth/me", response_model=User)
async def get_current_user_endpoint(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Get current authenticated user"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Logout user"""
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)

    if token:
        await db.user_sessions.delete_one({"session_token": token})

    # Clear cookie
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

# ===== AGENT ENDPOINTS =====
@api_router.get("/agents", response_model=List[Agent])
async def get_all_agents():
    """Get all available agents"""
    agents = await db.agents.find({}, {"_id": 0}).to_list(100)
    return agents

@api_router.get("/agents/public", response_model=List[Agent])
async def get_all_agents_public():
    """Get all available agents (public endpoint for development)"""
    agents = await db.agents.find({}, {"_id": 0}).to_list(100)
    return agents

@api_router.get("/agents/subscribed", response_model=List[Agent])
async def get_subscribed_agents(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Get user's subscribed agents"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get user's subscribed agent IDs
    user_agents = await db.user_agents.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    agent_ids = [ua["agent_id"] for ua in user_agents]

    # Get agent details
    agents = await db.agents.find({"id": {"$in": agent_ids}}, {"_id": 0}).to_list(100)
    return agents

@api_router.post("/agents/{agent_id}/subscribe")
async def subscribe_agent(
    agent_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Subscribe to an agent"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if already subscribed
    existing = await db.user_agents.find_one({"user_id": user.id, "agent_id": agent_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed")

    user_agent = UserAgent(user_id=user.id, agent_id=agent_id)
    doc = user_agent.model_dump()
    doc['subscribed_at'] = doc['subscribed_at'].isoformat()

    await db.user_agents.insert_one(doc)
    return {"message": "Subscribed successfully"}

@api_router.delete("/agents/{agent_id}/unsubscribe")
async def unsubscribe_agent(
    agent_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Unsubscribe from an agent"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.user_agents.delete_one({"user_id": user.id, "agent_id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not subscribed")

    return {"message": "Unsubscribed successfully"}

# ===== CHAT ENDPOINTS =====
@api_router.post("/chat/preview")
async def preview_agent_chain(
    query: ChatQuery,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Preview agent chain for a query (called as user types)."""
    _ = await get_current_user(authorization, session_token)

    return {
        "agent_chain": [
            {
                "agent_id": DEEPAGENTS_DEFAULT_AGENT,
                "agent_name": DEEPAGENTS_DEFAULT_AGENT,
                "purpose": "Routed via DeepAgents smart router",
            }
        ]
    }

@api_router.post("/chat/execute")
async def execute_chat_query(
    request: ChatExecuteRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Execute query via DeepAgents and persist a minimal chat record."""
    user = await get_current_user(authorization, session_token)
    user_id = user.id if user else "demo-user-123"

    resolved_thread_id = request.thread_id or str(uuid.uuid4())
    resolved_agent = request.agent_name or DEEPAGENTS_DEFAULT_AGENT

    try:
        agent_payload = await call_deepagents(
            resolved_agent,
            request.user_query,
            resolved_thread_id,
        )
    except httpx.HTTPStatusError as exc:
        logger.error("DeepAgents responded with error: %s", exc)
        raise HTTPException(status_code=exc.response.status_code, detail="DeepAgents service error") from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to reach DeepAgents: %s", exc)
        raise HTTPException(status_code=502, detail="DeepAgents service unavailable") from exc

    agent_payload.setdefault("thread_id", resolved_thread_id)
    agent_payload.setdefault("agent_name", resolved_agent)
    agent_payload.setdefault("user_query", request.user_query)

    chat_message = ChatMessage(
        user_id=user_id,
        thread_id=agent_payload["thread_id"],
        query=request.user_query,
        agent_chain=[
            {
                "agent_id": agent_payload["agent_name"],
                "agent_name": agent_payload["agent_name"],
                "purpose": "Processed via DeepAgents",
            }
        ],
        response=agent_payload,
        fetch_ui=False,
        personalized=False,
    )

    record = chat_message.model_dump()
    record["timestamp"] = record["timestamp"].isoformat()
    await db.chat_history.insert_one(record)

    return {
        "thread_id": agent_payload["thread_id"],
        "agent_name": agent_payload["agent_name"],
        "result": agent_payload.get("result"),
        "sources": agent_payload.get("source", []),
        "raw_response": agent_payload,
    }

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def get_chat_history(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None),
    limit: int = 50
):
    """Get user's chat history."""
    user = await get_current_user(authorization, session_token)
    user_id = user.id if user else "demo-user-123"

    messages = await db.chat_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    for msg in messages:
        if isinstance(msg["timestamp"], str):
            msg["timestamp"] = datetime.fromisoformat(msg["timestamp"])

    return messages

@api_router.get("/chat/state/{thread_id}")
async def get_chat_state(thread_id: str):
    """Poll for background process/thinking steps for a thread."""
    try:
        return await orchestrator.get_state(thread_id)
    except httpx.HTTPStatusError as exc:
        logger.error("DeepAgents state error: %s", exc)
        raise HTTPException(status_code=exc.response.status_code, detail="DeepAgents state error") from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Error polling state: %s", exc)
        return {"status": "unknown", "thinking_steps": []}

@api_router.delete("/chat/thread/{thread_id}")
async def delete_thread(
    thread_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Delete all messages in a thread"""
    user = await get_current_user(authorization, session_token)
    user_id = user.id if user else "demo-user-123"

    # Delete all messages with this thread_id
    result = await db.chat_history.delete_many({"thread_id": thread_id, "user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Thread not found")

    return {"message": f"Deleted {result.deleted_count} messages", "deleted_count": result.deleted_count}

# ===== ANALYTICS ENDPOINTS =====
@api_router.get("/analytics")
async def get_analytics(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Get user's usage analytics"""
    user = await get_current_user(authorization, session_token)
    user_id = user.id if user else "demo-user-123"

    # Get analytics entries
    entries = await db.analytics.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)

    for entry in entries:
        if isinstance(entry.get('timestamp'), str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])

    # Get credit balance
    credits = await db.user_credits.find_one({"user_id": user_id}, {"_id": 0})

    # Aggregate stats
    total_queries = len(entries)
    total_cost = sum([e.get("cost", 0) for e in entries])
    agent_usage = {}

    for entry in entries:
        agent_name = entry.get("agent_name", "Unknown")
        if agent_name not in agent_usage:
            agent_usage[agent_name] = {"queries": 0, "cost": 0}
        agent_usage[agent_name]["queries"] += 1
        agent_usage[agent_name]["cost"] += entry.get("cost", 0)

    return {
        "total_queries": total_queries,
        "total_cost": total_cost,
        "credits": credits,
        "agent_usage": agent_usage,
        "recent_entries": entries[-50:]
    }

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    """Initialize database with default agents"""
    count = await db.agents.count_documents({})
    if count == 0:
        default_agents = [
            {"id": "scira_ai", "name": "Scira AI", "categories": ["People", "Market Research", "Scientific Research", "Others"], "api_url": "https://api.scira.ai/docs", "api_key_env": "SCIRA_AI_KEY", "is_opensource": False, "cost_per_query": 0.05, "description": "Comprehensive research agent for people, market, and scientific research", "icon_url": None},
            {"id": "gpt_researcher", "name": "GPT Researcher", "categories": ["Market Research", "Scientific Research"], "api_url": "https://gptr.dev/", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Open-source research agent for market and scientific analysis", "icon_url": None},
            {"id": "deerflow", "name": "Deerflow", "categories": ["People", "Market Research"], "api_url": "https://github.com/bytedance/deer-flow", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.01, "description": "ByteDance's open-source research framework for deep insights", "icon_url": None},
            {"id": "linkup", "name": "Linkup.so", "categories": ["Market Research", "Scientific Research"], "api_url": "https://app.linkup.so/playground", "api_key_env": "LINKUP_KEY", "is_opensource": False, "cost_per_query": 0.03, "description": "Research and data aggregation platform", "icon_url": None},
            {"id": "abacus_ai", "name": "Abacus.ai", "categories": ["Market Research", "Scientific Research"], "api_url": "https://abacus.ai", "api_key_env": "ABACUS_AI_KEY", "is_opensource": False, "cost_per_query": 0.04, "description": "AI-powered analytics and research platform", "icon_url": None},
            {"id": "octagon_ai", "name": "Octagon AI", "categories": ["Market Research", "Scientific Research"], "api_url": "https://docs.octagonagents.com", "api_key_env": "OCTAGON_AI_KEY", "is_opensource": False, "cost_per_query": 0.05, "description": "Specialized agent for comprehensive research tasks", "icon_url": None},
            {"id": "perplexity", "name": "Perplexity", "categories": ["People", "Market Research", "Scientific Research", "Others"], "api_url": None, "api_key_env": None, "is_opensource": False, "cost_per_query": 0.03, "description": "Advanced AI search and research agent with real-time data", "icon_url": None},
            {"id": "exa", "name": "Exa", "categories": ["People", "Market Research", "Scientific Research"], "api_url": "https://dashboard.exa.ai", "api_key_env": "EXA_KEY", "is_opensource": False, "cost_per_query": 0.02, "description": "Neural search engine for deep research", "icon_url": None},
            {"id": "answerthis", "name": "AnswerThis.io", "categories": ["Scientific Research"], "api_url": "AnswerThis.io", "api_key_env": None, "is_opensource": False, "cost_per_query": 0.04, "description": "Specialized scientific research agent for academic queries", "icon_url": None},
            {"id": "parallel_ai", "name": "Parallel AI", "categories": ["People", "Market Research", "Scientific Research"], "api_url": "https://docs.parallel.ai/", "api_key_env": "PARALLEL_AI_KEY", "is_opensource": False, "cost_per_query": 0.03, "description": "Multi-agent parallel processing platform", "icon_url": None},
            {"id": "morphic", "name": "Morphic", "categories": ["Market Research", "Scientific Research"], "api_url": "https://github.com/18CH10007/morphic", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Open-source research framework for comprehensive analysis", "icon_url": None},
            {"id": "openai_research", "name": "OpenAI Research", "categories": ["People", "Market Research", "Scientific Research", "Others"], "api_url": None, "api_key_env": "OPENAI_KEY", "is_opensource": False, "cost_per_query": 0.06, "description": "OpenAI's deep research capabilities for complex queries", "icon_url": None},
            {"id": "nebius", "name": "Nebius AI Agent", "categories": ["People", "Market Research", "Scientific Research"], "api_url": "https://github.com/Arindam200/awesome-ai-apps", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Advanced open-source research agent", "icon_url": None},
            {"id": "clado_ai", "name": "Clado.ai", "categories": ["People"], "api_url": None, "api_key_env": None, "is_opensource": False, "cost_per_query": 0.04, "description": "Specialized people research agent for finding and analyzing information about individuals", "icon_url": None},
            {"id": "apollo_io", "name": "Apollo.io", "categories": ["People"], "api_url": "https://www.apollo.io/", "api_key_env": None, "is_opensource": False, "cost_per_query": 0.04, "description": "Advanced people research platform for professional background checks and analysis", "icon_url": None},
            {"id": "more_agents", "name": "14 More Specialized AI Agents", "categories": ["People", "Market Research", "Scientific Research", "Others"], "api_url": None, "api_key_env": None, "is_opensource": False, "cost_per_query": 0.0, "description": "Additional specialized AI agents coming soon for enhanced research capabilities", "icon_url": None}
        ]
        await db.agents.insert_many(default_agents)
        logger.info("Initialized agents")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
