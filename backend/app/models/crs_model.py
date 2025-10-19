from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComponentHint(BaseModel):
    """Hint about which component/module might be affected"""
    component: str = Field(description="Component or module name")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence level (0-1)")
    rationale: str = Field(description="Why this component is relevant")

class AcceptanceCriteria(BaseModel):
    """Specific criteria that must be met for the change to be considered complete"""
    criterion: str = Field(description="Specific acceptance criterion")
    testable: bool = Field(default=True, description="Whether this can be tested")
    priority: Priority = Field(default=Priority.MEDIUM, description="Priority of this criterion")

class Constraint(BaseModel):
    """Constraint or limitation for the change"""
    constraint_type: str = Field(description="Type of constraint (e.g., 'performance', 'security', 'compatibility')")
    description: str = Field(description="Description of the constraint")
    severity: str = Field(description="Severity level (low, medium, high)")

class ClarifyingQuestion(BaseModel):
    """Question to ask the user for missing critical information"""
    question: str = Field(description="The clarifying question")
    context: str = Field(description="Why this information is needed")
    critical: bool = Field(default=True, description="Whether this is critical for proceeding")

class ChangeRequestSpec(BaseModel):
    """Change Request Specification - structured output from LLM"""
    
    # Core goal and summary
    goal: str = Field(description="Clear, concise statement of what needs to be achieved")
    summary: str = Field(description="Brief summary of the change request")
    
    # Constraints and limitations
    constraints: List[Constraint] = Field(default_factory=list, description="List of constraints")
    
    # Acceptance criteria
    acceptance_criteria: List[AcceptanceCriteria] = Field(default_factory=list, description="Specific criteria for completion")
    
    # Priority and scope
    priority: Priority = Field(default=Priority.MEDIUM, description="Overall priority of the change")
    scope: str = Field(description="Scope description (e.g., 'frontend only', 'backend API', 'full-stack')")
    
    # Component hints
    component_hints: List[ComponentHint] = Field(default_factory=list, description="Hints about which components might be affected")
    
    # Clarifying questions
    clarifying_questions: List[ClarifyingQuestion] = Field(default_factory=list, description="Questions for missing critical info")
    
    # Additional context
    estimated_complexity: str = Field(description="Estimated complexity (simple, medium, complex)")
    blast_radius: str = Field(description="Potential impact scope (isolated, moderate, wide)")
    
    # Metadata
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence in the CRS accuracy (0-1)")
    requires_clarification: bool = Field(default=False, description="Whether clarification is needed before proceeding")

class CRSRequest(BaseModel):
    """Input request for CRS generation"""
    user_prompt: str = Field(description="Raw user prompt describing the change")
    repository_url: Optional[str] = Field(default=None, description="GitHub repository URL for context")
    additional_context: Optional[str] = Field(default=None, description="Additional context about the project")

class CRSResponse(BaseModel):
    """Response containing the generated CRS"""
    crs: ChangeRequestSpec
    processing_time_ms: int = Field(description="Time taken to process the request in milliseconds")
    model_used: str = Field(description="LLM model used for generation")
    tokens_used: Optional[int] = Field(default=None, description="Number of tokens consumed")
