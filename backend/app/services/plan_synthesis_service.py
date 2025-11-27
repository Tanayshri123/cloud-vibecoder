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
        
        # Check if this is a new repository (empty or scaffolding needed)
        is_new_repo = repo_context.get('is_new_repo', False)
        project_type = repo_context.get('project_type')  # e.g., 'react', 'fastapi', 'node'

        # Use different prompts for new vs existing repos
        if is_new_repo:
            return self._create_new_repo_plan_prompt(crs, repo_context, scope_prefs, project_type)
        else:
            return self._create_existing_repo_plan_prompt(crs, repo_context, scope_prefs)
    
    def _create_new_repo_plan_prompt(self, crs: dict, repo_context: dict, scope_prefs: list, project_type: str = None) -> str:
        """Create plan prompt for building a NEW repository from scratch"""
        
        project_type_hint = f"Project Type: {project_type}" if project_type else ""
        
        prompt = f"""
You are an expert software developer. Create an implementation plan for a NEW project.

CRITICAL: Focus on implementing the USER'S ACTUAL REQUEST, not on scaffolding or boilerplate.
- The user wants working code that does what they asked for
- Only include minimal necessary files - don't over-engineer
- For simple requests (algorithms, utilities, scripts), just create the main file(s) needed
- Skip package managers, build tools, etc. unless the user specifically asked for them

User's Goal: {crs.get('goal', 'N/A')}
Summary: {crs.get('summary', 'N/A')}
Scope: {crs.get('scope', 'N/A')}
Acceptance Criteria: {[c['criterion'] for c in crs.get('acceptance_criteria', [])]}

{project_type_hint}

Respond with a JSON object:
{{
    "title": "Build: [Brief description]",
    "summary": "What will be built",
    "steps": [
        {{
            "step_number": 1,
            "title": "Step title",
            "description": "What to do",
            "step_type": "implementation",
            "estimated_time": "15 minutes",
            "dependencies": [],
            "reversible": true
        }}
    ],
    "files_to_change": [
        {{
            "path": "main.py",
            "intent": "create",
            "rationale": "Main implementation file",
            "diff_stub": "# Implementation here",
            "priority": 1
        }}
    ],
    "testing_plan": [
        {{
            "test_type": "manual",
            "description": "Test the implementation",
            "rationale": "Verify it works",
            "files_to_test": ["main.py"],
            "test_data_needed": "Sample input"
        }}
    ],
    "risk_notes": [],
    "blast_radius": "isolated",
    "fallback_options": [],
    "estimated_total_time": "30 minutes",
    "complexity_score": 3,
    "confidence_score": 0.9,
    "scope_refinements": []
}}

GUIDELINES:
- PRIORITIZE the user's actual request over boilerplate
- For simple tasks: just create the main file with the implementation
- Only add README.md if helpful, skip if trivial
- Only add package.json/requirements.txt if external dependencies are truly needed
- ALL files must have intent: "create"
- Keep it minimal and focused on what the user asked for

Respond with ONLY the JSON object, no additional text.
"""
        return prompt
    
    def _create_existing_repo_plan_prompt(self, crs: dict, repo_context: dict, scope_prefs: list) -> str:
        """Create plan prompt for modifying an EXISTING repository"""
        
        # Build repository context text without code content
        repo_context_lines = []
        if repo_context:
            url = repo_context.get('url')
            structure = repo_context.get('structure')
            if url:
                repo_context_lines.append(f"Repository URL: {url}")
            if structure:
                repo_context_lines.append("Repository Structure (names only):\n" + structure)
        repo_context_text = "\n".join(repo_context_lines)

        prompt = f"""
You are an expert software architect tasked with creating detailed implementation plans for MODIFYING EXISTING codebases.

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

{repo_context_text}
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
    
    def _get_scaffolding_guidelines(self, is_new_repo: bool, project_type: str = None) -> str:
        """Get additional guidelines for scaffolding new repositories."""
        if not is_new_repo:
            return ""
        
        guidelines = """
NEW REPOSITORY SCAFFOLDING GUIDELINES:
Since this is a new repository, your plan should include:
1. FIRST STEP: Project scaffolding - create the basic project structure
2. Include all necessary configuration files (package.json, requirements.txt, etc.)
3. Set up the entry point file(s)
4. Create a proper README.md with setup instructions
5. Add appropriate .gitignore if not already present
"""
        
        # Add project-type specific guidelines
        if project_type:
            type_guidelines = {
                "react": """
For React projects, include:
- package.json with react, react-dom, react-scripts
- public/index.html
- src/index.js, src/App.js, src/App.css
- Basic component structure
""",
                "node": """
For Node.js projects, include:
- package.json with express and basic dependencies
- src/index.js as entry point
- Basic route structure
- .env.example for environment variables
""",
                "python": """
For Python projects, include:
- requirements.txt with dependencies
- src/__init__.py and src/main.py
- setup.py or pyproject.toml
- Basic module structure
""",
                "fastapi": """
For FastAPI projects, include:
- requirements.txt with fastapi, uvicorn, pydantic
- app/__init__.py and app/main.py
- app/models.py for Pydantic models
- run.py for development server
- CORS middleware setup
""",
                "nextjs": """
For Next.js projects, include:
- package.json with next, react, react-dom
- app/page.js and app/layout.js (App Router)
- next.config.js
- Basic page structure
""",
                "express-api": """
For Express API projects, include:
- package.json with express, cors, helmet, morgan
- src/index.js with middleware setup
- src/routes/index.js for route definitions
- .env.example for configuration
- Error handling middleware
"""
            }
            guidelines += type_guidelines.get(project_type, "")
        
        return guidelines
    
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
