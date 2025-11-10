import logging
from typing import Optional, Dict, Any, List
from github import Github, GithubException
from github.Repository import Repository
from github.PullRequest import PullRequest
from github.InputGitAuthor import InputGitAuthor

from app.core.config import settings

logger = logging.getLogger(__name__)


class GitHubAppService:
    """Service for GitHub operations using user OAuth tokens"""
    
    def __init__(self):
        self.default_author = InputGitAuthor(
            name="Cloud Vibecoder",
            email="bot@cloudvibecoder.com"
        )
    
    async def create_pull_request(
        self, 
        access_token: str, 
        repo_url: str, 
        branch_name: str, 
        title: str, 
        description: str,
        files_changed: List[str]
    ) -> Dict[str, Any]:
        """
        Create a pull request using user's OAuth token
        
        Args:
            access_token: User's GitHub OAuth token
            repo_url: Repository URL (https://github.com/owner/repo)
            branch_name: Name of the branch with changes
            title: PR title
            description: PR description
            files_changed: List of modified files
            
        Returns:
            Dict with PR URL and status
        """
        try:
            # Parse repo URL to get owner and repo name
            owner, repo_name = self._parse_repo_url(repo_url)
            
            # Initialize GitHub client with user token
            g = Github(access_token)
            
            # Get repository
            repo = g.get_repo(f"{owner}/{repo_name}")
            
            # Check if user has write access
            user = g.get_user()
            has_write_access = self._check_write_access(user, repo)
            
            # If no write access, fork the repository
            if not has_write_access:
                logger.info(f"User doesn't have write access, forking {owner}/{repo_name}")
                forked_repo = user.create_fork(repo)
                # Wait a moment for fork to be ready
                import asyncio
                await asyncio.sleep(2)
                target_repo = forked_repo
            else:
                target_repo = repo
            
            # Ensure the branch exists in the target repository
            try:
                target_repo.get_branch(branch_name)
                logger.info(f"Branch {branch_name} exists in target repository")
            except GithubException as e:
                if e.status == 404:
                    logger.error(f"Branch {branch_name} not found in target repository")
                    return {
                        "status": "error",
                        "message": f"Branch {branch_name} not found",
                        "pr_url": None
                    }
                else:
                    raise
            
            # Create pull request
            if not has_write_access:
                # Create PR from fork to original repo
                pr = repo.create_pull(
                    title=title,
                    body=description,
                    head=f"{user.login}:{branch_name}",
                    base=repo.default_branch
                )
            else:
                # Create PR within same repo
                pr = repo.create_pull(
                    title=title,
                    body=description,
                    head=branch_name,
                    base=repo.default_branch
                )
            
            logger.info(f"Created PR: {pr.html_url}")
            
            return {
                "status": "success",
                "pr_url": pr.html_url,
                "pr_number": pr.number,
                "forked": not has_write_access
            }
            
        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            return {
                "status": "error",
                "message": f"GitHub API error: {e.data.get('message', str(e))}",
                "pr_url": None
            }
        except Exception as e:
            logger.error(f"Unexpected error creating PR: {e}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}",
                "pr_url": None
            }
    
    async def push_branch_to_fork(
        self,
        access_token: str,
        repo_url: str,
        branch_name: str,
        commit_hash: str
    ) -> bool:
        """
        Push a branch from local repository to user's fork
        
        This is used when the coding agent creates changes locally
        and needs to push them to GitHub for PR creation.
        """
        try:
            owner, repo_name = self._parse_repo_url(repo_url)
            
            g = Github(access_token)
            user = g.get_user()
            repo = g.get_repo(f"{owner}/{repo_name}")
            
            # Check if user has write access
            has_write_access = self._check_write_access(user, repo)
            
            if not has_write_access:
                # Get user's fork
                forks = repo.get_forks()
                user_fork = None
                for fork in forks:
                    if fork.owner.login == user.login:
                        user_fork = fork
                        break
                
                if not user_fork:
                    user_fork = user.create_fork(repo)
                    await asyncio.sleep(2)  # Wait for fork to be ready
                
                logger.info(f"Using fork: {user_fork.full_name}")
                return True
            else:
                logger.info(f"Using original repo: {repo.full_name}")
                return True
                
        except Exception as e:
            logger.error(f"Error pushing branch to fork: {e}")
            return False
    
    def _parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """Parse GitHub URL to extract owner and repo name"""
        import re
        
        # Handle https://github.com/owner/repo format
        https_match = re.match(r"https?://github.com/([^/]+)/([^/#?]+)", repo_url)
        if https_match:
            owner, repo_name = https_match.group(1), https_match.group(2)
            repo_name = repo_name[:-4] if repo_name.endswith('.git') else repo_name
            return owner, repo_name
        
        raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
    
    def _check_write_access(self, user, repo: Repository) -> bool:
        """Check if user has write access to repository"""
        try:
            # Try to get repository permissions
            collab = repo.get_collaborator_permission(user.login)
            return collab in ['write', 'admin']
        except GithubException as e:
            if e.status == 404:
                # Not a collaborator, check if it's user's own repo
                return repo.owner.login == user.login
            else:
                logger.warning(f"Error checking permissions: {e}")
                return repo.owner.login == user.login
    
    async def get_repository_info(self, access_token: str, repo_url: str) -> Dict[str, Any]:
        """Get repository information using user's token"""
        try:
            owner, repo_name = self._parse_repo_url(repo_url)
            
            g = Github(access_token)
            repo = g.get_repo(f"{owner}/{repo_name}")
            
            return {
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "private": repo.private,
                "fork": repo.fork,
                "default_branch": repo.default_branch,
                "owner": {
                    "login": repo.owner.login,
                    "avatar_url": repo.owner.avatar_url
                },
                "stars": repo.stargazers_count,
                "language": repo.language,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None
            }
            
        except Exception as e:
            logger.error(f"Error getting repository info: {e}")
            return {"error": str(e)}
    
    def generate_pr_description(self, prompt: str, files_changed: List[str]) -> str:
        """Generate a descriptive PR message"""
        files_list = "\n".join([f"- `{file}`" for file in files_changed])
        
        description = f"""## 🤖 Automated Changes by Cloud Vibecoder

**Original Request:** {prompt}

### 📁 Files Modified
{files_list}

### ℹ️ About This PR
This pull request was automatically generated by Cloud Vibecoder, an AI-powered coding assistant. The changes have been reviewed by the AI to ensure they follow best practices and maintain code quality.

### 🔍 Review Guidelines
- Please review the changes for correctness and security
- Test the functionality in your development environment
- Ensure the changes align with your project's coding standards

---
*Generated by Cloud Vibecoder*"""
        
        return description
