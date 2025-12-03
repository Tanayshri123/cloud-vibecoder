"""
Supabase database service for metrics tracking and admin functionality.
"""
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Supabase configuration from settings
SUPABASE_URL = settings.supabase_url or "https://fwbmyfpfckvjomzijkby.supabase.co"
SUPABASE_KEY = settings.supabase_key or ""

# Global client instance
_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get Supabase client instance"""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is not configured. Set it in your .env file.")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


# Pydantic models for type safety
class UserCreate(BaseModel):
    github_id: int
    github_login: str
    github_name: Optional[str] = None
    github_avatar_url: Optional[str] = None
    github_email: Optional[str] = None
    is_admin: bool = False


class UserResponse(BaseModel):
    id: int
    github_id: int
    github_login: str
    github_name: Optional[str] = None
    github_avatar_url: Optional[str] = None
    github_email: Optional[str] = None
    is_admin: bool
    created_at: datetime
    last_login_at: datetime


class JobRecordCreate(BaseModel):
    job_id: str
    user_id: Optional[int] = None
    repo_url: Optional[str] = None
    branch: Optional[str] = None
    created_new_repo: bool = False
    status: str
    error_message: Optional[str] = None
    error_stage: Optional[str] = None
    files_changed: int = 0
    commits_created: int = 0
    total_edits: int = 0
    tokens_used: int = 0
    execution_time_seconds: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PlanRecordCreate(BaseModel):
    user_id: Optional[int] = None
    plan_title: str
    complexity_score: int
    confidence_score: float
    steps_count: int
    files_to_change_count: int
    processing_time_ms: int
    model_used: str
    tokens_used: Optional[int] = None


class PRRecordCreate(BaseModel):
    user_id: Optional[int] = None
    job_id: Optional[str] = None
    pr_number: int
    repo_owner: str
    repo_name: str
    title: str
    html_url: str
    state: str
    head_branch: str
    base_branch: str


class DatabaseService:
    """Service for interacting with Supabase database"""
    
    def __init__(self):
        self.client = get_supabase()
    
    # User operations
    async def create_or_update_user(self, user: UserCreate) -> dict:
        """Create a new user or update existing one on login"""
        try:
            # Check if user exists
            result = self.client.table("users").select("*").eq("github_id", user.github_id).execute()
            
            if result.data:
                # Update last login
                updated = self.client.table("users").update({
                    "last_login_at": datetime.utcnow().isoformat(),
                    "github_name": user.github_name,
                    "github_avatar_url": user.github_avatar_url,
                    "github_email": user.github_email
                }).eq("github_id", user.github_id).execute()
                return updated.data[0] if updated.data else result.data[0]
            else:
                # Create new user
                created = self.client.table("users").insert(user.model_dump()).execute()
                return created.data[0] if created.data else None
        except Exception as e:
            logger.error(f"Error creating/updating user: {e}")
            raise
    
    async def get_user_by_github_id(self, github_id: int) -> Optional[dict]:
        """Get user by GitHub ID"""
        result = self.client.table("users").select("*").eq("github_id", github_id).execute()
        return result.data[0] if result.data else None
    
    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Get user by internal ID"""
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    async def get_all_users(self) -> List[dict]:
        """Get all users"""
        result = self.client.table("users").select("*").order("created_at", desc=True).execute()
        return result.data
    
    async def set_user_admin(self, user_id: int, is_admin: bool) -> dict:
        """Set user admin status"""
        result = self.client.table("users").update({"is_admin": is_admin}).eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    # Job record operations
    async def create_job_record(self, job: JobRecordCreate) -> dict:
        """Create a job record"""
        data = job.model_dump()
        if data.get("started_at"):
            data["started_at"] = data["started_at"].isoformat()
        if data.get("completed_at"):
            data["completed_at"] = data["completed_at"].isoformat()
        result = self.client.table("job_records").insert(data).execute()
        return result.data[0] if result.data else None
    
    async def update_job_record(self, job_id: str, updates: dict) -> dict:
        """Update a job record"""
        if "started_at" in updates and updates["started_at"]:
            updates["started_at"] = updates["started_at"].isoformat()
        if "completed_at" in updates and updates["completed_at"]:
            updates["completed_at"] = updates["completed_at"].isoformat()
        result = self.client.table("job_records").update(updates).eq("job_id", job_id).execute()
        return result.data[0] if result.data else None
    
    async def get_job_records(self, user_id: Optional[int] = None, limit: int = 100) -> List[dict]:
        """Get job records, optionally filtered by user"""
        query = self.client.table("job_records").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data
    
    # Plan record operations
    async def create_plan_record(self, plan: PlanRecordCreate) -> dict:
        """Create a plan record"""
        result = self.client.table("plan_records").insert(plan.model_dump()).execute()
        return result.data[0] if result.data else None
    
    async def get_plan_records(self, user_id: Optional[int] = None, limit: int = 100) -> List[dict]:
        """Get plan records, optionally filtered by user"""
        query = self.client.table("plan_records").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data
    
    # PR record operations
    async def create_pr_record(self, pr: PRRecordCreate) -> dict:
        """Create a PR record"""
        result = self.client.table("pr_records").insert(pr.model_dump()).execute()
        return result.data[0] if result.data else None
    
    async def get_pr_records(self, user_id: Optional[int] = None, limit: int = 100) -> List[dict]:
        """Get PR records, optionally filtered by user"""
        query = self.client.table("pr_records").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data
    
    # Admin session operations
    async def create_admin_session(self, user_id: int, session_token: str, expires_at: datetime) -> dict:
        """Create an admin session"""
        result = self.client.table("admin_sessions").insert({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat()
        }).execute()
        return result.data[0] if result.data else None
    
    async def get_admin_session(self, session_token: str) -> Optional[dict]:
        """Get admin session by token"""
        result = self.client.table("admin_sessions").select("*, users(*)").eq("session_token", session_token).execute()
        if result.data and len(result.data) > 0:
            session = result.data[0]
            # Check if expired
            expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
            if expires_at > datetime.utcnow().replace(tzinfo=expires_at.tzinfo):
                return session
            # Delete expired session
            self.client.table("admin_sessions").delete().eq("session_token", session_token).execute()
        return None
    
    async def delete_admin_session(self, session_token: str) -> bool:
        """Delete an admin session"""
        self.client.table("admin_sessions").delete().eq("session_token", session_token).execute()
        return True
    
    # Aggregated metrics for admin dashboard
    async def get_metrics_summary(self) -> dict:
        """Get aggregated metrics for admin dashboard"""
        # Get counts
        users = self.client.table("users").select("id", count="exact").execute()
        jobs = self.client.table("job_records").select("id", count="exact").execute()
        plans = self.client.table("plan_records").select("id", count="exact").execute()
        prs = self.client.table("pr_records").select("id", count="exact").execute()
        
        # Get job status breakdown
        completed_jobs = self.client.table("job_records").select("id", count="exact").eq("status", "completed").execute()
        failed_jobs = self.client.table("job_records").select("id", count="exact").eq("status", "failed").execute()
        
        # Get aggregate metrics
        job_metrics = self.client.table("job_records").select("tokens_used, execution_time_seconds, files_changed").execute()
        
        total_tokens = sum(j.get("tokens_used", 0) or 0 for j in job_metrics.data)
        total_execution_time = sum(j.get("execution_time_seconds", 0) or 0 for j in job_metrics.data)
        total_files_changed = sum(j.get("files_changed", 0) or 0 for j in job_metrics.data)
        
        return {
            "total_users": users.count or 0,
            "total_jobs": jobs.count or 0,
            "total_plans": plans.count or 0,
            "total_prs": prs.count or 0,
            "completed_jobs": completed_jobs.count or 0,
            "failed_jobs": failed_jobs.count or 0,
            "total_tokens_used": total_tokens,
            "total_execution_time_seconds": total_execution_time,
            "total_files_changed": total_files_changed,
            "avg_execution_time_seconds": total_execution_time / max(jobs.count or 1, 1)
        }
    
    async def get_user_metrics(self, user_id: int) -> dict:
        """Get metrics for a specific user"""
        jobs = self.client.table("job_records").select("*").eq("user_id", user_id).execute()
        plans = self.client.table("plan_records").select("*").eq("user_id", user_id).execute()
        prs = self.client.table("pr_records").select("*").eq("user_id", user_id).execute()
        
        total_tokens = sum(j.get("tokens_used", 0) or 0 for j in jobs.data)
        total_execution_time = sum(j.get("execution_time_seconds", 0) or 0 for j in jobs.data)
        completed_jobs = sum(1 for j in jobs.data if j.get("status") == "completed")
        failed_jobs = sum(1 for j in jobs.data if j.get("status") == "failed")
        
        return {
            "total_jobs": len(jobs.data),
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
            "total_plans": len(plans.data),
            "total_prs": len(prs.data),
            "total_tokens_used": total_tokens,
            "total_execution_time_seconds": total_execution_time
        }


# Global database service instance
db_service = DatabaseService() if SUPABASE_KEY else None


def get_db_service() -> DatabaseService:
    """Get database service instance"""
    global db_service
    if db_service is None:
        db_service = DatabaseService()
    return db_service
