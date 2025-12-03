from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.plan_model import PlanRequest, PlanResponse
from app.services.plan_synthesis_service import PlanSynthesisService
from app.services.repo_structure_service import get_repo_structure
import logging

# Import database service for metrics tracking (optional)
try:
    from app.models.database import get_db_service, PlanRecordCreate, SUPABASE_KEY
    DB_AVAILABLE = bool(SUPABASE_KEY)
except ImportError:
    DB_AVAILABLE = False

router = APIRouter()
logger = logging.getLogger(__name__)

class PlanGenerationRequest(BaseModel):
    """Request for plan generation endpoint"""
    crs: dict
    repo_url: str = None
    scope_preferences: list = None
    is_new_repo: bool = False  # True when creating a new repository from scratch
    project_type: str | None = None  # e.g., 'react', 'node', 'python', 'fastapi'
    user_id: Optional[int] = None  # Database user ID for tracking

@router.post("/plan-synthesis", response_model=PlanResponse)
async def generate_implementation_plan(request: PlanGenerationRequest):
    """
    Generate implementation plan from Change Request Specification (CRS)
    
    This endpoint takes a CRS and generates a detailed implementation plan including:
    - Sequential, reversible steps
    - File changes with rationale
    - Testing strategy
    - Risk assessment and mitigation
    - Fallback options for scope reduction
    """
    try:
        # Convert endpoint request to service request
        repo_context = None
        if request.repo_url:
            repo_context = {"url": request.repo_url}
            try:
                structure = await get_repo_structure(request.repo_url)
                repo_context["structure"] = structure
            except Exception as e:
                logger.warning(f"Failed to fetch repo structure: {e}")
        
        # For new repos, create context even without URL
        if request.is_new_repo:
            repo_context = repo_context or {}
            repo_context["is_new_repo"] = True
            if request.project_type:
                repo_context["project_type"] = request.project_type

        plan_request = PlanRequest(
            crs=request.crs,
            repository_context=repo_context,
            scope_preferences=request.scope_preferences
        )
        
        # Generate plan using synthesis service
        synthesis_service = PlanSynthesisService()
        response = await synthesis_service.generate_plan(plan_request)
        
        logger.info(f"Plan generated successfully for CRS: {request.crs.get('goal', 'Unknown')[:50]}...")
        
        # Track plan in database (optional)
        if DB_AVAILABLE:
            try:
                db = get_db_service()
                await db.create_plan_record(PlanRecordCreate(
                    user_id=request.user_id,
                    plan_title=response.plan.title[:255] if response.plan.title else "Untitled Plan",
                    complexity_score=response.plan.complexity_score,
                    confidence_score=response.plan.confidence_score,
                    steps_count=len(response.plan.steps),
                    files_to_change_count=len(response.plan.files_to_change),
                    processing_time_ms=response.processing_time_ms,
                    model_used=response.model_used,
                    tokens_used=response.tokens_used
                ))
                logger.info(f"Plan tracked in database for user_id: {request.user_id}")
            except Exception as e:
                logger.warning(f"Failed to track plan in database: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating plan: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate implementation plan: {str(e)}"
        )

@router.get("/plan-synthesis/health")
async def plan_synthesis_health_check():
    """Health check for plan synthesis service"""
    try:
        synthesis_service = PlanSynthesisService()
        return {
            "status": "healthy",
            "message": "Plan synthesis service is ready",
            "service": "plan-synthesis",
            "model": synthesis_service.llm_service.model
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Plan synthesis service error: {str(e)}",
            "service": "plan-synthesis"
        }
