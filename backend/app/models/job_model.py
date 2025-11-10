from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileChange(BaseModel):
    """Represents a file changed by the coding agent"""
    path: str = Field(description="File path relative to repo root")
    status: str = Field(description="Change status: modified, added, deleted")
    diff_summary: Optional[str] = Field(default=None, description="Brief summary of changes")


class AgentResult(BaseModel):
    """Result of coding agent execution"""
    status: str = Field(description="Execution status: success, no_changes, error")
    branch_name: str = Field(description="Branch where changes were made")
    files_modified: List[str] = Field(default_factory=list, description="List of modified files")
    commit_hash: Optional[str] = Field(default=None, description="Git commit hash")
    diff: Optional[str] = Field(default=None, description="Base64 encoded diff")
    execution_logs: List[str] = Field(default_factory=list, description="Execution log messages")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    pr_url: Optional[str] = Field(default=None, description="Pull request URL if created")
    pr_number: Optional[int] = Field(default=None, description="Pull request number")
    forked: Optional[bool] = Field(default=None, description="Whether changes were pushed to a fork")


class AgentJob(BaseModel):
    """Job for coding agent execution"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique job identifier")
    user_id: Optional[str] = Field(default=None, description="User who submitted the job")
    repo_url: str = Field(description="GitHub repository URL")
    prompt: str = Field(description="User's change request prompt")
    plan_id: Optional[str] = Field(default=None, description="Associated plan ID")
    access_token: Optional[str] = Field(default=None, description="GitHub OAuth token for PR creation")
    status: JobStatus = Field(default=JobStatus.QUEUED, description="Current job status")
    result: Optional[AgentResult] = Field(default=None, description="Execution result")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Job creation time")
    started_at: Optional[datetime] = Field(default=None, description="Job start time")
    completed_at: Optional[datetime] = Field(default=None, description="Job completion time")
    error_message: Optional[str] = Field(default=None, description="Error message if job failed")
    progress: Optional[str] = Field(default=None, description="Current progress description")


class AgentJobRequest(BaseModel):
    """Request to submit a new agent job"""
    repo_url: str = Field(description="GitHub repository URL")
    prompt: str = Field(description="User's change request prompt")
    plan_id: Optional[str] = Field(default=None, description="Associated plan ID")
    access_token: Optional[str] = Field(default=None, description="GitHub OAuth token for PR creation")


class AgentJobResponse(BaseModel):
    """Response for job submission"""
    job_id: str = Field(description="Job identifier")
    status: JobStatus = Field(description="Initial job status")
    estimated_duration: Optional[str] = Field(default=None, description="Estimated execution time")


class JobStatusResponse(BaseModel):
    """Response for job status query"""
    job: AgentJob = Field(description="Current job state")
    progress_percentage: Optional[float] = Field(default=None, description="Progress percentage (0-100)")
    eta_seconds: Optional[int] = Field(default=None, description="Estimated time remaining in seconds")
