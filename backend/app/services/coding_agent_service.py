import json
import os
import tempfile
import uuid
from typing import Optional, Dict, Any
import docker
from docker.models.containers import Container
import logging
import asyncio

from app.models.job_model import AgentJob, AgentResult, JobStatus
from app.core.config import settings
from app.services.github_app_service import GitHubAppService

logger = logging.getLogger(__name__)


class CodingAgentService:
    """Service for executing coding agent jobs using Docker containers"""
    
    def __init__(self):
        self.docker_client = docker.from_env()
        self.image_name = "cloud-vibecoder/coding-agent"
        self.github_service = GitHubAppService()
        
    async def execute_job(self, job: AgentJob, access_token: Optional[str] = None) -> AgentResult:
        """Execute a coding agent job in a Docker container"""
        logger.info(f"Starting coding agent execution for job {job.id}")
        
        try:
            # Prepare execution environment
            with tempfile.TemporaryDirectory() as temp_dir:
                # Create prompt file
                prompt_file = os.path.join(temp_dir, "prompt.txt")
                with open(prompt_file, 'w') as f:
                    f.write(self._create_agent_prompt(job))
                
                # Create shared volume for results
                shared_dir = os.path.join(temp_dir, "shared")
                os.makedirs(shared_dir, exist_ok=True)
                
                # Build and run container
                container = await self._run_container(job, prompt_file, shared_dir)
                
                # Parse results
                result = await self._parse_results(shared_dir, container)
                
                # Create pull request if we have access token and changes were made
                if access_token and result.status == "success" and result.files_modified:
                    pr_result = await self._create_pull_request(job, result, access_token)
                    result.pr_url = pr_result.get("pr_url")
                    result.pr_number = pr_result.get("pr_number")
                    result.forked = pr_result.get("forked", False)
                
                return result
                
        except Exception as e:
            logger.error(f"Error executing job {job.id}: {str(e)}")
            return AgentResult(
                status="error",
                branch_name="",
                files_modified=[],
                execution_logs=[f"Execution failed: {str(e)}"],
                error_message=str(e)
            )
    
    def _create_agent_prompt(self, job: AgentJob) -> str:
        """Create a detailed prompt for the coding agent"""
        prompt = f"""You are Cloud Vibecoder, an expert coding agent. Your task is to implement the following change request:

Repository: {job.repo_url}
Change Request: {job.prompt}

Please follow these guidelines:
1. Analyze the repository structure and understand the codebase
2. Make minimal, focused changes that address the request
3. Follow existing code style and patterns
4. Add appropriate error handling and validation
5. Ensure your changes don't break existing functionality
6. Write clean, maintainable code

Steps to follow:
1. Read and understand the existing codebase
2. Identify the files that need to be modified
3. Implement the changes step by step
4. Test your changes mentally to ensure they work
5. Commit the changes with a descriptive commit message

Focus on quality and maintainability. If the request is unclear, make reasonable assumptions and proceed with the best implementation.

Repository context: This is a real codebase that will be used in production. Please be careful and thoughtful with your changes."""
        
        return prompt
    
    async def _run_container(self, job: AgentJob, prompt_file: str, shared_dir: str) -> Container:
        """Run the coding agent container"""
        try:
            # Build the image (in production, this would be pre-built)
            logger.info(f"Building coding agent image for job {job.id}")
            self.docker_client.images.build(
                path="docker/coding-agent",
                tag=self.image_name,
                rm=True
            )
        except docker.errors.BuildError as e:
            logger.error(f"Failed to build Docker image: {e}")
            raise
        
        # Prepare environment variables
        environment = {
            "OPENAI_API_KEY": settings.openai_api_key,
            "REPO_URL": job.repo_url,
            "PROMPT_FILE": "/workspace/prompt.txt",
            "AIDER_MODEL": getattr(settings, 'aider_model', 'gpt-4o-mini')
        }
        
        # Run container
        logger.info(f"Starting container for job {job.id}")
        container = self.docker_client.containers.run(
                self.image_name,
                environment=environment,
                volumes={
                    prompt_file: {"bind": "/workspace/prompt.txt", "mode": "ro"},
                    shared_dir: {"bind": "/shared", "mode": "rw"}
                },
                detach=True,
                remove=False,  # Don't auto-remove, we'll handle cleanup manually
                mem_limit="2g",
                cpu_quota=50000  # Limit to 50% of CPU
            )
        
        # Check initial logs to see if container started properly
        try:
            initial_logs = container.logs().decode('utf-8')
            logger.info(f"Initial container logs for job {job.id}: {initial_logs[:500]}...")
        except Exception as e:
            logger.warning(f"Could not get initial logs for job {job.id}: {e}")      
        # Wait for completion
        try:
            result = container.wait(timeout=300)
            exit_code = result["StatusCode"]
            
            if exit_code != 0:
                logs = container.logs().decode('utf-8')
                logger.error(f"Container failed for job {job.id}: {logs}")
                raise Exception(f"Container exited with code {exit_code}")
                
        except Exception as e:
            container.stop()
            container.remove()
            raise
        
        return container
    
    async def _parse_results(self, shared_dir: str, container: Container) -> AgentResult:
        """Parse execution results from container"""
        result_file = os.path.join(shared_dir, "result.json")
        
        if not os.path.exists(result_file):
            # Get container logs for debugging
            logs = container.logs().decode('utf-8')
            logger.error(f"No result file found. Container logs: {logs}")
            
            return AgentResult(
                status="error",
                branch_name="",
                files_modified=[],
                execution_logs=["No result file generated", f"Container logs: {logs}"],
                error_message="Coding agent failed to generate results"
            )
        
        try:
            with open(result_file, 'r') as f:
                result_data = json.load(f)
            
            # Convert to AgentResult
            result = AgentResult(
                status=result_data.get("status", "unknown"),
                branch_name=result_data.get("branch", ""),
                files_modified=result_data.get("files_modified", []),
                commit_hash=result_data.get("commit_hash"),
                diff=result_data.get("diff"),
                execution_logs=[f"Execution completed with status: {result_data.get('status')}"]
            )
            
            logger.info(f"Successfully parsed results for job: {result.status}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse results: {str(e)}")
            return AgentResult(
                status="error",
                branch_name="",
                files_modified=[],
                execution_logs=[f"Failed to parse results: {str(e)}"],
                error_message="Failed to parse execution results"
            )
    
    async def _create_pull_request(self, job: AgentJob, result: AgentResult, access_token: str) -> Dict[str, Any]:
        """Create a pull request for the coding agent changes"""
        try:
            # Generate PR title and description
            title = f"🤖 Automated: {job.prompt[:50]}{'...' if len(job.prompt) > 50 else ''}"
            description = self.github_service.generate_pr_description(job.prompt, result.files_modified)
            
            # Create PR using GitHub service
            pr_result = await self.github_service.create_pull_request(
                access_token=access_token,
                repo_url=job.repo_url,
                branch_name=result.branch_name,
                title=title,
                description=description,
                files_changed=result.files_modified
            )
            
            logger.info(f"PR creation result: {pr_result}")
            return pr_result
            
        except Exception as e:
            logger.error(f"Error creating pull request: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to create PR: {str(e)}",
                "pr_url": None
            }
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job"""
        try:
            # Find and stop containers for this job
            containers = self.docker_client.containers.list(
                filters={"label": f"job_id={job_id}"}
            )
            
            for container in containers:
                container.stop()
                container.remove()
            
            logger.info(f"Cancelled job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {str(e)}")
            return False
