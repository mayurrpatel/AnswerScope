import httpx
from datetime import datetime
from urllib.parse import urlparse
from typing import List, Dict
import logging

from app.services.providers.base import BaseVisibilityProvider, ProviderQueryResult, ProviderCitation
from app.core.config import settings

logger = logging.getLogger(__name__)


class SerpApiProvider(BaseVisibilityProvider):
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.serpapi_api_key

    @property
    def provider_name(self) -> str:
        return "serpapi"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def query(
        self,
        query: str,
        brand_domain: str,
        brand_aliases: List[str],
        competitor_domains: List[str],
    ) -> ProviderQueryResult:
        now = datetime.utcnow()
        if not self.is_configured:
            return ProviderQueryResult(
                provider_name=self.provider_name,
                query=query,
                retrieved_at=now,
                is_configured=False,
                error_message="SerpAPI key is not configured. Set SERPAPI_API_KEY environment variable to enable Google Search / AI overview queries.",
            )

        url = "https://serpapi.com/search"
        params = {
            "api_key": self.api_key,
            "q": query,
            "engine": "google",
            "num": 10,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, params=params)
                if res.status_code != 200:
                    return ProviderQueryResult(
                        provider_name=self.provider_name,
                        query=query,
                        retrieved_at=now,
                        is_configured=True,
                        error_message=f"SerpAPI error: HTTP {res.status_code} - {res.text[:200]}",
                    )
                data = res.json()

            # Answer box or AI overview if present
            answer_box = data.get("answer_box", {})
            answer_text = answer_box.get("snippet") or answer_box.get("answer") or ""

            citations: List[ProviderCitation] = []
            for idx, item in enumerate(data.get("organic_results", []), start=1):
                item_url = item.get("link") or ""
                domain = urlparse(item_url).hostname or ""
                citations.append(
                    ProviderCitation(
                        url=item_url,
                        domain=domain.lower(),
                        title=item.get("title") or "",
                        snippet=item.get("snippet") or "",
                        position=idx,
                    )
                )

            # Mentions check
            full_text = answer_text + " " + " ".join([c.snippet or "" for c in citations])
            full_text_lower = full_text.lower()

            brand_mentions: List[str] = []
            all_brand_names = [brand_domain.lower()] + [b.lower() for b in brand_aliases if b]
            for b in all_brand_names:
                if b and b in full_text_lower:
                    brand_mentions.append(b)

            competitor_mentions: List[Dict[str, str]] = []
            for comp in competitor_domains:
                comp_lower = comp.lower()
                if comp_lower and comp_lower in full_text_lower:
                    competitor_mentions.append({"competitor": comp, "snippet": f"Found in organic search results for {query}"})

            return ProviderQueryResult(
                provider_name=self.provider_name,
                model_name="google-search-serpapi",
                query=query,
                answer_text=answer_text,
                citations=citations,
                brand_mentions=list(set(brand_mentions)),
                competitor_mentions=competitor_mentions,
                raw_response=res.text[:1000],
                retrieved_at=now,
                is_simulated_fixture=False,
                is_configured=True,
            )

        except Exception as e:
            logger.error(f"Error querying SerpAPI: {e}")
            return ProviderQueryResult(
                provider_name=self.provider_name,
                query=query,
                retrieved_at=now,
                is_configured=True,
                error_message=f"Request failed: {str(e)}",
            )
