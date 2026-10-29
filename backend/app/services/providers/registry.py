from typing import Dict, List, Any
from app.services.providers.base import BaseVisibilityProvider
from app.services.providers.tavily import TavilySearchProvider
from app.services.providers.serpapi import SerpApiProvider
from app.services.providers.fixture import FixtureTestProvider


def get_available_providers() -> Dict[str, BaseVisibilityProvider]:
    return {
        "tavily": TavilySearchProvider(),
        "serpapi": SerpApiProvider(),
        "test_fixture": FixtureTestProvider(),
    }


def get_provider(name: str) -> BaseVisibilityProvider:
    providers = get_available_providers()
    if name not in providers:
        raise ValueError(f"Unknown visibility provider: {name}. Supported: {list(providers.keys())}")
    return providers[name]


def get_provider_statuses() -> List[Dict[str, Any]]:
    providers = get_available_providers()
    statuses = []
    
    tavily = providers["tavily"]
    statuses.append({
        "provider_name": "tavily",
        "is_configured": tavily.is_configured,
        "description": "Tavily AI Search Engine API (direct answers & citations)",
        "requires_key": "TAVILY_API_KEY",
        "supported_features": ["ai_answer_extraction", "citations", "brand_mentions", "competitor_mentions"],
    })

    serpapi = providers["serpapi"]
    statuses.append({
        "provider_name": "serpapi",
        "is_configured": serpapi.is_configured,
        "description": "SerpAPI Google Search API (organic search, knowledge graphs & snippets)",
        "requires_key": "SERPAPI_API_KEY",
        "supported_features": ["organic_citations", "answer_box", "brand_mentions", "competitor_mentions"],
    })

    statuses.append({
        "provider_name": "test_fixture",
        "is_configured": True,
        "description": "Deterministic test fixture provider for offline verification & demonstrations",
        "requires_key": "None (built-in)",
        "supported_features": ["simulated_fixture", "citations", "brand_mentions", "competitor_mentions"],
    })

    return statuses
