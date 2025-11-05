from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.plan_model import PlanRequest, PlanResponse
from app.services.plan_synthesis_service import PlanSynthesisService
from app.services.repo_structure_service import get_repo_structure
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class PlanGenerationRequest(BaseModel):
    """Request for plan generation endpoint"""
    crs: dict
    repo_url: str = None
    scope_preferences: list = None

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

        plan_request = PlanRequest(
            crs=request.crs,
            repository_context=repo_context,
            scope_preferences=request.scope_preferences
        )
        
        # Generate plan using synthesis service
        synthesis_service = PlanSynthesisService()
        response = await synthesis_service.generate_plan(plan_request)
        
        logger.info(f"Plan generated successfully for CRS: {request.crs.get('goal', 'Unknown')[:50]}...")
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
