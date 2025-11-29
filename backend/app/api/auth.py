from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class GitHubExchangeRequest(BaseModel):
    code: str
    redirect_uri: str


class GitHubUser(BaseModel):
    id: int
    login: str
    name: str | None = None
    avatar_url: str | None = None
    email: str | None = None


class GitHubExchangeResponse(BaseModel):
    access_token: str
    token_type: str
    scope: str
    user: GitHubUser


@router.post("/auth/github/exchange", response_model=GitHubExchangeResponse)
async def exchange_github_code(payload: GitHubExchangeRequest):
    """Exchange GitHub OAuth code for an access token and user profile."""
    logger.info("Starting GitHub OAuth code exchange")
    logger.debug(f"Received GitHub code exchange request with redirect_uri: {payload.redirect_uri}")

    client_id = settings.github_client_id
    client_secret = settings.github_client_secret

    if not client_id or not client_secret:
        logger.error("GitHub OAuth credentials are not configured - check environment variables")
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth is not configured on the server",
        )

    token_url = "https://github.com/login/oauth/access_token"
    user_url = "https://api.github.com/user"

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": payload.code,
        "redirect_uri": payload.redirect_uri,
    }

    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            logger.debug("Initiating GitHub token exchange request")
            token_response = await client.post(token_url, data=data, headers=headers)
            token_response.raise_for_status()
            logger.debug(f"GitHub token exchange successful: {token_response.text}")
        except httpx.HTTPError as exc:
            logger.error(f"GitHub token exchange failed: {exc}")
            raise HTTPException(
                status_code=502,
                detail="Failed to exchange authorization code with GitHub",
            ) from exc

        token_payload = token_response.json()
        logger.debug(f"Parsed token response: {token_payload}")

        access_token = token_payload.get("access_token")
        token_type = token_payload.get("token_type", "")
        scope = token_payload.get("scope", "")

        if not access_token:
            logger.error(f"GitHub token response missing access token: {token_payload}")
            raise HTTPException(
                status_code=400,
                detail="GitHub did not return an access token",
            )

        logger.debug("Got access token, fetching user profile")
        user_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        try:
            user_response = await client.get(user_url, headers=user_headers)
            user_response.raise_for_status()
            logger.debug(f"GitHub user profile fetch successful: {user_response.text}")
        except httpx.HTTPError as exc:
            logger.error(f"GitHub user fetch failed: {exc}")
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch GitHub user profile",
            ) from exc

        user_payload = user_response.json()

    user = GitHubUser(
        id=user_payload.get("id"),
        login=user_payload.get("login"),
        name=user_payload.get("name"),
        avatar_url=user_payload.get("avatar_url"),
        email=user_payload.get("email"),
    )

    logger.info(f"GitHub authentication successful for user: {user.login}")
    logger.debug(f"Complete user profile: {user}")

    return GitHubExchangeResponse(
        access_token=access_token,
        token_type=token_type,
        scope=scope,
        user=user,
    )
