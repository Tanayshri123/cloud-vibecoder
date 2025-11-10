from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime

from app.models.job_model import (
    AgentJob, AgentJobRequest, AgentJobResponse, 
    JobStatusResponse, JobStatus
)
from app.services.coding_agent_service import CodingAgentService
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for jobs (in production, use Redis/Database)
job_store = {}

# Global coding agent service
coding_agent = CodingAgentService()


@router.post("/agent/jobs", response_model=AgentJobResponse)
async def submit_agent_job(request: AgentJobRequest, background_tasks: BackgroundTasks):
    """
    Submit a new coding agent job for execution
    
    This endpoint creates a new job that will be executed asynchronously
    by the coding agent in a Docker container.
    """
    try:
        # Create new job
        job = AgentJob(
            repo_url=request.repo_url,
            prompt=request.prompt,
            plan_id=request.plan_id,
            access_token=request.access_token
        )
        
        # Store job
        job_store[job.id] = job
        
        # Start background execution
        background_tasks.add_task(execute_job_background, job.id)
        
        logger.info(f"Submitted new agent job: {job.id}")
        
        return AgentJobResponse(
            job_id=job.id,
            status=job.status,
            estimated_duration="2-5 minutes"
        )
        
    except Exception as e:
        logger.error(f"Error submitting job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit job: {str(e)}"
        )


@router.get("/agent/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Get the current status of a coding agent job
    
    Returns the job state including progress, results, and any error messages.
    """
    try:
        job = job_store.get(job_id)
        if not job:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )
        
        # Calculate progress percentage based on status
        progress_percentage = None
        eta_seconds = None
        
        if job.status == JobStatus.QUEUED:
            progress_percentage = 0.0
            eta_seconds = 300  # 5 minutes
        elif job.status == JobStatus.RUNNING:
            progress_percentage = 50.0
            eta_seconds = 150  # 2.5 minutes
        elif job.status == JobStatus.COMPLETED:
            progress_percentage = 100.0
            eta_seconds = 0
        elif job.status == JobStatus.FAILED:
            progress_percentage = None
            eta_seconds = None
        
        return JobStatusResponse(
            job=job,
            progress_percentage=progress_percentage,
            eta_seconds=eta_seconds
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.delete("/agent/jobs/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel a running coding agent job
    
    Attempts to stop the execution of the job and mark it as cancelled.
    """
    try:
        job = job_store.get(job_id)
        if not job:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )
        
        if job.status not in [JobStatus.QUEUED, JobStatus.RUNNING]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job in status: {job.status}"
            )
        
        # Cancel the job
        success = await coding_agent.cancel_job(job_id)
        
        if success:
            job.status = JobStatus.CANCELLED
            job.completed_at = job.completed_at or datetime.utcnow()
            logger.info(f"Cancelled job: {job_id}")
            return {"message": f"Job {job_id} cancelled successfully"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to cancel job"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel job: {str(e)}"
        )


@router.get("/agent/jobs")
async def list_jobs(limit: int = 50, status: Optional[JobStatus] = None):
    """
    List recent coding agent jobs
    
    Returns a paginated list of jobs with optional status filtering.
    """
    try:
        jobs = list(job_store.values())
        
        # Filter by status if provided
        if status:
            jobs = [job for job in jobs if job.status == status]
        
        # Sort by creation time (newest first)
        jobs.sort(key=lambda x: x.created_at, reverse=True)
        
        # Limit results
        jobs = jobs[:limit]
        
        return {"jobs": jobs, "total": len(jobs)}
        
    except Exception as e:
        logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list jobs: {str(e)}"
        )


async def execute_job_background(job_id: str):
    """
    Background task to execute a coding agent job
    """
    logger.info(f"Starting background execution for job: {job_id}")
    
    try:
        job = job_store.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found for execution")
            return
        
        logger.info(f"Found job {job_id}, updating status to RUNNING")
        # Update job status
        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        job.progress = "Starting coding agent execution..."
        
        logger.info(f"Executing coding agent for job {job_id}")
        # Execute the job
        result = await coding_agent.execute_job(job, job.access_token)
        
        logger.info(f"Job {job_id} execution completed with result: {result.status}")
        # Update job with results
        job.result = result
        job.status = JobStatus.COMPLETED if result.status != "error" else JobStatus.FAILED
        job.completed_at = datetime.utcnow()
        job.progress = "Execution completed"
        
        if result.error_message:
            job.error_message = result.error_message
        
        logger.info(f"Job {job_id} final status: {job.status}")
        
    except Exception as e:
        logger.error(f"Background execution failed for job {job_id}: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception details: {repr(e)}")
        
        # Update job with error
        job = job_store.get(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.error_message = str(e)
            job.progress = "Execution failed"
            logger.info(f"Updated job {job_id} with error status")
        else:
            logger.error(f"Could not find job {job_id} to update with error")
