from github import Github, GithubException
from typing import List, Optional, Dict, Any
import logging
import re
from pydantic import BaseModel, Field
from app.models.repo_model import RepoCreateRequest, RepoCreateResponse

logger = logging.getLogger(__name__)


class GitHubCommit(BaseModel):
    """Represents a GitHub commit"""
    sha: str = Field(description="Commit SHA")
    message: str = Field(description="Commit message")
    author: str = Field(description="Commit author")
    date: str = Field(description="Commit date")
    url: str = Field(description="Commit URL")


class PullRequest(BaseModel):
    """Represents a GitHub Pull Request"""
    number: int = Field(description="PR number")
    title: str = Field(description="PR title")
    body: str = Field(description="PR description")
    url: str = Field(description="PR URL")
    html_url: str = Field(description="PR HTML URL")
    state: str = Field(description="PR state (open, closed)")
    head_branch: str = Field(description="Source branch")
    base_branch: str = Field(description="Target branch")
    created_at: str = Field(description="Creation timestamp")


class PullRequestRequest(BaseModel):
    """Request to create a pull request"""
    repo_owner: str = Field(description="Repository owner")
    repo_name: str = Field(description="Repository name")
    title: str = Field(description="PR title")
    body: str = Field(description="PR description")
    head_branch: str = Field(description="Source branch with changes")
    base_branch: str = Field(default="main", description="Target branch")
    github_token: str = Field(description="GitHub personal access token")


