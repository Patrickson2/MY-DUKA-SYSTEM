"""
MyDuka - Inventory Management System
Main FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services.seed_service import seed_demo_users

# Import all models to register them with SQLAlchemy
from app.models import user, product, store, inventory, supply_request

# Import routers
from app.routes import auth, users, products, inventory as inventory_routes
from app.routes import dashboard, reports, supply_requests

# Create database tables (only if database is available)
try:
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
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(inventory_routes.router)
app.include_router(supply_requests.router)
app.include_router(reports.router)
app.include_router(dashboard.router)


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
