from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
from app.core.config import settings
import httpx
import logging
import urllib.parse
import json

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


@router.get("/auth/github/callback")
async def github_oauth_callback(code: str, state: str = None, error: str = None):
    """
    GitHub redirects here after user authorizes.
    We exchange the code for a token, then redirect to the mobile app.
    """
    logger.info(f"Received GitHub OAuth callback - code present: {bool(code)}, state: {state}, error: {error}")
    
    # Handle error from GitHub
    if error:
        logger.error(f"GitHub OAuth error: {error}")
        error_deep_link = f"mobile://oauth-error?error={urllib.parse.quote(error)}"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Error</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #ff6b6b;
                    color: white;
                    text-align: center;
                    padding: 2rem;
                }}
                h1 {{ margin: 0 0 1rem 0; }}
                .button {{
                    margin-top: 1rem;
                    padding: 12px 24px;
                    background: white;
                    color: #ff6b6b;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                }}
            </style>
        </head>
        <body>
            <h1>❌ Authentication Failed</h1>
            <p>Error: {error}</p>
            <a href="{error_deep_link}" class="button">Return to App</a>
            <script>
                window.location.href = "{error_deep_link}";
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    # Code is required
    if not code:
        logger.error("No code parameter in callback")
        error_deep_link = "mobile://oauth-error?error=no_code"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Authentication Error</title>
        </head>
        <body>
            <h1>Error: No authorization code received</h1>
            <a href="{error_deep_link}">Return to App</a>
            <script>window.location.href = "{error_deep_link}";</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    client_id = settings.github_client_id
    client_secret = settings.github_client_secret
    
    if not client_id or not client_secret:
        logger.error("GitHub OAuth credentials not configured")
        error_deep_link = "mobile://oauth-error?error=server_config"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Server Error</title>
        </head>
        <body>
            <h1>Server configuration error</h1>
            <a href="{error_deep_link}">Return to App</a>
            <script>window.location.href = "{error_deep_link}";</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Exchange code for access token
        try:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"}
            )
            token_payload = token_response.json()
            logger.debug(f"Token response: {token_payload}")
        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            error_deep_link = "mobile://oauth-error?error=token_exchange"
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Token Exchange Error</title>
            </head>
            <body>
                <h1>Failed to exchange authorization code</h1>
                <a href="{error_deep_link}">Return to App</a>
                <script>window.location.href = "{error_deep_link}";</script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        
        access_token = token_payload.get("access_token")
        
        if not access_token:
            error = token_payload.get("error", "unknown")
            logger.error(f"No access token in response: {error}")
            error_deep_link = f"mobile://oauth-error?error={urllib.parse.quote(error)}"
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Authentication Error</title>
            </head>
            <body>
                <h1>No access token received</h1>
                <p>Error: {error}</p>
                <a href="{error_deep_link}">Return to App</a>
                <script>window.location.href = "{error_deep_link}";</script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        
        # Get user info
        try:
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            user_data = user_response.json()
        except Exception as e:
            logger.error(f"User fetch failed: {e}")
            error_deep_link = "mobile://oauth-error?error=user_fetch"
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>User Fetch Error</title>
            </head>
            <body>
                <h1>Failed to fetch user information</h1>
                <a href="{error_deep_link}">Return to App</a>
                <script>window.location.href = "{error_deep_link}";</script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content)
    
    # Build user JSON for the mobile app
    user_info = {
        "id": user_data.get("id"),
        "login": user_data.get("login"),
        "name": user_data.get("name"),
        "avatar_url": user_data.get("avatar_url"),
        "email": user_data.get("email"),
    }
    
    user_json = urllib.parse.quote(json.dumps(user_info))
    
    logger.info(f"GitHub OAuth successful for user: {user_info.get('login')}")
    
    # Build deep link URL
    deep_link_url = f"mobile://oauth-success?token={access_token}&user={user_json}"
    
    # Return HTML page that triggers the deep link
    # This works because browsers can't directly open custom URL schemes,
    # but JavaScript can attempt to open them, and iOS/Android will handle it
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirecting to App...</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }}
            .container {{
                text-align: center;
                padding: 2rem;
            }}
            h1 {{
                margin: 0 0 1rem 0;
                font-size: 1.5rem;
            }}
            p {{
                margin: 0.5rem 0;
                opacity: 0.9;
            }}
            .spinner {{
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 2rem auto;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            .button {{
                margin-top: 2rem;
                padding: 12px 24px;
                background: white;
                color: #667eea;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }}
            .button:hover {{
                background: #f0f0f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>Redirecting you back to the app...</p>
            <div class="spinner"></div>
            <p style="font-size: 0.9rem; margin-top: 2rem;">If you're not redirected automatically,</p>
            <a href="{deep_link_url}" class="button">Open App</a>
        </div>
        <script>
            // Try to open the deep link immediately
            window.location.href = "{deep_link_url}";
            
            // Fallback: try again after a short delay
            setTimeout(function() {{
                window.location.href = "{deep_link_url}";
            }}, 500);
            
            // If still not redirected after 2 seconds, show manual button
            setTimeout(function() {{
                document.querySelector('.button').style.display = 'inline-block';
            }}, 2000);
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)
