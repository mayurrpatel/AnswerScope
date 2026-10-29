from datetime import datetime
from typing import List, Dict
from app.services.providers.base import BaseVisibilityProvider, ProviderQueryResult, ProviderCitation


class FixtureTestProvider(BaseVisibilityProvider):
    """
    Deterministic test fixture provider used for automated offline test verification
    and demonstration when external API credentials are not provided.
    Explicitly flags is_simulated_fixture = True so it is never confused with live results.
    """
    @property
    def provider_name(self) -> str:
        return "test_fixture"

    @property
    def is_configured(self) -> bool:
        return True

    async def query(
        self,
        query: str,
        brand_domain: str,
        brand_aliases: List[str],
        competitor_domains: List[str],
    ) -> ProviderQueryResult:
        now = datetime.utcnow()
        comp = competitor_domains[0] if competitor_domains else "competitor-demo.com"
        
        # Build synthetic test fixture
        citations = [
            ProviderCitation(
                url=f"https://{brand_domain}/overview",
                domain=brand_domain,
                title=f"{brand_domain} Official Guide",
                snippet=f"{brand_domain} provides answers for {query}.",
                position=1,
            ),
            ProviderCitation(
                url=f"https://{comp}/solution",
                domain=comp,
                title=f"{comp} Comparison",
                snippet=f"{comp} is an alternative solution for {query}.",
                position=2,
            ),
            ProviderCitation(
                url="https://industry-reviews.org/best-solutions",
                domain="industry-reviews.org",
                title="Top Industry Solutions Review",
                snippet=f"Reviewing {brand_domain} and {comp} for answer visibility.",
                position=3,
            )
        ]

        brand_mentions = [brand_domain]
        competitor_mentions = [{"competitor": comp, "snippet": f"Mentioned in position 2 review for {query}"}]

        return ProviderQueryResult(
            provider_name=self.provider_name,
            model_name="deterministic-verification-fixture",
            query=query,
            answer_text=f"[TEST FIXTURE] Synthesized test answer discussing {brand_domain} and {comp}.",
            citations=citations,
            brand_mentions=brand_mentions,
            competitor_mentions=competitor_mentions,
            raw_response="{\"fixture\": true, \"note\": \"Simulated offline fixture for verification\"}",
            retrieved_at=now,
            is_simulated_fixture=True,
            is_configured=True,
        )
