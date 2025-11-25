from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class RepoCloneRequest(BaseModel):
    """Request to clone a repository"""
    repo_url: str = Field(description="GitHub repository URL")
    branch: Optional[str] = Field(default="main", description="Branch to clone")
    github_token: str = Field(description="GitHub personal access token for authentication")


class RepoFile(BaseModel):
    """Represents a file in the repository"""
    path: str = Field(description="File path relative to repo root")
    content: str = Field(description="File content")
    sha: Optional[str] = Field(default=None, description="Git SHA of the file")


class GitCommit(BaseModel):
    """Represents a git commit"""
    message: str = Field(description="Commit message")
    files: List[str] = Field(description="List of file paths included in commit")
    sha: str = Field(description="Commit SHA hash")
    author: Optional[str] = Field(default=None, description="Commit author")
    timestamp: Optional[datetime] = Field(default=None, description="Commit timestamp")


class RepoSession(BaseModel):
    """Represents an active repository session in a VM"""
    vm_session_id: str = Field(description="Associated VM session ID")
    repo_url: str = Field(description="Repository URL")
    local_path: str = Field(description="Local path in VM where repo is cloned")
    branch: str = Field(description="Current branch")
    default_branch: str = Field(description="Default branch of the repository")


class GitStatus(BaseModel):
    """Git repository status"""
    branch: str = Field(description="Current branch name")
    is_dirty: bool = Field(description="Whether there are uncommitted changes")
    untracked_files: List[str] = Field(default_factory=list, description="Untracked files")
    modified_files: List[str] = Field(default_factory=list, description="Modified files")
    staged_files: List[str] = Field(default_factory=list, description="Staged files")


class RepoPushResult(BaseModel):
    """Result of pushing to remote repository"""
    success: bool = Field(description="Whether push was successful")
    branch_name: str = Field(description="Branch that was pushed")
    remote_url: str = Field(description="Remote URL pushed to")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
