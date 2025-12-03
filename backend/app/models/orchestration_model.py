from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime


class JobStatus(str, Enum):
    """Status of an orchestration job"""
    PENDING = "pending"
    INITIALIZING_VM = "initializing_vm"
    CREATING_REPO = "creating_repo"  # New status for repo creation
    CLONING_REPO = "cloning_repo"
    EXECUTING_AGENT = "executing_agent"
    PUSHING_CHANGES = "pushing_changes"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NewRepoConfig(BaseModel):
    """Configuration for creating a new repository"""
    name: str = Field(description="Repository name")
    description: Optional[str] = Field(default=None, description="Repository description")
    private: bool = Field(default=False, description="Whether the repository is private")
    gitignore_template: Optional[str] = Field(default=None, description="Gitignore template name")
    license_template: Optional[str] = Field(default=None, description="License template key")


class JobRequest(BaseModel):
    """Request to create a new coding job - supports both existing and new repos"""
    # Existing repo fields (optional when creating new repo)
    repo_url: Optional[str] = Field(default=None, description="GitHub repository URL (required if not creating new repo)")
    branch: str = Field(default="main", description="Branch to work on")
    
    # New repo fields
    create_new_repo: bool = Field(default=False, description="Whether to create a new repository")
    new_repo_config: Optional[NewRepoConfig] = Field(default=None, description="Configuration for new repository")
    
    # Common fields
    github_token: str = Field(description="GitHub personal access token")
    implementation_plan: Dict[str, Any] = Field(description="Implementation plan as dict")
    create_new_branch: bool = Field(default=True, description="Create a new branch for changes")
    new_branch_name: Optional[str] = Field(default=None, description="Name for new branch")
    push_changes: bool = Field(default=True, description="Push changes to remote")
    
    # User tracking
    user_id: Optional[int] = Field(default=None, description="Database user ID for tracking")
    
    def model_post_init(self, __context) -> None:
        """Validate that either repo_url or new_repo_config is provided"""
        if self.create_new_repo:
            if not self.new_repo_config:
                raise ValueError("new_repo_config is required when create_new_repo is True")
        else:
            if not self.repo_url:
                raise ValueError("repo_url is required when create_new_repo is False")


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
    repo_url: Optional[str] = Field(default=None, description="Repository URL")
    repo_path: Optional[str] = Field(default=None, description="Local repository path")
    branch_name: Optional[str] = Field(default=None, description="Branch used")
    created_new_repo: bool = Field(default=False, description="Whether a new repo was created")
    
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
