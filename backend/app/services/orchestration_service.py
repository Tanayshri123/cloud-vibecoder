from app.models.orchestration_model import (
    Job, JobRequest, JobResult, JobProgress, JobStatus
)
from app.models.plan_model import ImplementationPlan
from app.models.repo_model import RepoCloneRequest, RepoCreateRequest
from app.services.vm_service import VMService
from app.services.repo_service import RepositoryService
from app.services.llm_service import LLMService
from app.services.github_service import GitHubService
from app.services.coding_agent_main import CodingAgent
from app.services.agent_tools import AgentTools
from datetime import datetime
from typing import Dict, Optional
import logging
import uuid
import asyncio

# Import database service for metrics tracking (optional)
try:
    from app.models.database import get_db_service, JobRecordCreate, SUPABASE_KEY
    DB_AVAILABLE = bool(SUPABASE_KEY)
except ImportError:
    DB_AVAILABLE = False

logger = logging.getLogger(__name__)


class OrchestrationService:
    """
    Orchestrates the complete coding workflow:
    1. Create VM session
    2. Clone repository
    3. Execute coding agent
    4. Push changes
    5. Cleanup
    """
    
    def __init__(self):
        self.vm_service = VMService()
        self.repo_service = RepositoryService(self.vm_service)
        self.llm_service = LLMService()
        self.github_service = GitHubService()
        
        # In-memory job storage (replace with Redis/DB in production)
        self.jobs: Dict[str, Job] = {}
    
    async def create_job(self, request: JobRequest) -> Job:
        """
        Create a new coding job.
        
        Args:
            request: Job request with repo URL, branch, plan, etc.
            
        Returns:
            Job object with unique ID
        """
        job_id = str(uuid.uuid4())
        
        job = Job(
            job_id=job_id,
            request=request,
            progress=JobProgress(
                status=JobStatus.PENDING,
                progress_percentage=0,
                message="Job created, waiting to start"
            )
        )
        
        self.jobs[job_id] = job
        
        # Log appropriate message based on mode
        if request.create_new_repo:
            logger.info(f"📋 Created job {job_id} for new repo: {request.new_repo_config.name}")
        else:
            logger.info(f"📋 Created job {job_id} for {request.repo_url}")
        
        # Track job in database (optional)
        if DB_AVAILABLE:
            try:
                db = get_db_service()
                await db.create_job_record(JobRecordCreate(
                    job_id=job_id,
                    user_id=request.user_id,
                    repo_url=request.repo_url,
                    branch=request.branch,
                    created_new_repo=request.create_new_repo,
                    status="pending"
                ))
                logger.info(f"Job tracked in database for user_id: {request.user_id}")
            except Exception as e:
                logger.warning(f"Failed to track job in database: {e}")
        
        return job
    
    async def execute_job(self, job_id: str) -> JobResult:
        """
        Execute a coding job with full workflow.
        
        Args:
            job_id: ID of the job to execute
            
        Returns:
            JobResult with execution details
        """
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")
        
        job = self.jobs[job_id]
        request = job.request
        
        logger.info(f"🚀 Starting job execution: {job_id}")
        start_time = datetime.utcnow()
        
        vm_session_id = None
        repo_path = None
        repo_url = request.repo_url
        branch_name = request.branch
        created_new_repo = False
        
        try:
            # Stage 1: Initialize VM
            await self._update_progress(
                job_id,
                JobStatus.INITIALIZING_VM,
                10,
                "Creating VM session..."
            )
            
            vm_session = await self.vm_service.create_session()
            vm_session_id = vm_session.session_id
            logger.info(f"✅ VM session created: {vm_session_id}")
            
            # Stage 2: Create new repository if requested
            if request.create_new_repo:
                await self._update_progress(
                    job_id,
                    JobStatus.CREATING_REPO,
                    15,
                    f"Creating repository: {request.new_repo_config.name}..."
                )
                
                # Build create request
                create_request = RepoCreateRequest(
                    name=request.new_repo_config.name,
                    description=request.new_repo_config.description,
                    private=request.new_repo_config.private,
                    auto_init=True,  # Always init with README for new repos
                    gitignore_template=request.new_repo_config.gitignore_template,
                    license_template=request.new_repo_config.license_template,
                    github_token=request.github_token
                )
                
                create_result = await self.github_service.create_repository(create_request)
                
                if not create_result.success:
                    raise Exception(f"Failed to create repository: {create_result.error_message}")
                
                repo_url = create_result.html_url
                branch_name = create_result.default_branch
                created_new_repo = True
                
                logger.info(f"✅ Repository created: {create_result.full_name}")
                logger.info(f"   URL: {repo_url}")
                logger.info(f"   Default branch: {branch_name}")
            
            # Stage 3: Clone Repository
            await self._update_progress(
                job_id,
                JobStatus.CLONING_REPO,
                25,
                f"Cloning repository {repo_url}..."
            )
            
            clone_request = RepoCloneRequest(
                repo_url=repo_url,
                branch=branch_name,
                github_token=request.github_token
            )
            
            repo_session = await self.repo_service.clone_repository(
                vm_session_id,
                clone_request
            )
            repo_path = repo_session.local_path
            logger.info(f"✅ Repository cloned to: {repo_path}")
            
            # Create new branch if requested (skip for newly created repos - work on default branch)
            if request.create_new_branch and not created_new_repo:
                new_branch = request.new_branch_name or f"vibecoder-{job_id[:8]}"
                await self.repo_service.create_branch(
                    vm_session_id,
                    repo_path,
                    new_branch
                )
                branch_name = new_branch
                logger.info(f"✅ Created new branch: {branch_name}")
            elif created_new_repo:
                logger.info(f"ℹ️  Working on default branch '{branch_name}' for new repository")
            
            # Stage 3: Execute Coding Agent
            await self._update_progress(
                job_id,
                JobStatus.EXECUTING_AGENT,
                40,
                "Executing coding agent with LLM..."
            )
            
            # Parse implementation plan
            plan = ImplementationPlan(**request.implementation_plan)
            
            # Initialize agent tools
            tools = AgentTools(
                repo_service=self.repo_service,
                vm_service=self.vm_service,
                vm_session_id=vm_session_id,
                repo_path=repo_path
            )
            
            # Initialize and execute agent
            agent = CodingAgent(
                plan=plan,
                tools=tools,
                llm_service=self.llm_service,
                repo_service=self.repo_service,
                vm_session_id=vm_session_id,
                repo_path=repo_path
            )
            
            agent_result = await agent.execute_plan()
            logger.info(f"✅ Agent execution completed")
            logger.info(f"   Files changed: {agent_result.total_files_changed}")
            logger.info(f"   Commits: {len(agent_result.commits_created)}")
            logger.info(f"   Tokens: {agent_result.total_tokens_used}")
            
            if not agent_result.success:
                raise Exception(f"Agent execution failed: {agent_result.error_message}")
            
            # Stage 4: Push Changes
            pushed = False
            if request.push_changes and agent_result.commits_created:
                await self._update_progress(
                    job_id,
                    JobStatus.PUSHING_CHANGES,
                    80,
                    f"Pushing changes to {branch_name}..."
                )
                
                try:
                    push_result = await self.repo_service.push_branch(
                        vm_session_id,
                        repo_path,
                        branch_name,
                        request.github_token
                    )
                    pushed = push_result.success
                    logger.info(f"✅ Changes pushed to {branch_name}")
                except Exception as e:
                    logger.warning(f"⚠️  Push failed: {str(e)}")
                    # Don't fail the job if push fails
            
            # Stage 5: Complete
            await self._update_progress(
                job_id,
                JobStatus.COMPLETED,
                100,
                "Job completed successfully!"
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            result = JobResult(
                job_id=job_id,
                status=JobStatus.COMPLETED,
                success=True,
                vm_session_id=vm_session_id,
                repo_url=repo_url,
                repo_path=repo_path,
                branch_name=branch_name,
                created_new_repo=created_new_repo,
                files_changed=agent_result.total_files_changed,
                commits_created=len(agent_result.commits_created),
                total_edits=agent_result.total_edits,
                tokens_used=agent_result.total_tokens_used,
                execution_time_seconds=execution_time,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                commit_shas=agent_result.commits_created,
                pushed=pushed
            )
            
            job.result = result
            
            # Update job in database (optional)
            if DB_AVAILABLE:
                try:
                    db = get_db_service()
                    await db.update_job_record(job_id, {
                        "status": "completed",
                        "files_changed": agent_result.total_files_changed,
                        "commits_created": len(agent_result.commits_created),
                        "total_edits": agent_result.total_edits,
                        "tokens_used": agent_result.total_tokens_used,
                        "execution_time_seconds": execution_time,
                        "started_at": start_time,
                        "completed_at": datetime.utcnow()
                    })
                except Exception as db_e:
                    logger.warning(f"Failed to update job in database: {db_e}")
            
            logger.info(f"🎉 Job {job_id} completed successfully!")
            logger.info(f"   Execution time: {execution_time:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Job {job_id} failed: {str(e)}")
            
            # Determine error stage
            error_stage = "unknown"
            current_status = job.progress.status
            if current_status == JobStatus.INITIALIZING_VM:
                error_stage = "vm_initialization"
            elif current_status == JobStatus.CREATING_REPO:
                error_stage = "repository_creation"
            elif current_status == JobStatus.CLONING_REPO:
                error_stage = "repository_cloning"
            elif current_status == JobStatus.EXECUTING_AGENT:
                error_stage = "agent_execution"
            elif current_status == JobStatus.PUSHING_CHANGES:
                error_stage = "pushing_changes"
            
            await self._update_progress(
                job_id,
                JobStatus.FAILED,
                0,
                f"Job failed: {str(e)}"
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            result = JobResult(
                job_id=job_id,
                status=JobStatus.FAILED,
                success=False,
                vm_session_id=vm_session_id,
                repo_url=repo_url,
                repo_path=repo_path,
                branch_name=branch_name,
                created_new_repo=created_new_repo,
                error_message=str(e),
                error_stage=error_stage,
                execution_time_seconds=execution_time,
                started_at=start_time,
                completed_at=datetime.utcnow()
            )
            
            job.result = result
            
            # Update job in database (optional)
            if DB_AVAILABLE:
                try:
                    db = get_db_service()
                    await db.update_job_record(job_id, {
                        "status": "failed",
                        "error_message": str(e),
                        "error_stage": error_stage,
                        "execution_time_seconds": execution_time,
                        "started_at": start_time,
                        "completed_at": datetime.utcnow()
                    })
                except Exception as db_e:
                    logger.warning(f"Failed to update job in database: {db_e}")
            
            return result
            
        finally:
            # Cleanup VM session
            if vm_session_id:
                try:
                    logger.info(f"🧹 Cleaning up VM session {vm_session_id}")
                    await self.vm_service.destroy_session(vm_session_id)
                except Exception as e:
                    logger.error(f"Failed to cleanup VM: {str(e)}")
    
    async def execute_job_async(self, job_id: str):
        """
        Execute a job asynchronously in the background.
        
        Args:
            job_id: ID of the job to execute
        """
        try:
            await self.execute_job(job_id)
        except Exception as e:
            logger.error(f"Background job {job_id} failed: {str(e)}")
    
    async def _update_progress(
        self,
        job_id: str,
        status: JobStatus,
        progress: int,
        message: str
    ):
        """Update job progress"""
        if job_id in self.jobs:
            self.jobs[job_id].progress = JobProgress(
                status=status,
                progress_percentage=progress,
                current_step=status.value,
                message=message
            )
            logger.info(f"📊 Job {job_id}: {message} ({progress}%)")
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        return self.jobs.get(job_id)
    
    def get_job_progress(self, job_id: str) -> Optional[JobProgress]:
        """Get job progress"""
        job = self.jobs.get(job_id)
        return job.progress if job else None
    
    def get_job_result(self, job_id: str) -> Optional[JobResult]:
        """Get job result"""
        job = self.jobs.get(job_id)
        return job.result if job else None
    
    def list_jobs(self) -> list[Job]:
        """List all jobs"""
        return list(self.jobs.values())
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.
        
        Args:
            job_id: ID of the job to cancel
            
        Returns:
            True if cancelled, False if not found or already completed
        """
        if job_id not in self.jobs:
            return False
        
        job = self.jobs[job_id]
        
        # Only cancel if job is still running
        if job.progress.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            return False
        
        await self._update_progress(
            job_id,
            JobStatus.CANCELLED,
            0,
            "Job cancelled by user"
        )
        
        logger.info(f"🛑 Job {job_id} cancelled")
        return True
