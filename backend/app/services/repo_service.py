from app.models.repo_model import (
    RepoCloneRequest, RepoSession, GitCommit, 
    GitStatus, RepoPushResult, RepoFile
)
from app.services.vm_service import VMService
from datetime import datetime
from typing import List, Optional
import logging
import re

logger = logging.getLogger(__name__)


class RepositoryService:
    """Service for managing git repositories in VMs"""
    
    def __init__(self, vm_service: VMService):
        self.vm_service = vm_service
    
    def _parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """
        Parse GitHub URL to extract owner and repo name.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Tuple of (owner, repo_name)
        """
        # Handle various GitHub URL formats
        patterns = [
            r'https?://github\.com/([^/]+)/([^/\.]+)',
            r'git@github\.com:([^/]+)/([^/\.]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, repo_url)
            if match:
                owner, repo = match.groups()
                # Remove .git if present
                repo = repo.replace('.git', '')
                return owner, repo
        
        raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
    
    async def clone_repository(
        self, 
        vm_session_id: str, 
        clone_request: RepoCloneRequest
    ) -> RepoSession:
        """
        Clone a GitHub repository in the VM with authentication.
        
        Args:
            vm_session_id: The VM session ID
            clone_request: Repository clone request with URL and token
            
        Returns:
            RepoSession with cloned repository information
            
        Raises:
            Exception: If clone fails
        """
        try:
            owner, repo_name = self._parse_repo_url(clone_request.repo_url)
            logger.info(f"Cloning repository {owner}/{repo_name} in VM {vm_session_id}")
            
            # Create authenticated URL with token
            # Format: https://<token>@github.com/owner/repo.git
            auth_url = f"https://{clone_request.github_token}@github.com/{owner}/{repo_name}.git"
            
            # Clone directory path in VM
            local_path = f"/home/user/{repo_name}"
            
            # Clone the repository
            clone_cmd = f"git clone --branch {clone_request.branch} {auth_url} {local_path}"
            result = await self.vm_service.execute_command(vm_session_id, clone_cmd)
            
            if not result.success:
                # Try with default branch if specified branch doesn't exist
                logger.warning(f"Branch {clone_request.branch} not found, trying without branch specification")
                clone_cmd = f"git clone {auth_url} {local_path}"
                result = await self.vm_service.execute_command(vm_session_id, clone_cmd)
                
                if not result.success:
                    raise Exception(f"Failed to clone repository: {result.error}")
            
            # Get the default branch name
            get_branch_cmd = f"cd {local_path} && git rev-parse --abbrev-ref HEAD"
            branch_result = await self.vm_service.execute_command(vm_session_id, get_branch_cmd)
            current_branch = branch_result.output.strip() if (branch_result.success and branch_result.output) else clone_request.branch
            
            # Get default branch from remote
            default_branch_cmd = f"cd {local_path} && git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'"
            default_result = await self.vm_service.execute_command(vm_session_id, default_branch_cmd)
            default_branch = default_result.output.strip() if (default_result.success and default_result.output) else "main"
            
            session = RepoSession(
                vm_session_id=vm_session_id,
                repo_url=clone_request.repo_url,
                local_path=local_path,
                branch=current_branch,
                default_branch=default_branch
            )
            
            logger.info(f"✅ Repository cloned successfully to {local_path}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to clone repository: {str(e)}")
            raise Exception(f"Repository clone failed: {str(e)}")
    
    async def read_file(
        self, 
        vm_session_id: str, 
        repo_path: str, 
        file_path: str
    ) -> str:
        """
        Read a file from the cloned repository.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            file_path: Relative path to file within repo
            
        Returns:
            File content as string
            
        Raises:
            FileNotFoundError: If file doesn't exist
        """
        try:
            full_path = f"{repo_path}/{file_path}"
            logger.info(f"Reading file: {full_path}")
            
            content = await self.vm_service.read_file(vm_session_id, full_path)
            return content
            
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {str(e)}")
            raise FileNotFoundError(f"Could not read file {file_path}: {str(e)}")
    
    async def write_file(
        self,
        vm_session_id: str,
        repo_path: str,
        file_path: str,
        content: str
    ) -> bool:
        """
        Write content to a file in the repository.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            file_path: Relative path to file within repo
            content: Content to write
            
        Returns:
            True if successful
        """
        try:
            full_path = f"{repo_path}/{file_path}"
            logger.info(f"Writing file: {full_path}")
            
            # Ensure parent directory exists
            parent_dir = "/".join(full_path.split("/")[:-1])
            if parent_dir:
                mkdir_cmd = f"mkdir -p {parent_dir}"
                await self.vm_service.execute_command(vm_session_id, mkdir_cmd)
            
            success = await self.vm_service.write_file(vm_session_id, full_path, content)
            
            if success:
                logger.info(f"✅ File written: {file_path}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {str(e)}")
            return False
    
    async def list_files(
        self,
        vm_session_id: str,
        repo_path: str,
        directory: str = "."
    ) -> List[str]:
        """
        List files in a repository directory.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            directory: Subdirectory to list (relative to repo root)
            
        Returns:
            List of file paths
        """
        try:
            full_path = f"{repo_path}/{directory}" if directory != "." else repo_path
            logger.info(f"Listing directory: {full_path}")
            
            # Use find command to list all files recursively
            list_cmd = f"cd {full_path} && find . -type f -not -path './.git/*' | sed 's|^./||'"
            result = await self.vm_service.execute_command(vm_session_id, list_cmd)
            
            if result.success and result.output:
                files = [f.strip() for f in result.output.split('\n') if f.strip()]
                return files
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []
    
    async def get_git_status(
        self,
        vm_session_id: str,
        repo_path: str
    ) -> GitStatus:
        """
        Get git status of the repository.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            
        Returns:
            GitStatus with repository status
        """
        try:
            logger.info(f"Getting git status for {repo_path}")
            
            # Get current branch
            branch_cmd = f"cd {repo_path} && git rev-parse --abbrev-ref HEAD"
            branch_result = await self.vm_service.execute_command(vm_session_id, branch_cmd)
            branch = branch_result.output.strip() if (branch_result.success and branch_result.output) else "unknown"
            
            # Check if working directory is clean
            status_cmd = f"cd {repo_path} && git status --porcelain"
            status_result = await self.vm_service.execute_command(vm_session_id, status_cmd)
            
            is_dirty = bool(status_result.output and status_result.output.strip())
            
            untracked_files = []
            modified_files = []
            staged_files = []
            
            if status_result.output:
                for line in status_result.output.strip().split('\n'):
                    if not line:
                        continue
                    
                    status_code = line[:2]
                    file_path = line[3:].strip()
                    
                    if status_code.startswith('??'):
                        untracked_files.append(file_path)
                    elif status_code.startswith('M'):
                        staged_files.append(file_path)
                    elif status_code.endswith('M'):
                        modified_files.append(file_path)
                    elif status_code.startswith('A'):
                        staged_files.append(file_path)
            
            return GitStatus(
                branch=branch,
                is_dirty=is_dirty,
                untracked_files=untracked_files,
                modified_files=modified_files,
                staged_files=staged_files
            )
            
        except Exception as e:
            logger.error(f"Failed to get git status: {str(e)}")
            return GitStatus(branch="unknown", is_dirty=False)
    
    async def create_commit(
        self,
        vm_session_id: str,
        repo_path: str,
        message: str,
        files: List[str]
    ) -> GitCommit:
        """
        Create a git commit with specified files.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            message: Commit message
            files: List of file paths to commit
            
        Returns:
            GitCommit with commit information
            
        Raises:
            Exception: If commit fails
        """
        try:
            logger.info(f"Creating commit in {repo_path}: {message}")
            
            # Configure git user if not already set
            config_cmd = f"cd {repo_path} && git config user.email 'vibecoder@example.com' && git config user.name 'Cloud Vibecoder'"
            await self.vm_service.execute_command(vm_session_id, config_cmd)
            
            # Stage files
            for file_path in files:
                add_cmd = f"cd {repo_path} && git add {file_path}"
                result = await self.vm_service.execute_command(vm_session_id, add_cmd)
                if not result.success:
                    logger.warning(f"Failed to stage file {file_path}: {result.error}")
            
            # Create commit
            commit_cmd = f"cd {repo_path} && git commit -m '{message}'"
            result = await self.vm_service.execute_command(vm_session_id, commit_cmd)
            
            if not result.success:
                raise Exception(f"Failed to create commit: {result.error}")
            
            # Get commit SHA
            sha_cmd = f"cd {repo_path} && git rev-parse HEAD"
            sha_result = await self.vm_service.execute_command(vm_session_id, sha_cmd)
            sha = sha_result.output.strip() if (sha_result.success and sha_result.output) else "unknown"
            
            commit = GitCommit(
                message=message,
                files=files,
                sha=sha,
                author="Cloud Vibecoder",
                timestamp=datetime.utcnow()
            )
            
            logger.info(f"✅ Commit created: {sha[:8]}")
            return commit
            
        except Exception as e:
            logger.error(f"Failed to create commit: {str(e)}")
            raise Exception(f"Commit failed: {str(e)}")
    
    async def create_branch(
        self,
        vm_session_id: str,
        repo_path: str,
        branch_name: str,
        from_branch: Optional[str] = None
    ) -> bool:
        """
        Create a new git branch.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            branch_name: Name of new branch
            from_branch: Source branch (defaults to current branch)
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Creating branch {branch_name} in {repo_path}")
            
            if from_branch:
                # Checkout source branch first
                checkout_cmd = f"cd {repo_path} && git checkout {from_branch}"
                await self.vm_service.execute_command(vm_session_id, checkout_cmd)
            
            # Create and checkout new branch
            branch_cmd = f"cd {repo_path} && git checkout -b {branch_name}"
            result = await self.vm_service.execute_command(vm_session_id, branch_cmd)
            
            if result.success:
                logger.info(f"✅ Branch created: {branch_name}")
                return True
            else:
                logger.error(f"Failed to create branch: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to create branch: {str(e)}")
            return False
    
    async def push_branch(
        self,
        vm_session_id: str,
        repo_path: str,
        branch_name: str,
        github_token: str,
        remote: str = "origin"
    ) -> RepoPushResult:
        """
        Push a branch to remote repository.
        
        Args:
            vm_session_id: The VM session ID
            repo_path: Path to repository in VM
            branch_name: Branch to push
            github_token: GitHub authentication token
            remote: Remote name (default: origin)
            
        Returns:
            RepoPushResult with push status
        """
        try:
            logger.info(f"Pushing branch {branch_name} to {remote}")
            
            # Update remote URL with token for authentication
            # Get current remote URL
            get_url_cmd = f"cd {repo_path} && git remote get-url {remote}"
            url_result = await self.vm_service.execute_command(vm_session_id, get_url_cmd)
            
            if url_result.success and url_result.output:
                original_url = url_result.output.strip()
                # Parse and add token
                owner, repo_name = self._parse_repo_url(original_url)
                auth_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
                
                # Set remote URL with authentication
                set_url_cmd = f"cd {repo_path} && git remote set-url {remote} {auth_url}"
                await self.vm_service.execute_command(vm_session_id, set_url_cmd)
            
            # Push branch
            push_cmd = f"cd {repo_path} && git push -u {remote} {branch_name}"
            result = await self.vm_service.execute_command(vm_session_id, push_cmd)
            
            if result.success:
                logger.info(f"✅ Branch pushed successfully: {branch_name}")
                return RepoPushResult(
                    success=True,
                    branch_name=branch_name,
                    remote_url=f"https://github.com/{owner}/{repo_name}"
                )
            else:
                logger.error(f"Push failed: {result.error}")
                return RepoPushResult(
                    success=False,
                    branch_name=branch_name,
                    remote_url="",
                    error_message=result.error
                )
                
        except Exception as e:
            logger.error(f"Failed to push branch: {str(e)}")
            return RepoPushResult(
                success=False,
                branch_name=branch_name,
                remote_url="",
                error_message=str(e)
            )
