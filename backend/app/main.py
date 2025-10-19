from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging_config import setup_logging
from app.core.config import settings
from app.api import health, plan, crs, plan_synthesis

setup_logging()
app = FastAPI(title="Cloud Vibecoder API")

# CORS setup (allows your Expo frontend to access the backend)
origins = [o.strip() for o in (settings.cors_origins or "").split(",") if o.strip()]
if not origins and settings.app_env == "dev":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach your API routes
app.include_router(health.router, prefix="/api")
app.include_router(plan.router, prefix="/api")
app.include_router(crs.router, prefix="/api")
app.include_router(plan_synthesis.router, prefix="/api")
