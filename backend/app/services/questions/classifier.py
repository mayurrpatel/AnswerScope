import re
from typing import Tuple

from app.models.question import SearchIntent


def classify_intent_rules(question_text: str) -> Tuple[SearchIntent, float, str]:
    """
    Deterministically classifies question search intent using lexical heuristics.
    Returns: (SearchIntent, confidence 0.0-1.0, reasoning)
    """
    text = question_text.lower().strip()
    
    # Navigational signals
    if re.search(r"\b(login|sign in|portal|contact|support|phone number|address|help desk|careers)\b", text):
        return (
            SearchIntent.NAVIGATIONAL,
            0.88,
            "Query contains navigational intent keywords (e.g. login, contact, portal, support).",
        )

    # Transactional signals
    if re.search(r"\b(pricing|cost|price|buy|purchase|discount|coupon|subscribe|subscription|demo|free trial|hire|quote)\b", text):
        return (
            SearchIntent.TRANSACTIONAL,
            0.92,
            "Query contains transactional buying/pricing terms (e.g. pricing, buy, cost, trial).",
        )

    # Commercial Investigation signals
    if re.search(r"\b(best|vs|versus|compare|comparison|review|reviews|alternatives|alternative|pros and cons|top 10|top 5)\b", text):
        return (
            SearchIntent.COMMERCIAL_INVESTIGATION,
            0.90,
            "Query contains comparative or commercial evaluation terms (e.g. best, vs, alternatives, review).",
        )

    # Informational signals
    if re.search(r"\b(what is|how to|how do|why|when|where|guide|tutorial|explained|definition|meaning|difference between)\b", text) or text.endswith("?"):
        return (
            SearchIntent.INFORMATIONAL,
            0.85,
            "Query seeks educational, explanatory, or factual knowledge (e.g. what is, how to, why).",
        )

    # Default fallback
    words = re.findall(r"\w+", text)
    if len(words) >= 4:
        return (
            SearchIntent.INFORMATIONAL,
            0.60,
            "Multi-word natural question defaults to informational intent with moderate confidence.",
        )

    return (
        SearchIntent.UNKNOWN,
        0.40,
        "Ambiguous query without clear intent markers.",
    )
