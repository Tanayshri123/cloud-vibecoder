from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.crs_model import CRSRequest, CRSResponse, ClarificationAnswer
from app.services.llm_service import LLMService
from app.services.repo_structure_service import get_repo_structure
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class CRSEndpointRequest(BaseModel):
    """Request for CRS generation endpoint"""
    prompt: str
    repo_url: str = None
    context: str = None
    answers: list[ClarificationAnswer] | None = None
    max_questions: int | None = 3

@router.post("/crs", response_model=CRSResponse)
async def generate_crs(request: CRSEndpointRequest):
    """
    Generate Change Request Specification (CRS) from user prompt
    
    This endpoint takes a user's natural language prompt and generates a structured
    Change Request Specification that includes:
    - Clear goal and summary
    - Constraints and limitations  
    - Acceptance criteria
    - Priority and scope
    - Component hints
    - Clarifying questions
    - Complexity and blast radius estimates
    """
    try:
        # Convert endpoint request to service request
        # If repo_url provided, augment context with repository structure (names only)
        additional_context = request.context
        if request.repo_url:
            try:
                structure = await get_repo_structure(request.repo_url)
                prefix = "\n\nRepository Structure (names only):\n"
                additional_context = (additional_context or "") + prefix + structure
            except Exception as e:
                logger.warning(f"Failed to fetch repo structure: {e}")

        crs_request = CRSRequest(
            user_prompt=request.prompt,
            repository_url=request.repo_url,
            additional_context=additional_context,
            clarification_answers=request.answers or [],
            max_questions=request.max_questions or 3
        )
        
        # Generate CRS using LLM service
        llm_service = LLMService()
        response = await llm_service.generate_crs(crs_request)
        
        logger.info(f"CRS generated successfully for prompt: {request.prompt[:50]}...")
        return response
        
    except Exception as e:
        logger.error(f"Error generating CRS: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate CRS: {str(e)}"
        )

@router.get("/crs/health")
async def crs_health_check():
    """Health check for CRS service"""
    try:
        llm_service = LLMService()
        # Check if API key is configured
        if not llm_service.openai_api_key:
            return {
                "status": "warning",
                "message": "OpenAI API key not configured",
                "service": "crs"
            }
        
        return {
            "status": "healthy",
            "message": "CRS service is ready",
            "service": "crs",
            "model": llm_service.model
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"CRS service error: {str(e)}",
            "service": "crs"
        }
