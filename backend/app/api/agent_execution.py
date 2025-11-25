from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.orchestration_model import (
    Job, JobRequest, JobResult, JobProgress
)
from app.services.orchestration_service import OrchestrationService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Global orchestration service instance
orchestration_service = OrchestrationService()


@router.post("/jobs/create", response_model=Job)
async def create_job(request: JobRequest, background_tasks: BackgroundTasks):
    """
    Create a new coding job and start execution in background.
    
    Request body:
    - repo_url: GitHub repository URL
    - branch: Branch to work on (default: main)
    - github_token: GitHub personal access token
    - implementation_plan: Implementation plan as dict
    - create_new_branch: Create a new branch for changes (default: true)
    - new_branch_name: Name for new branch (optional)
    - push_changes: Push changes to remote (default: true)
    
    Returns:
    - Job object with unique job_id
    """
    try:
        logger.info(f"Creating job for {request.repo_url}")
        
        # Create job
        job = await orchestration_service.create_job(request)
        
        # Execute in background
        background_tasks.add_task(
            orchestration_service.execute_job_async,
            job.job_id
        )
        
        logger.info(f"Job {job.job_id} created and queued for execution")
        
        return job
        
    except Exception as e:
        logger.error(f"Failed to create job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """
    Get job details by ID.
    
    Returns:
    - Complete job information including progress and result
    """
    job = orchestration_service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return job


@router.get("/jobs/{job_id}/progress", response_model=JobProgress)
async def get_job_progress(job_id: str):
    """
    Get job progress by ID.
    
    Returns:
    - Current job progress with status and percentage
    """
    progress = orchestration_service.get_job_progress(job_id)
    
    if not progress:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return progress


@router.get("/jobs/{job_id}/result", response_model=JobResult)
async def get_job_result(job_id: str):
    """
    Get job result by ID.
    
    Returns:
    - Job result if completed, 404 if not found, 425 if still running
    """
    job = orchestration_service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if not job.result:
        raise HTTPException(
            status_code=425,
            detail=f"Job {job_id} is still running (status: {job.progress.status})"
        )
    
    return job.result


@router.get("/jobs", response_model=list[Job])
async def list_jobs():
    """
    List all jobs.
    
    Returns:
    - List of all jobs (in-memory for MVP)
    """
    jobs = orchestration_service.list_jobs()
    return jobs


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """
    Cancel a running job.
    
    Returns:
    - Success message if cancelled
    """
    success = await orchestration_service.cancel_job(job_id)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job {job_id} (not found or already completed)"
        )
    
    return {"message": f"Job {job_id} cancelled successfully"}


@router.post("/execute", response_model=JobResult)
async def execute_sync(request: JobRequest):
    """
    Execute a coding job synchronously (blocks until complete).
    
    ⚠️  WARNING: This endpoint blocks until job completes.
    For production, use POST /jobs/create instead.
    
    This is useful for testing and simple scripts.
    
    Request body: Same as POST /jobs/create
    
    Returns:
    - JobResult with execution details
    """
    try:
        logger.info(f"Executing sync job for {request.repo_url}")
        
        # Create job
        job = await orchestration_service.create_job(request)
        
        # Execute synchronously
        result = await orchestration_service.execute_job(job.job_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Sync execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
    - Service status and job statistics
    """
    jobs = orchestration_service.list_jobs()
    
    pending = sum(1 for j in jobs if j.progress.status.value.startswith("pending"))
    running = sum(1 for j in jobs if j.progress.status.value not in ["completed", "failed", "cancelled", "pending"])
    completed = sum(1 for j in jobs if j.progress.status.value == "completed")
    failed = sum(1 for j in jobs if j.progress.status.value == "failed")
    
    return {
        "status": "healthy",
        "service": "orchestration",
        "jobs": {
            "total": len(jobs),
            "pending": pending,
            "running": running,
            "completed": completed,
            "failed": failed
        }
    }
