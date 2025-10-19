import json
import time
from typing import Dict, Any, List
from app.models.plan_model import (
    ImplementationPlan, PlanRequest, PlanResponse, PlanStep, 
    FileChange, TestPlan, RiskNote, FallbackOption, StepType, 
    FileIntent, RiskLevel
)
from app.services.llm_service import LLMService
import logging

logger = logging.getLogger(__name__)

class PlanSynthesisService:
    """Service for generating implementation plans from CRS"""
    
    def __init__(self):
        self.llm_service = LLMService()
    
    async def generate_plan(self, request: PlanRequest) -> PlanResponse:
        """Generate implementation plan from CRS"""
        start_time = time.time()
        
        try:
            # Create the prompt for plan generation
            prompt = self._create_plan_prompt(request)
            
            # Call the LLM
            response = await self.llm_service._call_openai(prompt)
            
            # Parse the response into plan
            plan = self._parse_plan_response(response)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return PlanResponse(
                plan=plan,
                processing_time_ms=processing_time,
                model_used=self.llm_service.model,
                tokens_used=response.get('usage', {}).get('total_tokens')
            )
            
        except Exception as e:
            logger.error(f"Error generating plan: {str(e)}")
            # Return a fallback plan if LLM fails
            return self._create_fallback_plan(request, str(e))
    
    def _create_plan_prompt(self, request: PlanRequest) -> str:
        """Create a structured prompt for plan generation"""
        
        crs = request.crs
        repo_context = request.repository_context or {}
        scope_prefs = request.scope_preferences or []
        
        prompt = f"""
You are an expert software architect tasked with creating detailed implementation plans from Change Request Specifications (CRS).

Your job is to analyze the CRS and create a comprehensive implementation plan that includes:
1. Sequential, reversible steps
2. File changes with rationale
3. Testing strategy
4. Risk assessment and mitigation
5. Fallback options for scope reduction

CRS Analysis:
Goal: {crs.get('goal', 'N/A')}
Summary: {crs.get('summary', 'N/A')}
Priority: {crs.get('priority', 'medium')}
Scope: {crs.get('scope', 'N/A')}
Complexity: {crs.get('estimated_complexity', 'medium')}
Constraints: {[c['description'] for c in crs.get('constraints', [])]}
Acceptance Criteria: {[c['criterion'] for c in crs.get('acceptance_criteria', [])]}

{f"Repository Context: {repo_context}" if repo_context else ""}
{f"Scope Preferences: {scope_prefs}" if scope_prefs else ""}

Please respond with a JSON object following this exact structure:
{{
    "title": "Implementation Plan: [Brief Title]",
    "summary": "Brief summary of the implementation approach",
    "steps": [
        {{
            "step_number": 1,
            "title": "Step title",
            "description": "Detailed description of what to do",
            "step_type": "analysis|implementation|testing|deployment|validation",
            "estimated_time": "30 minutes",
            "dependencies": [],
            "reversible": true
        }}
    ],
    "files_to_change": [
        {{
            "path": "src/components/SettingsPage.tsx",
            "intent": "modify",
            "rationale": "Add dark mode toggle component",
            "diff_stub": "// Add toggle component here",
            "priority": 1
        }}
    ],
    "testing_plan": [
        {{
            "test_type": "unit",
            "description": "Test toggle functionality",
            "rationale": "Ensure toggle works correctly",
            "files_to_test": ["SettingsPage.tsx"],
            "test_data_needed": "Mock theme context"
        }}
    ],
    "risk_notes": [
        {{
            "risk_description": "Breaking existing theme system",
            "risk_level": "medium",
            "mitigation_strategy": "Test thoroughly with existing themes",
            "blast_radius": "All themed components"
        }}
    ],
    "blast_radius": "isolated|moderate|wide",
    "fallback_options": [
        {{
            "title": "CSS-only dark mode",
            "description": "Implement dark mode using only CSS variables",
            "scope_reduction": "No JavaScript changes needed",
            "benefits": ["Simpler implementation", "Better performance"],
            "trade_offs": ["Less dynamic control", "Limited customization"]
        }}
    ],
    "estimated_total_time": "4 hours",
    "complexity_score": 6,
    "confidence_score": 0.85,
    "scope_refinements": [
        "Consider implementing only for settings page first",
        "Start with CSS-only approach for MVP"
    ]
}}

Guidelines:
- Break down into small, reversible steps
- Each step should be completable in 1-2 hours max
- Include specific file paths and changes
- Consider testing at each step
- Identify risks and mitigation strategies
- Provide fallback options for scope reduction
- Be realistic about time estimates
- Focus on incremental, safe changes
- IMPORTANT: dependencies must be an array of step numbers (integers), not strings
- Example: "dependencies": [1, 2] means this step depends on steps 1 and 2

Respond with ONLY the JSON object, no additional text.
"""
        return prompt
    
    def _parse_plan_response(self, response: Dict[str, Any]) -> ImplementationPlan:
        """Parse LLM response into ImplementationPlan object"""
        try:
            content = response['choices'][0]['message']['content']
            
            # Clean up the response
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Parse JSON
            plan_data = json.loads(content)
            
            # Convert to Pydantic model
            return ImplementationPlan(**plan_data)
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Error parsing plan response: {str(e)}")
            raise ValueError(f"Failed to parse LLM response: {str(e)}")
    
    def _create_fallback_plan(self, request: PlanRequest, error_message: str) -> PlanResponse:
        """Create a fallback plan when LLM fails"""
        crs = request.crs
        
        fallback_plan = ImplementationPlan(
            title=f"Fallback Plan: {crs.get('goal', 'Change Request')}",
            summary=f"Basic implementation plan for: {crs.get('summary', 'Change request')}",
            steps=[
                PlanStep(
                    step_number=1,
                    title="Analyze Requirements",
                    description="Review the change request and understand requirements",
                    step_type=StepType.ANALYSIS,
                    estimated_time="1 hour",
                    dependencies=[],
                    reversible=True
                ),
                PlanStep(
                    step_number=2,
                    title="Implement Changes",
                    description="Make the necessary code changes",
                    step_type=StepType.IMPLEMENTATION,
                    estimated_time="2 hours",
                    dependencies=[1],
                    reversible=True
                ),
                PlanStep(
                    step_number=3,
                    title="Test Implementation",
                    description="Test the changes to ensure they work correctly",
                    step_type=StepType.TESTING,
                    estimated_time="1 hour",
                    dependencies=[2],
                    reversible=True
                )
            ],
            files_to_change=[
                FileChange(
                    path="src/components/",
                    intent=FileIntent.MODIFY,
                    rationale="Implementation files need to be updated",
                    priority=1
                )
            ],
            testing_plan=[
                TestPlan(
                    test_type="manual",
                    description="Manual testing of the changes",
                    rationale="Ensure functionality works as expected",
                    files_to_test=["Modified components"]
                )
            ],
            risk_notes=[
                RiskNote(
                    risk_description="LLM processing failed",
                    risk_level=RiskLevel.MEDIUM,
                    mitigation_strategy="Manual review and testing",
                    blast_radius="Unknown"
                )
            ],
            blast_radius="moderate",
            fallback_options=[],
            estimated_total_time="4 hours",
            complexity_score=5,
            confidence_score=0.3,
            scope_refinements=["Manual implementation required"]
        )
        
        return PlanResponse(
            plan=fallback_plan,
            processing_time_ms=100,
            model_used="fallback",
            tokens_used=0
        )
