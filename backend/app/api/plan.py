from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class PromptRequest(BaseModel):
    repo: str  # GitHub repo URL
    prompt: str  # User's NLP prompt

#we have to replace this with the actual plan generation logic
@router.post("/plan")
async def generate_plan(req: PromptRequest):
    return {
        "repo": req.repo,
        "plan": {
            "title": f"Plan for '{req.prompt}'",
            "summary": "This mock plan outlines how Cloud Vibecoder will implement your request.",
            "steps": [
                f"Inspect repository: {req.repo}",
                f"Locate relevant code areas for '{req.prompt}'",
                "Draft modification steps",
                "Generate diff and propose PR",
            ],
        },
    }
