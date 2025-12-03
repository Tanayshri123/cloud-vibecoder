"""
Admin API endpoints for metrics dashboard and user management.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
import logging

from app.core.config import settings
from app.models.database import (
    DatabaseService, get_db_service, UserCreate,
    JobRecordCreate, PlanRecordCreate, PRRecordCreate
)

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response models
class AdminLoginRequest(BaseModel):
    github_id: int
    github_login: str
    github_name: Optional[str] = None
    github_avatar_url: Optional[str] = None
    github_email: Optional[str] = None


class AdminLoginResponse(BaseModel):
    success: bool
    session_token: Optional[str] = None
    user: Optional[dict] = None
    message: str


class MetricsSummary(BaseModel):
    total_users: int
    total_jobs: int
    total_plans: int
    total_prs: int
    completed_jobs: int
    failed_jobs: int
    total_tokens_used: int
    total_execution_time_seconds: float
    total_files_changed: int
    avg_execution_time_seconds: float


class UserWithMetrics(BaseModel):
    id: int
    github_id: int
    github_login: str
    github_name: Optional[str]
    github_avatar_url: Optional[str]
    github_email: Optional[str]
    is_admin: bool
    created_at: str
    last_login_at: str
    metrics: dict


# Dependency for admin authentication
async def get_current_admin(
    authorization: Optional[str] = Header(None),
    db: DatabaseService = Depends(get_db_service)
) -> dict:
    """Verify admin session and return user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    session = await db.get_admin_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user = session.get("users")
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: DatabaseService = Depends(get_db_service)
):
    """
    Admin login endpoint. Creates or updates user and returns session token if admin.
    """
    try:
        # Create or update user
        user_data = UserCreate(
            github_id=request.github_id,
            github_login=request.github_login,
            github_name=request.github_name,
            github_avatar_url=request.github_avatar_url,
            github_email=request.github_email
        )
        user = await db.create_or_update_user(user_data)
        
        if not user:
            return AdminLoginResponse(
                success=False,
                message="Failed to create/update user"
            )
        
        # Check if user is admin
        if not user.get("is_admin"):
            return AdminLoginResponse(
                success=False,
                message="User is not an admin. Contact system administrator for access."
            )
        
        # Create session token
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        await db.create_admin_session(user["id"], session_token, expires_at)
        
        logger.info(f"Admin login successful for user: {request.github_login}")
        
        return AdminLoginResponse(
            success=True,
            session_token=session_token,
            user=user,
            message="Login successful"
        )
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/logout")
async def admin_logout(
    authorization: Optional[str] = Header(None),
    db: DatabaseService = Depends(get_db_service)
):
    """Logout and invalidate session"""
    if authorization:
        token = authorization[7:] if authorization.startswith("Bearer ") else authorization
        await db.delete_admin_session(token)
    return {"success": True, "message": "Logged out successfully"}


@router.get("/admin/me")
async def get_current_user(
    admin: dict = Depends(get_current_admin)
):
    """Get current admin user info"""
    return admin


@router.get("/admin/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get aggregated metrics summary for dashboard"""
    try:
        metrics = await db.get_metrics_summary()
        return MetricsSummary(**metrics)
    except Exception as e:
        logger.error(f"Error fetching metrics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users")
async def get_all_users(
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all users with their metrics"""
    try:
        users = await db.get_all_users()
        users_with_metrics = []
        
        for user in users:
            user_metrics = await db.get_user_metrics(user["id"])
            users_with_metrics.append({
                **user,
                "metrics": user_metrics
            })
        
        return users_with_metrics
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users/{user_id}")
async def get_user_details(
    user_id: int,
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get detailed info for a specific user"""
    try:
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        metrics = await db.get_user_metrics(user_id)
        jobs = await db.get_job_records(user_id=user_id, limit=50)
        plans = await db.get_plan_records(user_id=user_id, limit=50)
        prs = await db.get_pr_records(user_id=user_id, limit=50)
        
        return {
            "user": user,
            "metrics": metrics,
            "recent_jobs": jobs,
            "recent_plans": plans,
            "recent_prs": prs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/users/{user_id}/set-admin")
async def set_user_admin_status(
    user_id: int,
    is_admin: bool,
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Set admin status for a user"""
    try:
        user = await db.set_user_admin(user_id, is_admin)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Admin {admin['github_login']} set user {user_id} admin status to {is_admin}")
        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting admin status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/jobs")
async def get_all_jobs(
    limit: int = 100,
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all job records"""
    try:
        jobs = await db.get_job_records(limit=limit)
        return jobs
    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/plans")
async def get_all_plans(
    limit: int = 100,
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all plan records"""
    try:
        plans = await db.get_plan_records(limit=limit)
        return plans
    except Exception as e:
        logger.error(f"Error fetching plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/prs")
async def get_all_prs(
    limit: int = 100,
    admin: dict = Depends(get_current_admin),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all PR records"""
    try:
        prs = await db.get_pr_records(limit=limit)
        return prs
    except Exception as e:
        logger.error(f"Error fetching PRs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Bootstrap endpoint to create first admin (should be disabled in production)
@router.post("/admin/bootstrap")
async def bootstrap_admin(
    request: AdminLoginRequest,
    secret_key: str,
    db: DatabaseService = Depends(get_db_service)
):
    """
    Bootstrap first admin user. Requires the admin secret key.
    This should be disabled or removed in production after initial setup.
    """
    if secret_key != settings.admin_secret_key:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    try:
        # Create user with admin flag
        user_data = UserCreate(
            github_id=request.github_id,
            github_login=request.github_login,
            github_name=request.github_name,
            github_avatar_url=request.github_avatar_url,
            github_email=request.github_email,
            is_admin=True
        )
        user = await db.create_or_update_user(user_data)
        
        # Force set admin status
        if user:
            await db.set_user_admin(user["id"], True)
            user = await db.get_user_by_id(user["id"])
        
        logger.info(f"Bootstrapped admin user: {request.github_login}")
        
        return {"success": True, "user": user, "message": "Admin user created successfully"}
        
    except Exception as e:
        logger.error(f"Bootstrap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
