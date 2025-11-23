from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class AgentStepStatus(str, Enum):
    """Status of an agent execution step"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class EditType(str, Enum):
    """Type of file edit"""
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"


class FileEdit(BaseModel):
    """Represents a single file edit made by the agent"""
    file_path: str = Field(description="Path to the edited file")
    original_content: Optional[str] = Field(default=None, description="Original file content")
    new_content: str = Field(description="New file content after edit")
    edit_type: EditType = Field(description="Type of edit performed")
    lines_added: int = Field(default=0, description="Number of lines added")
    lines_removed: int = Field(default=0, description="Number of lines removed")


class ValidationResult(BaseModel):
    """Result of validating code changes"""
    success: bool = Field(description="Whether validation passed")
    file_path: str = Field(description="File that was validated")
    error_message: Optional[str] = Field(default=None, description="Error message if validation failed")
    validation_type: str = Field(description="Type of validation (syntax, lint, test)")


class AgentStepResult(BaseModel):
    """Result of executing a single plan step"""
    step_number: int = Field(description="Step number from the plan")
    step_title: str = Field(description="Title of the step")
    status: AgentStepStatus = Field(description="Execution status")
    edits: List[FileEdit] = Field(default_factory=list, description="File edits made in this step")
    validations: List[ValidationResult] = Field(default_factory=list, description="Validation results")
    error_message: Optional[str] = Field(default=None, description="Error message if step failed")
    llm_tokens_used: int = Field(default=0, description="Tokens used by LLM for this step")
    execution_time_seconds: float = Field(default=0.0, description="Time taken to execute step")
    commit_sha: Optional[str] = Field(default=None, description="Git commit SHA if committed")


class AgentExecutionResult(BaseModel):
    """Final result of agent executing an implementation plan"""
    success: bool = Field(description="Whether execution was successful")
    steps_completed: List[AgentStepResult] = Field(description="Results for each step")
    total_edits: int = Field(description="Total number of file edits")
    total_files_changed: int = Field(description="Number of unique files changed")
    commits_created: List[str] = Field(default_factory=list, description="List of commit SHAs")
    error_message: Optional[str] = Field(default=None, description="Error message if execution failed")
    total_tokens_used: int = Field(default=0, description="Total LLM tokens used")
    total_execution_time_seconds: float = Field(default=0.0, description="Total execution time")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Execution start time")
    completed_at: Optional[datetime] = Field(default=None, description="Execution completion time")


class AgentContext(BaseModel):
    """Context information for the agent during execution"""
    vm_session_id: str = Field(description="VM session ID")
    repo_path: str = Field(description="Path to repository in VM")
    repo_url: str = Field(description="Repository URL")
    branch_name: str = Field(description="Current branch name")
    files_context: Dict[str, str] = Field(default_factory=dict, description="Cache of file contents")


class LLMCodeGenerationRequest(BaseModel):
    """Request for LLM to generate code changes"""
    file_path: str = Field(description="File to modify")
    current_content: str = Field(description="Current file content")
    change_description: str = Field(description="What change to make")
    step_context: str = Field(description="Context from the implementation step")
    related_files: Dict[str, str] = Field(default_factory=dict, description="Related files for context")


class LLMCodeGenerationResponse(BaseModel):
    """Response from LLM with generated code"""
    new_content: str = Field(description="New file content")
    explanation: str = Field(description="Explanation of changes made")
    tokens_used: int = Field(description="Tokens consumed")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the changes (0-1)")
