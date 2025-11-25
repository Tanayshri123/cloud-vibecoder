from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime


class JobStatus(str, Enum):
    """Status of an orchestration job"""
    PENDING = "pending"
    INITIALIZING_VM = "initializing_vm"
    CLONING_REPO = "cloning_repo"
    EXECUTING_AGENT = "executing_agent"
    PUSHING_CHANGES = "pushing_changes"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobRequest(BaseModel):
    """Request to create a new coding job"""
    repo_url: str = Field(description="GitHub repository URL")
    branch: str = Field(default="main", description="Branch to work on")
    github_token: str = Field(description="GitHub personal access token")
    implementation_plan: Dict[str, Any] = Field(description="Implementation plan as dict")
    create_new_branch: bool = Field(default=True, description="Create a new branch for changes")
    new_branch_name: Optional[str] = Field(default=None, description="Name for new branch")
    push_changes: bool = Field(default=True, description="Push changes to remote")


class JobProgress(BaseModel):
    """Progress information for a job"""
    status: JobStatus = Field(description="Current job status")
    current_step: Optional[str] = Field(default=None, description="Current operation")
    progress_percentage: int = Field(default=0, ge=0, le=100, description="Progress 0-100")
    message: Optional[str] = Field(default=None, description="Status message")


class JobResult(BaseModel):
    """Result of a completed job"""
    job_id: str = Field(description="Unique job ID")
    status: JobStatus = Field(description="Final job status")
    success: bool = Field(description="Whether job completed successfully")
    
    # VM info
    vm_session_id: Optional[str] = Field(default=None, description="VM session ID")
    
    # Repository info
    repo_path: Optional[str] = Field(default=None, description="Local repository path")
    branch_name: Optional[str] = Field(default=None, description="Branch used")
    
    # Agent execution results
    files_changed: int = Field(default=0, description="Number of files changed")
    commits_created: int = Field(default=0, description="Number of commits created")
    total_edits: int = Field(default=0, description="Total number of edits")
    
    # Execution metrics
    tokens_used: int = Field(default=0, description="LLM tokens used")
    execution_time_seconds: float = Field(default=0.0, description="Total execution time")
    
    # Error info
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    error_stage: Optional[str] = Field(default=None, description="Stage where error occurred")
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Job start time")
    completed_at: Optional[datetime] = Field(default=None, description="Job completion time")
    
    # Output
    commit_shas: list[str] = Field(default_factory=list, description="List of commit SHAs")
    pushed: bool = Field(default=False, description="Whether changes were pushed")


class Job(BaseModel):
    """Complete job information"""
    job_id: str = Field(description="Unique job ID")
    request: JobRequest = Field(description="Original job request")
    progress: JobProgress = Field(description="Current progress")
    result: Optional[JobResult] = Field(default=None, description="Job result if completed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Job creation time")