class GitHubService:
    """
    Service for interacting with GitHub API.
    Handles PR creation, branch management, and commit retrieval.
    """
    
    def __init__(self):
        pass
    
    def _get_github_client(self, token: str) -> Github:
        """
        Create authenticated GitHub client.
        
        Args:
            token: GitHub personal access token
            
        Returns:
            Authenticated Github client
        """
        return Github(token)
    
    async def create_pull_request(
        self,
        request: PullRequestRequest
    ) -> PullRequest:
        """
        Create a pull request on GitHub.
        
        Args:
            request: PR creation request with details
            
        Returns:
            PullRequest object with PR details
            
        Raises:
            Exception: If PR creation fails
        """
        try:
            logger.info(f"Creating PR in {request.repo_owner}/{request.repo_name}")
            logger.info(f"  From: {request.head_branch} → To: {request.base_branch}")
            
            # Create GitHub client
            github = self._get_github_client(request.github_token)
            
            # Get repository
            repo = github.get_repo(f"{request.repo_owner}/{request.repo_name}")
            logger.info(f"✅ Repository found: {repo.full_name}")
            
            # Check if branches exist
            try:
                head_ref = repo.get_branch(request.head_branch)
                logger.info(f"✅ Head branch exists: {request.head_branch}")
            except GithubException as e:
                raise Exception(f"Head branch '{request.head_branch}' not found: {str(e)}")
            
            try:
                base_ref = repo.get_branch(request.base_branch)
                logger.info(f"✅ Base branch exists: {request.base_branch}")
            except GithubException as e:
                raise Exception(f"Base branch '{request.base_branch}' not found: {str(e)}")
            
            # Create pull request
            pr = repo.create_pull(
                title=request.title,
                body=request.body,
                head=request.head_branch,
                base=request.base_branch
            )
            
            logger.info(f"✅ Pull request created: #{pr.number}")
            logger.info(f"   URL: {pr.html_url}")
            
            return PullRequest(
                number=pr.number,
                title=pr.title,
                body=pr.body or "",
                url=pr.url,
                html_url=pr.html_url,
                state=pr.state,
                head_branch=pr.head.ref,
                base_branch=pr.base.ref,
                created_at=pr.created_at.isoformat()
            )
            
        except GithubException as e:
            logger.error(f"GitHub API error: {str(e)}")
            raise Exception(f"Failed to create PR: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to create PR: {str(e)}")
            raise
    
    async def get_branch_commits(
        self,
        repo_owner: str,
        repo_name: str,
        branch_name: str,
        github_token: str,
        max_commits: int = 10
    ) -> List[GitHubCommit]:
        """
        Get commits from a branch.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            branch_name: Branch name
            github_token: GitHub token
            max_commits: Maximum number of commits to return
            
        Returns:
            List of commits
        """
        try:
            logger.info(f"Getting commits from {repo_owner}/{repo_name}:{branch_name}")
            
            # Create GitHub client
            github = self._get_github_client(github_token)
            
            # Get repository
            repo = github.get_repo(f"{repo_owner}/{repo_name}")
            
            # Get branch
            branch = repo.get_branch(branch_name)
            
            # Get commits
            commits = repo.get_commits(sha=branch_name)
            
            result = []
            for i, commit in enumerate(commits):
                if i >= max_commits:
                    break
                
                result.append(GitHubCommit(
                    sha=commit.sha,
                    message=commit.commit.message,
                    author=commit.commit.author.name if commit.commit.author else "Unknown",
                    date=commit.commit.author.date.isoformat() if commit.commit.author else "",
                    url=commit.html_url
                ))
            
            logger.info(f"✅ Retrieved {len(result)} commits")
            return result
            
        except GithubException as e:
            logger.error(f"GitHub API error: {str(e)}")
            raise Exception(f"Failed to get commits: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to get commits: {str(e)}")
            raise
    
    async def get_pull_request(
        self,
        repo_owner: str,
        repo_name: str,
        pr_number: int,
        github_token: str
    ) -> PullRequest:
        """
        Get details of a pull request.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            pr_number: PR number
            github_token: GitHub token
            
        Returns:
            PullRequest object
        """
        try:
            logger.info(f"Getting PR #{pr_number} from {repo_owner}/{repo_name}")
            
            # Create GitHub client
            github = self._get_github_client(github_token)
            
            # Get repository
            repo = github.get_repo(f"{repo_owner}/{repo_name}")
            
            # Get PR
            pr = repo.get_pull(pr_number)
            
            return PullRequest(
                number=pr.number,
                title=pr.title,
                body=pr.body or "",
                url=pr.url,
                html_url=pr.html_url,
                state=pr.state,
                head_branch=pr.head.ref,
                base_branch=pr.base.ref,
                created_at=pr.created_at.isoformat()
            )
            
        except GithubException as e:
            logger.error(f"GitHub API error: {str(e)}")
            raise Exception(f"Failed to get PR: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to get PR: {str(e)}")
            raise
    
    async def check_branch_exists(
        self,
        repo_owner: str,
        repo_name: str,
        branch_name: str,
        github_token: str
    ) -> bool:
        """
        Check if a branch exists in a repository.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            branch_name: Branch name
            github_token: GitHub token
            
        Returns:
            True if branch exists, False otherwise
        """
        try:
            github = self._get_github_client(github_token)
            repo = github.get_repo(f"{repo_owner}/{repo_name}")
            repo.get_branch(branch_name)
            return True
        except:
            return False
    
    def parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """
        Parse GitHub repository URL to extract owner and repo name.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Tuple of (owner, repo_name)
            
        Examples:
            https://github.com/owner/repo -> (owner, repo)
            git@github.com:owner/repo.git -> (owner, repo)
        """
        try:
            # Remove common prefixes
            url = repo_url.replace("https://github.com/", "")
            url = url.replace("http://github.com/", "")
            url = url.replace("git@github.com:", "")
            
            # Remove .git suffix
            url = url.replace(".git", "")
            
            # Split by /
            parts = url.strip("/").split("/")
            
            if len(parts) >= 2:
                return parts[0], parts[1]
            else:
                raise ValueError(f"Invalid GitHub URL format: {repo_url}")
                
        except Exception as e:
            raise ValueError(f"Failed to parse GitHub URL: {str(e)}")
    
    def _validate_repo_name(self, name: str) -> tuple[bool, Optional[str]]:
        """
        Validate repository name according to GitHub rules.
        
        Args:
            name: Repository name to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not name:
            return False, "Repository name cannot be empty"
        
        if len(name) > 100:
            return False, "Repository name cannot exceed 100 characters"
        
        # GitHub repo names can only contain alphanumeric, hyphens, underscores, and dots
        # Cannot start with a dot or hyphen
        pattern = r'^[a-zA-Z0-9][a-zA-Z0-9._-]*$'
        if not re.match(pattern, name):
            return False, "Repository name can only contain alphanumeric characters, hyphens, underscores, and dots. Cannot start with a dot or hyphen."
        
        # Reserved names
        reserved = ['..', '.git', '.github']
        if name.lower() in reserved:
            return False, f"'{name}' is a reserved name"
        
        return True, None
    
    async def create_repository(
        self,
        request: RepoCreateRequest
    ) -> RepoCreateResponse:
        """
        Create a new GitHub repository for the authenticated user.
        
        Args:
            request: Repository creation request with name, description, etc.
            
        Returns:
            RepoCreateResponse with repository details or error
        """
        try:
            # Validate repository name
            is_valid, error_msg = self._validate_repo_name(request.name)
            if not is_valid:
                logger.error(f"Invalid repository name: {error_msg}")
                return RepoCreateResponse(
                    success=False,
                    repo_url="",
                    full_name="",
                    html_url="",
                    clone_url="",
                    ssh_url="",
                    default_branch="",
                    owner="",
                    error_message=error_msg
                )
            
            logger.info(f"Creating repository: {request.name}")
            
            # Create GitHub client
            github = self._get_github_client(request.github_token)
            user = github.get_user()
            
            logger.info(f"Authenticated as: {user.login}")
            
            # Build create_repo kwargs
            create_kwargs = {
                "name": request.name,
                "private": request.private,
                "auto_init": request.auto_init,
            }
            
            if request.description:
                create_kwargs["description"] = request.description
            
            if request.gitignore_template:
                create_kwargs["gitignore_template"] = request.gitignore_template
            
            if request.license_template:
                create_kwargs["license_template"] = request.license_template
            
            # Create the repository
            repo = user.create_repo(**create_kwargs)
            
            logger.info(f"✅ Repository created: {repo.full_name}")
            logger.info(f"   URL: {repo.html_url}")
            logger.info(f"   Clone URL: {repo.clone_url}")
            
            return RepoCreateResponse(
                success=True,
                repo_url=repo.html_url,
                full_name=repo.full_name,
                html_url=repo.html_url,
                clone_url=repo.clone_url,
                ssh_url=repo.ssh_url,
                default_branch=repo.default_branch or "main",
                owner=user.login
            )
            
        except GithubException as e:
            # Log full error details for debugging
            logger.error(f"GitHub API error - Status: {e.status}, Data: {e.data if hasattr(e, 'data') else 'N/A'}")
            
            error_message = str(e.data.get('message', 'Unknown GitHub error')) if hasattr(e, 'data') else str(e)
            
            # Check for detailed errors in the response
            if hasattr(e, 'data') and isinstance(e.data, dict):
                errors = e.data.get('errors', [])
                if errors:
                    error_details = [err.get('message', str(err)) for err in errors]
                    error_message = f"{error_message}: {'; '.join(error_details)}"
            
            # Handle specific error cases
            if e.status == 422:
                # Validation failed - usually means repo already exists
                if 'name already exists' in error_message.lower():
                    error_message = f"Repository '{request.name}' already exists for this user"
                elif 'name is too long' in error_message.lower():
                    error_message = "Repository name is too long"
            elif e.status == 401:
                error_message = "Invalid or expired GitHub token"
            elif e.status == 403:
                error_message = "Token does not have permission to create repositories. Ensure 'repo' scope is granted."
            
            logger.error(f"GitHub API error creating repo: {error_message}")
            
            return RepoCreateResponse(
                success=False,
                repo_url="",
                full_name="",
                html_url="",
                clone_url="",
                ssh_url="",
                default_branch="",
                owner="",
                error_message=error_message
            )
            
        except Exception as e:
            logger.error(f"Unexpected error creating repository: {str(e)}")
            return RepoCreateResponse(
                success=False,
                repo_url="",
                full_name="",
                html_url="",
                clone_url="",
                ssh_url="",
                default_branch="",
                owner="",
                error_message=f"Unexpected error: {str(e)}"
            )
    
    async def get_gitignore_templates(self, github_token: str) -> List[str]:
        """
        Get list of available gitignore templates from GitHub.
        
        Args:
            github_token: GitHub personal access token
            
        Returns:
            List of gitignore template names (e.g., ['Python', 'Node', 'Java'])
        """
        try:
            github = self._get_github_client(github_token)
            templates = github.get_gitignore_templates()
            logger.info(f"Retrieved {len(templates)} gitignore templates")
            return list(templates)
        except GithubException as e:
            logger.error(f"Failed to get gitignore templates: {str(e)}")
            raise Exception(f"Failed to get gitignore templates: {str(e)}")
    
    async def get_license_templates(self, github_token: str) -> List[Dict[str, str]]:
        """
        Get list of available license templates from GitHub.
        
        Args:
            github_token: GitHub personal access token
            
        Returns:
            List of license templates with key and name
        """
        try:
            github = self._get_github_client(github_token)
            licenses = github.get_licenses()
            
            result = []
            for lic in licenses:
                result.append({
                    "key": lic.key,
                    "name": lic.name,
                    "spdx_id": lic.spdx_id if hasattr(lic, 'spdx_id') else lic.key.upper()
                })
            
            logger.info(f"Retrieved {len(result)} license templates")
            return result
        except GithubException as e:
            logger.error(f"Failed to get license templates: {str(e)}")
            raise Exception(f"Failed to get license templates: {str(e)}")
    
    async def check_repo_name_available(
        self,
        github_token: str,
        repo_name: str
    ) -> Dict[str, Any]:
        """
        Check if a repository name is available for the authenticated user.
        
        Args:
            github_token: GitHub personal access token
            repo_name: Repository name to check
            
        Returns:
            Dict with 'available' boolean and 'message' string
        """
        try:
            # Validate name format first
            is_valid, error_msg = self._validate_repo_name(repo_name)
            if not is_valid:
                return {
                    "available": False,
                    "message": error_msg,
                    "valid_format": False
                }
            
            github = self._get_github_client(github_token)
            user = github.get_user()
            
            try:
                # Try to get the repo - if it exists, name is not available
                user.get_repo(repo_name)
                return {
                    "available": False,
                    "message": f"Repository '{repo_name}' already exists",
                    "valid_format": True
                }
            except GithubException as e:
                if e.status == 404:
                    # Repo doesn't exist - name is available
                    return {
                        "available": True,
                        "message": f"Repository name '{repo_name}' is available",
                        "valid_format": True
                    }
                raise
                
        except Exception as e:
            logger.error(f"Error checking repo name availability: {str(e)}")
            return {
                "available": False,
                "message": f"Error checking availability: {str(e)}",
                "valid_format": True
            }
