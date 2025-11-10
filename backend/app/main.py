from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging_config import setup_logging
from app.core.config import settings
from app.api import health, plan, crs, plan_synthesis, auth, agent_jobs

setup_logging()
app = FastAPI(title="Cloud Vibecoder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:19006"],  # Expo Web default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach your API routes
app.include_router(health.router, prefix="/api")
app.include_router(plan.router, prefix="/api")
app.include_router(crs.router, prefix="/api")
app.include_router(plan_synthesis.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(agent_jobs.router, prefix="/api")
