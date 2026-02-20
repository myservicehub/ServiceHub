from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"

class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered" 
    READ = "read"

class Message(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_type: str  # "homeowner" or "tradesperson"
    message_type: MessageType = MessageType.TEXT
    content: str
    attachment_url: Optional[str] = None
    status: MessageStatus = MessageStatus.SENT
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    conversation_id: str
    message_type: MessageType = MessageType.TEXT
    content: str
    attachment_url: Optional[str] = None

class Conversation(BaseModel):
    id: str
    job_id: str
    job_title: str
    homeowner_id: str
    homeowner_name: str
    tradesperson_id: str
    tradesperson_name: str
    job_status: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count_homeowner: int = 0
    unread_count_tradesperson: int = 0
    created_at: datetime
    updated_at: datetime

class ConversationCreate(BaseModel):
    job_id: str
    homeowner_id: str
    tradesperson_id: str

class ConversationList(BaseModel):
    conversations: List[Conversation]
    total: int

class MessageList(BaseModel):
    messages: List[Message]
    total: int
    has_more: bool

class ConversationSummary(BaseModel):
    id: str
    job_title: str
    other_party_name: str
    other_party_type: str  # "homeowner" or "tradesperson"
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime