"""Authentication middleware for JWT validation."""

import logging
from typing import Dict, Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from services.supabase_client import get_supabase_anon

logger = logging.getLogger(__name__)

# Paths that don't require authentication
EXCLUDED_PATHS = [
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/webhooks/daily",  # Daily.co webhook uses signature verification
    "/auth/accept-invite",  # New users don't have authentication tokens yet
    "/auth/validate-invite",  # Used to validate invite tokens before authentication
]


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to validate JWT tokens and attach user to request."""

    async def dispatch(self, request: Request, call_next):
        """
        Validate JWT token and attach user to request state.

        Args:
            request: Incoming request
            call_next: Next middleware in chain

        Returns:
            Response from next middleware or 401 error
        """
        path = request.url.path
        method = request.method
        
        logger.info(
            "Auth middleware called",
            extra={
                "path": path,
                "method": method,
                "excluded_paths": EXCLUDED_PATHS,
            },
        )

        # Skip auth for OPTIONS requests (CORS preflight)
        if method == "OPTIONS":
            logger.info(
                "OPTIONS request - skipping authentication (CORS preflight)",
                extra={"path": path},
            )
            return await call_next(request)

        # Skip auth for excluded paths
        # Special handling for root path - must be exact match
        if path == "/":
            logger.info(
                "Path excluded from authentication (root)",
                extra={"path": path},
            )
            return await call_next(request)
        
        # For other paths, check if they start with any excluded path (but not "/" since we handled that above)
        is_excluded = any(
            path.startswith(excluded) 
            for excluded in EXCLUDED_PATHS 
            if excluded != "/"  # Skip "/" since we already handled it
        )
        if is_excluded:
            matching_path = next((p for p in EXCLUDED_PATHS if p != "/" and path.startswith(p)), None)
            logger.info(
                "Path excluded from authentication",
                extra={
                    "path": path,
                    "matching_excluded_path": matching_path,
                },
            )
            return await call_next(request)

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        
        logger.info(
            "Checking Authorization header",
            extra={
                "path": request.url.path,
                "has_auth_header": bool(auth_header),
                "auth_header_preview": auth_header[:20] + "..." if auth_header and len(auth_header) > 20 else auth_header,
            },
        )

        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning(
                "Missing or invalid Authorization header",
                extra={"path": request.url.path, "method": request.method},
            )
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Unauthorized",
                    "message": "Missing or invalid Authorization header",
                },
            )

        token = auth_header.replace("Bearer ", "")

        try:
            # Validate JWT with Supabase
            user = await validate_supabase_token(token)

            # Attach user to request state
            request.state.user = user
            request.state.user_id = user["id"]

            logger.info(
                "Request authenticated",
                extra={
                    "user_id": user["id"],
                    "path": request.url.path,
                    "method": request.method,
                },
            )

            response = await call_next(request)
            return response

        except HTTPException as e:
            logger.error(
                "Authentication failed",
                extra={
                    "error": str(e.detail),
                    "path": request.url.path,
                },
            )
            return JSONResponse(status_code=401, content={"error": "Unauthorized", "message": str(e.detail)})

        except Exception as e:
            logger.exception(
                "Authentication error",
                extra={"error": str(e), "path": request.url.path},
            )
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "message": "Token validation failed"},
            )


async def validate_supabase_token(token: str) -> Dict:
    """
    Validate JWT token with Supabase and return user object.

    Args:
        token: JWT token from Authorization header

    Returns:
        User object with id, email, role

    Raises:
        HTTPException: If token is invalid
    """
    supabase = get_supabase_anon()

    try:
        # Get user from token
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_data = {
            "id": response.user.id,
            "email": response.user.email,
            "role": response.user.user_metadata.get("app_role"),
        }

        return user_data

    except Exception as e:
        logger.error("Token validation failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=401, detail=f"Token validation failed: {str(e)}"
        )
