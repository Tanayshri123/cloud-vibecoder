from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class StepType(str, Enum):
    ANALYSIS = "analysis"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    VALIDATION = "validation"

class FileIntent(str, Enum):
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"
    REFACTOR = "refactor"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PlanStep(BaseModel):
    """Individual step in the implementation plan"""
    step_number: int = Field(description="Sequential step number")
    title: str = Field(description="Brief title of the step")
    description: str = Field(description="Detailed description of what needs to be done")
    step_type: StepType = Field(description="Type of step")
    estimated_time: str = Field(description="Estimated time to complete (e.g., '30 minutes', '2 hours')")
    dependencies: List[int] = Field(default_factory=list, description="Step numbers this step depends on")
    reversible: bool = Field(default=True, description="Whether this step can be easily undone")

class FileChange(BaseModel):
    """File that needs to be changed"""
    path: str = Field(description="File path relative to repository root")
    intent: FileIntent = Field(description="What needs to be done to this file")
    rationale: str = Field(description="Why this file needs to be changed")
    diff_stub: Optional[str] = Field(default=None, description="Optional code snippet showing the change")
    priority: int = Field(default=1, description="Priority level (1=highest)")

class TestPlan(BaseModel):
    """Testing strategy for the change"""
    test_type: str = Field(description="Type of test (unit, integration, e2e, manual)")
    description: str = Field(description="What needs to be tested")
    rationale: str = Field(description="Why this test is important")
    files_to_test: List[str] = Field(default_factory=list, description="Files that need testing")
    test_data_needed: Optional[str] = Field(default=None, description="Test data or setup required")

class RiskNote(BaseModel):
    """Risk assessment for the change"""
    risk_description: str = Field(description="Description of the risk")
    risk_level: RiskLevel = Field(description="Level of risk")
    mitigation_strategy: str = Field(description="How to mitigate this risk")
    blast_radius: str = Field(description="What systems/components could be affected")

class FallbackOption(BaseModel):
    """Alternative approach if the main plan is too risky"""
    title: str = Field(description="Title of the fallback approach")
    description: str = Field(description="Description of the alternative approach")
    scope_reduction: str = Field(description="How the scope is reduced")
    benefits: List[str] = Field(description="Benefits of this approach")
    trade_offs: List[str] = Field(description="What we lose with this approach")

class ImplementationPlan(BaseModel):
    """Complete implementation plan generated from CRS"""
    
    # Core plan information
    title: str = Field(description="Plan title")
    summary: str = Field(description="Brief summary of the plan")
    
    # Implementation steps
    steps: List[PlanStep] = Field(description="Sequential steps to implement the change")
    
    # File changes
    files_to_change: List[FileChange] = Field(description="Files that need to be modified")
    
    # Testing strategy
    testing_plan: List[TestPlan] = Field(description="Testing approach")
    
    # Risk assessment
    risk_notes: List[RiskNote] = Field(description="Identified risks and mitigation strategies")
    blast_radius: str = Field(description="Overall impact scope")
    
    # Fallback options
    fallback_options: List[FallbackOption] = Field(default_factory=list, description="Alternative approaches")
    
    # Metadata
    estimated_total_time: str = Field(description="Total estimated time for implementation")
    complexity_score: int = Field(ge=1, le=10, description="Complexity score from 1-10")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence in plan accuracy")
    
    # Scope refinement
    scope_refinements: List[str] = Field(default_factory=list, description="Suggested scope reductions")

class PlanRequest(BaseModel):
    """Request for plan generation"""
    crs: Dict[str, Any] = Field(description="Change Request Specification")
    repository_context: Optional[Dict[str, Any]] = Field(default=None, description="Repository information")
    scope_preferences: Optional[List[str]] = Field(default=None, description="User scope preferences")

class PlanResponse(BaseModel):
    """Response containing the generated plan"""
    plan: ImplementationPlan
    processing_time_ms: int = Field(description="Time taken to generate the plan")
    model_used: str = Field(description="LLM model used")
    tokens_used: Optional[int] = Field(default=None, description="Tokens consumed")