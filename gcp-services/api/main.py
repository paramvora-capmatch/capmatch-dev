"""CapMatch FastAPI Server - Main application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from config import settings
from logging_config import setup_logging
from middleware.auth import AuthMiddleware
from middleware.cors import setup_cors
from middleware.error_handler import setup_error_handlers

# Setup logging first
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    App lifespan: startup and shutdown events.

    Args:
        app: FastAPI application instance
    """
    logger.info(
        "Starting CapMatch API Server",
        extra={
            "environment": settings.ENVIRONMENT,
            "version": settings.VERSION,
            "port": settings.PORT,
        },
    )

    # Startup tasks
    try:
        # Test Supabase connection
        from services.supabase_client import get_supabase_admin

        supabase = get_supabase_admin()
        logger.info("Supabase connection established")
    except Exception as e:
        logger.exception("Failed to establish Supabase connection", extra={"error": str(e)})
        raise

    yield  # Application is running

    # Shutdown tasks
    logger.info("Shutting down CapMatch API Server")


# Create FastAPI app
app = FastAPI(
    title="CapMatch API",
    description="Migrated Supabase Edge Functions to FastAPI",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Setup CORS
setup_cors(app)

# Setup error handlers
setup_error_handlers(app)

# Add authentication middleware
app.add_middleware(AuthMiddleware)

# Register routers
from routes import auth, projects, users

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["User Management"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])

# Additional routers will be added as we migrate more functions
# from routes import chat, calendar, webhooks
# app.include_router(chat.router, prefix="/chat", tags=["Chat"])
# app.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
# app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "CapMatch API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for load balancers and monitoring.

    Returns:
        JSON with status and version
    """
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/health/liveness")
async def liveness():
    """Kubernetes liveness probe - checks if app is alive."""
    return {"status": "alive"}


@app.get("/health/readiness")
async def readiness():
    """
    Kubernetes readiness probe - checks if app is ready to serve traffic.

    Validates database connections and dependencies.
    """
    try:
        from services.supabase_client import get_supabase_admin

        # Check Supabase connection
        supabase = get_supabase_admin()
        supabase.table("profiles").select("id").limit(1).execute()

        return {"status": "ready", "checks": {"supabase": "ok"}}

    except Exception as e:
        logger.error("Readiness check failed", extra={"error": str(e)})
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "checks": {"supabase": f"error: {str(e)}"}},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_config=None,  # Use our custom logging config
    )
