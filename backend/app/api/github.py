from fastapi import APIRouter, HTTPException, Header
from app.services.github_service import (
    GitHubService, PullRequestRequest, PullRequest, GitHubCommit
)
from app.models.repo_model import RepoCreateRequest, RepoCreateResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

# Import database service for metrics tracking (optional)
try:
    from app.models.database import get_db_service, PRRecordCreate, SUPABASE_KEY
    DB_AVAILABLE = bool(SUPABASE_KEY)
except ImportError:
    DB_AVAILABLE = False

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
    user_id: Optional[int] = Field(default=None, description="Database user ID for tracking")
    job_id: Optional[str] = Field(default=None, description="Associated job ID for tracking")


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
        
        # Track PR in database (optional)
        if DB_AVAILABLE:
            try:
                db = get_db_service()
                await db.create_pr_record(PRRecordCreate(
                    user_id=request.user_id,
                    job_id=request.job_id,
                    pr_number=pr.number,
                    repo_owner=request.repo_owner,
                    repo_name=request.repo_name,
                    title=pr.title[:255] if pr.title else "Untitled PR",
                    html_url=pr.html_url,
                    state=pr.state,
                    head_branch=pr.head_branch,
                    base_branch=pr.base_branch
                ))
                logger.info(f"PR tracked in database for user_id: {request.user_id}")
            except Exception as e:
                logger.warning(f"Failed to track PR in database: {e}")
        
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


@router.post("/github/create-repo", response_model=RepoCreateResponse)
async def create_repository(request: RepoCreateRequest):
    """
    Create a new GitHub repository for the authenticated user.
    
    This endpoint creates a new repository under the authenticated user's account.
    The repository can be initialized with a README, gitignore, and license.
    
    Request body:
    - name: Repository name (required, must be unique for user)
    - description: Repository description (optional)
    - private: Whether repo is private (default: false)
    - auto_init: Initialize with README (default: true)
    - gitignore_template: Gitignore template name (optional, e.g., 'Python', 'Node')
    - license_template: License template key (optional, e.g., 'mit', 'apache-2.0')
    - github_token: GitHub access token with repo scope (required)
    
    Returns:
    - RepoCreateResponse with repository URLs and details
    
    Example:
    ```
    {
      "name": "my-new-project",
      "description": "A cool new project",
      "private": false,
      "auto_init": true,
      "gitignore_template": "Python",
      "license_template": "mit",
      "github_token": "ghp_..."
    }
    ```
    """
    try:
        logger.info(f"API: Creating repository '{request.name}'")
        
        result = await github_service.create_repository(request)
        
        if not result.success:
            logger.error(f"API: Failed to create repository: {result.error_message}")
            raise HTTPException(status_code=400, detail=result.error_message)
        
        logger.info(f"API: Repository created successfully: {result.full_name}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API: Unexpected error creating repository: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/templates/gitignore")
async def get_gitignore_templates(github_token: str = Header(..., alias="X-GitHub-Token")):
    """
    Get available gitignore templates from GitHub.
    
    Headers:
    - X-GitHub-Token: GitHub personal access token
    
    Returns:
    - List of gitignore template names (e.g., ['Python', 'Node', 'Java'])
    
    Example response:
    ```
    {
      "templates": ["Python", "Node", "Java", "Go", "Rust", ...]
    }
    ```
    """
    try:
        logger.info("API: Fetching gitignore templates")
        templates = await github_service.get_gitignore_templates(github_token)
        return {"templates": templates}
    except Exception as e:
        logger.error(f"API: Failed to get gitignore templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/templates/licenses")
async def get_license_templates(github_token: str = Header(..., alias="X-GitHub-Token")):
    """
    Get available license templates from GitHub.
    
    Headers:
    - X-GitHub-Token: GitHub personal access token
    
    Returns:
    - List of license templates with key, name, and spdx_id
    
    Example response:
    ```
    {
      "templates": [
        {"key": "mit", "name": "MIT License", "spdx_id": "MIT"},
        {"key": "apache-2.0", "name": "Apache License 2.0", "spdx_id": "Apache-2.0"},
        ...
      ]
    }
    ```
    """
    try:
        logger.info("API: Fetching license templates")
        templates = await github_service.get_license_templates(github_token)
        return {"templates": templates}
    except Exception as e:
        logger.error(f"API: Failed to get license templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/check-repo-name")
async def check_repo_name_available(
    name: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """
    Check if a repository name is available for the authenticated user.
    
    Query parameters:
    - name: Repository name to check
    
    Headers:
    - X-GitHub-Token: GitHub personal access token
    
    Returns:
    - available: Whether the name is available
    - message: Human-readable message
    - valid_format: Whether the name format is valid
    
    Example response:
    ```
    {
      "available": true,
      "message": "Repository name 'my-project' is available",
      "valid_format": true
    }
    ```
    """
    try:
        logger.info(f"API: Checking availability of repo name '{name}'")
        result = await github_service.check_repo_name_available(github_token, name)
        return result
    except Exception as e:
        logger.error(f"API: Failed to check repo name: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
            "parse_repo_url",
            "create_repository",
            "get_gitignore_templates",
            "get_license_templates",
            "check_repo_name_available"
        ]
    }
