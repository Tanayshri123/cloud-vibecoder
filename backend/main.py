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
    # Mock logic for Sprint 3 — no real GitHub/LLM integration yet
    return {
        "repo": req.repo,
        "plan": f"Proposed plan for '{req.prompt}' in repo {req.repo}"
    }
