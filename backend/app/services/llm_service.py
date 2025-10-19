import json
import time
from typing import Optional, Dict, Any
import httpx
from app.models.crs_model import ChangeRequestSpec, CRSRequest, CRSResponse
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    """Service for interacting with Large Language Models"""
    
    def __init__(self):
        self.openai_api_key = getattr(settings, 'openai_api_key', None)
        self.openai_base_url = getattr(settings, 'openai_base_url', 'https://api.openai.com/v1')
        self.model = getattr(settings, 'llm_model', 'gpt-4o-mini')
        
    async def generate_crs(self, request: CRSRequest) -> CRSResponse:
        """Generate Change Request Specification from user prompt"""
        start_time = time.time()
        
        try:
            # Create the prompt for CRS generation
            prompt = self._create_crs_prompt(request)
            
            # Call the LLM
            response = await self._call_openai(prompt)
            
            # Parse the response into CRS
            crs = self._parse_crs_response(response)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return CRSResponse(
                crs=crs,
                processing_time_ms=processing_time,
                model_used=self.model,
                tokens_used=response.get('usage', {}).get('total_tokens')
            )
            
        except Exception as e:
            logger.error(f"Error generating CRS: {str(e)}")
            # Return a fallback CRS if LLM fails
            return self._create_fallback_crs(request, str(e))
    
    def _create_crs_prompt(self, request: CRSRequest) -> str:
        """Create a structured prompt for CRS generation"""
        
        prompt = f"""
You are an expert software engineer tasked with analyzing change requests and creating detailed Change Request Specifications (CRS).

Your job is to analyze the following user request and extract:
1. Clear goal and summary
2. Constraints and limitations
3. Acceptance criteria
4. Priority and scope
5. Component hints
6. Clarifying questions for missing info
7. Complexity and blast radius estimates

User Request: "{request.user_prompt}"

{f"Repository Context: {request.repository_url}" if request.repository_url else ""}
{f"Additional Context: {request.additional_context}" if request.additional_context else ""}

Please respond with a JSON object following this exact structure:
{{
    "goal": "Clear, concise statement of what needs to be achieved",
    "summary": "Brief summary of the change request",
    "constraints": [
        {{
            "constraint_type": "performance|security|compatibility|time|resource",
            "description": "Description of the constraint",
            "severity": "low|medium|high"
        }}
    ],
    "acceptance_criteria": [
        {{
            "criterion": "Specific acceptance criterion",
            "testable": true,
            "priority": "low|medium|high|critical"
        }}
    ],
    "priority": "low|medium|high|critical",
    "scope": "Description of scope (e.g., 'frontend only', 'backend API', 'full-stack')",
    "component_hints": [
        {{
            "component": "Component or module name",
            "confidence": 0.8,
            "rationale": "Why this component is relevant"
        }}
    ],
    "clarifying_questions": [
        {{
            "question": "Question for missing critical info",
            "context": "Why this information is needed",
            "critical": true
        }}
    ],
    "estimated_complexity": "simple|medium|complex",
    "blast_radius": "isolated|moderate|wide",
    "confidence_score": 0.9,
    "requires_clarification": false
}}

Guidelines:
- Be specific and actionable
- Identify potential risks and constraints
- Ask clarifying questions only for critical missing information
- Estimate complexity based on typical software development patterns
- Consider the blast radius (how many systems/components might be affected)
- Provide realistic confidence scores
- Focus on what can be tested and validated

Respond with ONLY the JSON object, no additional text.
"""
        return prompt
    
    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API"""
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert software engineer who creates detailed Change Request Specifications. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.openai_base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
            
            return response.json()
    
    def _parse_crs_response(self, response: Dict[str, Any]) -> ChangeRequestSpec:
        """Parse LLM response into CRS object"""
        try:
            content = response['choices'][0]['message']['content']
            
            # Clean up the response (remove any markdown formatting)
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Parse JSON
            crs_data = json.loads(content)
            
            # Convert to Pydantic model
            return ChangeRequestSpec(**crs_data)
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Error parsing CRS response: {str(e)}")
            raise ValueError(f"Failed to parse LLM response: {str(e)}")
    
    def _create_fallback_crs(self, request: CRSRequest, error_message: str) -> CRSResponse:
        """Create a fallback CRS when LLM fails"""
        fallback_crs = ChangeRequestSpec(
            goal=f"Implement: {request.user_prompt}",
            summary=f"Change request: {request.user_prompt}",
            constraints=[],
            acceptance_criteria=[
                {
                    "criterion": "Change should work as requested",
                    "testable": True,
                    "priority": "medium"
                }
            ],
            priority="medium",
            scope="To be determined",
            component_hints=[],
            clarifying_questions=[
                {
                    "question": "Could you provide more specific details about this change?",
                    "context": "LLM processing failed, need more information",
                    "critical": True
                }
            ],
            estimated_complexity="medium",
            blast_radius="moderate",
            confidence_score=0.3,
            requires_clarification=True
        )
        
        return CRSResponse(
            crs=fallback_crs,
            processing_time_ms=100,
            model_used="fallback",
            tokens_used=0
        )
