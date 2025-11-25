from fastapi import APIRouter, HTTPException
from app.services.github_service import (
    GitHubService, PullRequestRequest, PullRequest, GitHubCommit
)
from pydantic import BaseModel, Field
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Global GitHub service instance
github_service = GitHubService()


class CreatePRRequest(BaseModel):
    """Request to create a pull request"""
    repo_owner: str = Field(description="Repository owner username")
    repo_name: str = Field(description="Repository name")
    title: str = Field(description="PR title")
    body: str = Field(description="PR description/body")
    head_branch: str = Field(description="Source branch with changes")
    base_branch: str = Field(default="main", description="Target branch (default: main)")
    github_token: str = Field(description="GitHub personal access token")


class GetCommitsRequest(BaseModel):
    """Request to get branch commits"""
    repo_owner: str = Field(description="Repository owner username")
    repo_name: str = Field(description="Repository name")
    branch_name: str = Field(description="Branch name")
    github_token: str = Field(description="GitHub personal access token")
    max_commits: int = Field(default=10, description="Maximum commits to retrieve")


class BranchExistsRequest(BaseModel):
    """Request to check if branch exists"""
    repo_owner: str = Field(description="Repository owner username")
    repo_name: str = Field(description="Repository name")
    branch_name: str = Field(description="Branch name to check")
    github_token: str = Field(description="GitHub personal access token")


class ParseRepoUrlRequest(BaseModel):
    """Request to parse GitHub URL"""
    repo_url: str = Field(description="GitHub repository URL")


class ParseRepoUrlResponse(BaseModel):
    """Response with parsed repo info"""
    owner: str = Field(description="Repository owner")
    repo_name: str = Field(description="Repository name")


@router.post("/github/create-pr", response_model=PullRequest)
async def create_pull_request(request: CreatePRRequest):
    """
    Create a pull request on GitHub.
    
    This endpoint creates a PR from a branch with code changes to the base branch.
    Typically used after the orchestration service has pushed changes to a branch.
    
    Request body:
    - repo_owner: GitHub username or organization
    - repo_name: Repository name
    - title: PR title
    - body: PR description (supports Markdown)
    - head_branch: Source branch with your changes
    - base_branch: Target branch (usually 'main' or 'master')
    - github_token: Personal access token with repo permissions
    
    Returns:
    - PullRequest object with PR number, URL, and details
    
    Example:
    ```
    {
      "repo_owner": "username",
      "repo_name": "my-repo",
      "title": "Add new feature",
      "body": "This PR adds...",
      "head_branch": "feature-branch",
      "base_branch": "main",
      "github_token": "ghp_..."
    }
    ```
    """
    try:
        logger.info(f"API: Creating PR in {request.repo_owner}/{request.repo_name}")
        
        pr_request = PullRequestRequest(
            repo_owner=request.repo_owner,
            repo_name=request.repo_name,
            title=request.title,
            body=request.body,
            head_branch=request.head_branch,
            base_branch=request.base_branch,
            github_token=request.github_token
        )
        
        pr = await github_service.create_pull_request(pr_request)
        
        logger.info(f"API: PR created successfully: #{pr.number}")
        return pr
        
    except Exception as e:
        logger.error(f"API: Failed to create PR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/commits", response_model=List[GitHubCommit])
async def get_branch_commits(request: GetCommitsRequest):
    """
    Get commits from a branch.
    
    This endpoint retrieves the commit history from a specific branch.
    Useful for showing what changes were made before creating a PR.
    
    Request body:
    - repo_owner: GitHub username or organization
    - repo_name: Repository name
    - branch_name: Branch to get commits from
    - github_token: Personal access token
    - max_commits: Maximum number of commits to retrieve (default: 10)
    
    Returns:
    - List of commits with SHA, message, author, date, and URL
    """
    try:
        logger.info(f"API: Getting commits from {request.repo_owner}/{request.repo_name}:{request.branch_name}")
        
        commits = await github_service.get_branch_commits(
            repo_owner=request.repo_owner,
            repo_name=request.repo_name,
            branch_name=request.branch_name,
            github_token=request.github_token,
            max_commits=request.max_commits
        )
        
        logger.info(f"API: Retrieved {len(commits)} commits")
        return commits
        
    except Exception as e:
        logger.error(f"API: Failed to get commits: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/{repo_owner}/{repo_name}/pr/{pr_number}", response_model=PullRequest)
async def get_pull_request(
    repo_owner: str,
    repo_name: str,
    pr_number: int,
    github_token: str
):
    """
    Get details of a pull request.
    
    Path parameters:
    - repo_owner: Repository owner
    - repo_name: Repository name
    - pr_number: PR number
    
    Query parameters:
    - github_token: GitHub personal access token
    
    Returns:
    - PullRequest object with PR details
    """
    try:
        logger.info(f"API: Getting PR #{pr_number} from {repo_owner}/{repo_name}")
        
        pr = await github_service.get_pull_request(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=pr_number,
            github_token=github_token
        )
        
        return pr
        
    except Exception as e:
        logger.error(f"API: Failed to get PR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/branch-exists")
async def check_branch_exists(request: BranchExistsRequest):
    """
    Check if a branch exists in a repository.
    
    Request body:
    - repo_owner: Repository owner
    - repo_name: Repository name
    - branch_name: Branch name to check
    - github_token: GitHub personal access token
    
    Returns:
    - {"exists": true/false}
    """
    try:
        exists = await github_service.check_branch_exists(
            repo_owner=request.repo_owner,
            repo_name=request.repo_name,
            branch_name=request.branch_name,
            github_token=request.github_token
        )
        
        return {"exists": exists}
        
    except Exception as e:
        logger.error(f"API: Failed to check branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/parse-url", response_model=ParseRepoUrlResponse)
async def parse_repo_url(request: ParseRepoUrlRequest):
    """
    Parse a GitHub repository URL to extract owner and repo name.
    
    Request body:
    - repo_url: GitHub repository URL (various formats supported)
    
    Supported formats:
    - https://github.com/owner/repo
    - https://github.com/owner/repo.git
    - git@github.com:owner/repo.git
    
    Returns:
    - {"owner": "...", "repo_name": "..."}
    """
    try:
        owner, repo_name = github_service.parse_repo_url(request.repo_url)
        return ParseRepoUrlResponse(owner=owner, repo_name=repo_name)
        
    except Exception as e:
        logger.error(f"API: Failed to parse URL: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/github/health")
async def github_health():
    """
    Health check for GitHub service.
    
    Returns:
    - Service status
    """
    return {
        "status": "healthy",
        "service": "github",
        "features": [
            "create_pull_request",
            "get_branch_commits",
            "check_branch_exists",
            "parse_repo_url"
        ]
    }
