"""
Configuration settings for the MyDuka FastAPI application
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App info
    app_name: str = "MyDuka - Inventory Management System"
    app_version: str = "1.0.0"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./myduka.db"
    database_driver: str = "sqlite"  # sqlite or postgresql

    # JWT Settings
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    invite_token_expire_hours: int = 48

    # Email Settings (optional - for later implementation)
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    email_from: str = "noreply@myduka.com"
    email_password: Optional[str] = None

    # Frontend integration
    frontend_base_url: str = "http://localhost:5173"

    # Pagination
    items_per_page: int = 10
    low_stock_default_threshold: int = 20
    seed_demo_users: bool = True
    cors_origins_raw: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]


settings = Settings()
