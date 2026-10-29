import pytest
from app.services.providers.fixture import FixtureTestProvider
from app.services.providers.tavily import TavilySearchProvider
from app.services.providers.serpapi import SerpApiProvider
from app.services.providers.registry import get_provider_statuses


@pytest.mark.anyio
async def test_fixture_provider():
    provider = FixtureTestProvider()
    assert provider.is_configured is True
    assert provider.provider_name == "test_fixture"

    res = await provider.query(
        query="What is the best SEO tool?",
        brand_domain="example.com",
        brand_aliases=["Example Corp"],
        competitor_domains=["competitor.com"],
    )

    assert res.is_simulated_fixture is True
    assert len(res.citations) >= 2
    assert "example.com" in res.brand_mentions
    assert len(res.competitor_mentions) > 0


def test_unconfigured_providers_report_cleanly():
    tavily = TavilySearchProvider(api_key=None)
    assert tavily.is_configured is False

    serp = SerpApiProvider(api_key=None)
    assert serp.is_configured is False

    statuses = get_provider_statuses()
    assert len(statuses) >= 3
