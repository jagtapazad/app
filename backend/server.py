from fastapi import FastAPI, APIRouter, HTTPException, Header, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import requests

from models import (
    WaitlistEntry, WaitlistCreate, User, UserSession,
    Agent, UserAgent, ChatQuery, ChatMessage, ChatExecuteRequest,
    EditOperation, AnalyticsEntry, UserCredits, SessionDataResponse
)
from agent_orchestrator import AgentOrchestrator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    """Preview agent chain for a query (called as user types)"""
    user = await get_current_user(authorization, session_token)
    user_id = user.id if user else "demo-user-123"
    
    # Get user's subscribed agents if authenticated
    subscribed_agents = []
    if user:
        user_agents = await db.user_agents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        agent_ids = [ua["agent_id"] for ua in user_agents]
        subscribed_agents = await db.agents.find({"id": {"$in": agent_ids}}, {"_id": 0}).to_list(100)
    
    # Decompose query into agent chain
    agent_chain = await orchestrator.decompose_query(
        query.query,
        subscribed_agents,
        query.personalized and user is not None
    )
    
    return {"agent_chain": agent_chain}

@api_router.post("/chat/execute")
async def execute_chat_query(
    request: ChatExecuteRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Execute query with agent chain"""
    user = await get_current_user(authorization, session_token)
    
    # For development: use demo user if not authenticated
    user_id = user.id if user else "demo-user-123"
    
    # Execute agent chain
    result = await orchestrator.execute_agent_chain(
        request.query,
        request.agent_chain,
        request.fetch_ui
    )
    
    # Save to chat history
    chat_message = ChatMessage(
        user_id=user_id,
        query=request.query,
        agent_chain=request.agent_chain,
        response=result,
        fetch_ui=request.fetch_ui,
        personalized=request.personalized
    )
    
    doc = chat_message.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.chat_history.insert_one(doc)
    
    # Record analytics
    for agent_info in request.agent_chain:
        agent = await db.agents.find_one({"id": agent_info["agent_id"]})
        if agent:
            analytics = AnalyticsEntry(
                user_id=user_id,
                agent_id=agent_info["agent_id"],
                agent_name=agent_info["agent_name"],
                tokens_used=500,
                cost=agent.get("cost_per_query", 0.01)
            )
            analytics_doc = analytics.model_dump()
            analytics_doc['timestamp'] = analytics_doc['timestamp'].isoformat()
            await db.analytics.insert_one(analytics_doc)
            
            # Update user credits if authenticated
            if user:
                await db.user_credits.update_one(
                    {"user_id": user_id},
                    {"$inc": {"used_credits": agent.get("cost_per_query", 0.01)}}
                )
    
    return result

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def get_chat_history(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None),
    limit: int = 50
):
    """Get user's chat history"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    messages = await db.chat_history.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for msg in messages:
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.post("/chat/edit")
async def edit_message_section(
    edit: EditOperation,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Apply edit operation (iterate/delete/dissolve) on message section"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get original message
    message = await db.chat_history.find_one({"id": edit.message_id, "user_id": user.id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Apply edit operation
    updated_response = await orchestrator.apply_edit_operation(
        message["response"],
        edit.section_id,
        edit.operation,
        edit.instruction
    )
    
    # Update message
    await db.chat_history.update_one(
        {"id": edit.message_id},
        {"$set": {"response": updated_response}}
    )
    
    return {"response": updated_response}

# ===== ANALYTICS ENDPOINTS =====
@api_router.get("/analytics")
async def get_analytics(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Header(None)
):
    """Get user's usage analytics"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get analytics entries
    entries = await db.analytics.find(
        {"user_id": user.id},
        {"_id": 0}
    ).to_list(1000)
    
    for entry in entries:
        if isinstance(entry.get('timestamp'), str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    # Get credit balance
    credits = await db.user_credits.find_one({"user_id": user.id}, {"_id": 0})
    
    # Aggregate stats
    total_queries = len(entries)
    total_cost = sum([e["cost"] for e in entries])
    agent_usage = {}
    
    for entry in entries:
        agent_name = entry["agent_name"]
        if agent_name not in agent_usage:
            agent_usage[agent_name] = {"queries": 0, "cost": 0}
        agent_usage[agent_name]["queries"] += 1
        agent_usage[agent_name]["cost"] += entry["cost"]
    
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
            {"id": "scira_ai", "name": "Scira AI", "categories": ["People", "Market Research", "Scientific Research", "Others"], "api_url": "https://api.scira.ai/docs", "api_key_env": "SCIRA_AI_KEY", "is_opensource": False, "cost_per_query": 0.05, "description": "Comprehensive research agent", "icon_url": None},
            {"id": "gpt_researcher", "name": "GPT Researcher", "categories": ["Market Research", "Scientific Research"], "api_url": "https://gptr.dev/", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Open-source research agent", "icon_url": None},
            {"id": "deerflow", "name": "Deerflow", "categories": ["People", "Market Research"], "api_url": "https://github.com/bytedance/deer-flow", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.01, "description": "ByteDance research framework", "icon_url": None},
            {"id": "linkup", "name": "Linkup.so", "categories": ["Market Research"], "api_url": "https://app.linkup.so/playground", "api_key_env": "LINKUP_KEY", "is_opensource": False, "cost_per_query": 0.03, "description": "Research platform", "icon_url": None},
            {"id": "abacus_ai", "name": "Abacus.ai", "categories": ["Market Research"], "api_url": "https://abacus.ai", "api_key_env": "ABACUS_AI_KEY", "is_opensource": False, "cost_per_query": 0.04, "description": "AI analytics", "icon_url": None},
            {"id": "octagon_ai", "name": "Octagon AI", "categories": ["Market Research"], "api_url": "https://docs.octagonagents.com", "api_key_env": "OCTAGON_AI_KEY", "is_opensource": False, "cost_per_query": 0.05, "description": "Research agent", "icon_url": None},
            {"id": "perplexity", "name": "Perplexity", "categories": ["People", "Market Research", "Scientific Research"], "api_url": None, "api_key_env": None, "is_opensource": False, "cost_per_query": 0.03, "description": "AI search", "icon_url": None},
            {"id": "exa", "name": "Exa", "categories": ["People", "Market Research"], "api_url": "https://dashboard.exa.ai", "api_key_env": "EXA_KEY", "is_opensource": False, "cost_per_query": 0.02, "description": "Neural search", "icon_url": None},
            {"id": "answerthis", "name": "AnswerThis.io", "categories": ["Scientific Research"], "api_url": "AnswerThis.io", "api_key_env": None, "is_opensource": False, "cost_per_query": 0.04, "description": "Scientific research", "icon_url": None},
            {"id": "parallel_ai", "name": "Parallel AI", "categories": ["People", "Market Research"], "api_url": "https://docs.parallel.ai/", "api_key_env": "PARALLEL_AI_KEY", "is_opensource": False, "cost_per_query": 0.03, "description": "Multi-agent platform", "icon_url": None},
            {"id": "morphic", "name": "Morphic", "categories": ["Market Research"], "api_url": "https://github.com/18CH10007/morphic", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Research framework", "icon_url": None},
            {"id": "openai_research", "name": "OpenAI Research", "categories": ["People", "Market Research", "Scientific Research"], "api_url": None, "api_key_env": "OPENAI_KEY", "is_opensource": False, "cost_per_query": 0.06, "description": "Deep research", "icon_url": None},
            {"id": "nebius", "name": "Nebius AI Agent", "categories": ["People", "Market Research"], "api_url": "https://github.com/Arindam200/awesome-ai-apps", "api_key_env": None, "is_opensource": True, "cost_per_query": 0.02, "description": "Research agent", "icon_url": None}
        ]
        await db.agents.insert_many(default_agents)
        logger.info("Initialized agents")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()