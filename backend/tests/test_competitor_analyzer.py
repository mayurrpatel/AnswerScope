from app.services.competitors.analyzer import analyze_competitor_gaps

USER_PAGES = [
    {
        "url": "https://brand.com/overview",
        "title": "Brand Overview",
        "headings": {"h1": ["Brand Overview"], "h2": [], "h3": []},
        "body_text": "We offer standard software solutions.",
        "word_count": 80,
    }
]

COMP_PAGES = [
    {
        "url": "https://competitor.com/features",
        "title": "Comprehensive Feature Comparison and Pricing",
        "headings": {"h1": ["Detailed Feature Comparison"], "h2": ["Security", "Integrations", "Pricing"], "h3": []},
        "body_text": "Our platform provides security compliance, REST API integrations, affordable monthly billing, and 24/7 customer support.",
        "structured_data": [{"@type": "FAQPage"}],
        "word_count": 450,
    }
]


def test_analyze_competitor_gaps():
    res = analyze_competitor_gaps(
        question_id="q1",
        question_text="How does enterprise security and integration work?",
        intent="commercial_investigation",
        user_pages=USER_PAGES,
        competitor_domain="competitor.com",
        competitor_pages=COMP_PAGES,
    )

    assert res.competitor_score > res.user_score
    assert res.gap_type in ("competitor_superior", "unanswered_by_user", "subtopic_missing")
    assert "OBSERVED FACTS:" in res.observed_facts
    assert "DERIVED FINDINGS:" in res.derived_findings
    assert "RECOMMENDED NEXT ACTION:" in res.ai_suggestions
