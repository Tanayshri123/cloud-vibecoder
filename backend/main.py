from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Schema describing the data we expect from the frontend
class PromptRequest(BaseModel):
    repo: str # github repo url
    prompt: str #the user's NLP promtp

# Endpoint: receives prompt + repo, returns mock plan
@app.post("/api/plan")
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
