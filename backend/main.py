"""
MyDuka - Inventory Management System
Main FastAPI Application Entry Point
"""
import json
import logging
import time
import uuid

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services.seed_service import seed_demo_users

# Import all models to register them with SQLAlchemy
from app.models import (
    inventory,
    inventory_event,
    notification,
    product,
    refresh_token,
    stock_threshold,
    store,
    supply_request,
    user,
)

# Import routers
from app.routes import auth, users, products, inventory as inventory_routes
from app.routes import dashboard, notifications as notifications_routes, reports, supply_requests

logger = logging.getLogger("myduka.api")
METRICS = {
    "requests_total": 0,
    "requests_error": 0,
}

# Create database tables (only if database is available)
try:
    if not settings.debug and settings.secret_key == "your-secret-key-change-this-in-production":
        raise RuntimeError("SECRET_KEY must be set in non-debug environments.")
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_users:
        db = SessionLocal()
        try:
            seed_demo_users(db)
        finally:
            db.close()
except Exception as e:
    print(f"Warning: Could not create database tables: {e}")
    print("Make sure PostgreSQL is running and the database credentials are correct.")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="An inventory management system for multi-store operations",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS (allow frontend to communicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        METRICS["requests_total"] += 1
        if status_code >= 400:
            METRICS["requests_error"] += 1
        logger.info(
            json.dumps(
                {
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                }
            )
        )

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(inventory_routes.router)
app.include_router(supply_requests.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(notifications_routes.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to MyDuka API",
        "version": settings.app_version,
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version
    }


@app.get("/health/ready")
async def readiness_check():
    """Readiness probe checking database connectivity."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/metrics")
async def metrics():
    """Simple service metrics endpoint."""
    return {
        "requests_total": METRICS["requests_total"],
        "requests_error": METRICS["requests_error"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
