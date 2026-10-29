from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AnswerScope — AI Search Visibility & Answer Engine Audit"
    app_version: str = "1.0.0"
    
    # Database: can be PostgreSQL or local SQLite for testing
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    
    # Provider Keys (optional - if omitted, provider reports unconfigured status)
    tavily_api_key: str | None = None
    serpapi_api_key: str | None = None
    perplexity_api_key: str | None = None
    
    # AI Engine Key (optional - if omitted, deterministic rule engine is used)
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    ai_model_name: str = "gpt-4o-mini"
    
    # Crawler Settings
    crawler_max_pages: int = 15
    crawler_max_depth: int = 2
    crawler_timeout_seconds: int = 10
    crawler_user_agent: str = "AnswerScopeAuditor/1.0 (+https://example.com/bot)"


settings = Settings()
