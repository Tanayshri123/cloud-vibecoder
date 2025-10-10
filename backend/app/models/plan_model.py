from pydantic import BaseModel
from typing import List

class PlanRequest(BaseModel):
    topic: str

class PlanStep(BaseModel):
    step: int
    detail: str

class PlanResponse(BaseModel):
    title: str
    summary: str
    steps: List[PlanStep]
