from github import Github, GithubException
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel, Field

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
