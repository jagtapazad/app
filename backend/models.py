from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# Waitlist Model
class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved: bool = False

class WaitlistCreate(BaseModel):
    email: str
    name: str

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Agent Models
class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    categories: List[str]
    api_url: Optional[str] = None
    api_key_env: Optional[str] = None
    is_opensource: bool = False
    cost_per_query: float
    description: str
    icon_url: Optional[str] = None

class UserAgent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_id: str
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Chat Models
class AgentInChain(BaseModel):
    agent_id: str
    agent_name: str
    purpose: str

class ChatQuery(BaseModel):
    query: str
    fetch_ui: bool = False
    personalized: bool = False

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    thread_id: str
    query: str
    agent_chain: List[Dict[str, Any]]
    response: Dict[str, Any]
    fetch_ui: bool
    personalized: bool
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatExecuteRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None
    agent_chain: List[Dict[str, Any]]
    fetch_ui: bool = False
    personalized: bool = False

class EditOperation(BaseModel):
    message_id: str
    section_id: str
    operation: str  # iterate, delete, dissolve
    instruction: Optional[str] = None

# Analytics Models
class AnalyticsEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_id: str
    agent_name: str
    tokens_used: int
    cost: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCredits(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    total_credits: float = 100.0
    used_credits: float = 0.0

# Session Data Response
class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str