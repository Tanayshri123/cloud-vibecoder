from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class VMStatus(str, Enum):
    """Status of a VM session"""
    CREATING = "creating"
    READY = "ready"
    EXECUTING = "executing"
    FAILED = "failed"
    DESTROYED = "destroyed"


class VMSession(BaseModel):
    """Represents an active VM session"""
    session_id: str = Field(description="Unique session identifier")
    status: VMStatus = Field(description="Current status of the VM")
    created_at: datetime = Field(description="When the session was created")
    expires_at: Optional[datetime] = Field(default=None, description="When the session expires")
    
    class Config:
        use_enum_values = True


class VMExecutionResult(BaseModel):
    """Result of executing a command in the VM"""
    success: bool = Field(description="Whether the command executed successfully")
    output: Optional[str] = Field(default=None, description="Standard output from the command")
    error: Optional[str] = Field(default=None, description="Error output if any")
    exit_code: int = Field(default=0, description="Exit code of the command")


class VMFileOperation(BaseModel):
    """Request to read or write a file in the VM"""
    path: str = Field(description="File path in the VM")
    content: Optional[str] = Field(default=None, description="Content to write (for write operations)")
