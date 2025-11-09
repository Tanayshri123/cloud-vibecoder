from fastapi import FastAPI, Request
from app.services.llm_service import LLMService
from app.models.crs_model import CRSRequest

app = FastAPI()

@app.post("/generate")
async def generate(request: Request):
    data = await request.json()
    service = LLMService()
    crs_request = CRSRequest(**data)
    result = await service.generate_crs(crs_request)
    return result.dict()
