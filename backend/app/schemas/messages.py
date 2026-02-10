"""Schemas for messaging."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    recipient_id: int
    message: str = Field(..., min_length=1, max_length=1000)


class MessageRecipientResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    store_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)
