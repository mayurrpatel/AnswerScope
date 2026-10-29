from app.services.answer_readiness.evaluator import evaluate_question_readiness

PAGES_FIXTURE = [
    {
        "url": "https://example.com/aeo-guide",
        "title": "What is Answer Engine Optimization?",
        "meta_description": "Comprehensive explanation of answer engine optimization.",
        "headings": {
            "h1": ["Answer Engine Optimization"],
            "h2": ["Definition", "Best Practices", "Pricing and Plans"],
            "h3": []
        },
        "body_text": "Answer Engine Optimization is the systematic practice of structuring and phrasing content so AI engines can easily extract concise answers. We offer subscription plans, free trial options, and detailed implementation guides for enterprise teams.",
        "structured_data": [{"@type": "FAQPage"}],
        "word_count": 350,
    }
]


def test_evaluate_question_high_readiness():
    res = evaluate_question_readiness(
        question_id="q1",
        question_text="What is Answer Engine Optimization?",
        intent="informational",
        crawled_pages=PAGES_FIXTURE,
    )
    assert res.readiness_score > 60.0
    assert res.status in ("ready", "partially_ready")
    assert res.direct_answer_found is True
    assert res.structured_data_present is True
    assert "https://example.com/aeo-guide" in res.relevant_page_urls
    assert len(res.evidence_snippets) > 0


def test_evaluate_question_missing_content():
    res = evaluate_question_readiness(
        question_id="q2",
        question_text="How to bake gluten-free sourdough bread at home?",
        intent="informational",
        crawled_pages=PAGES_FIXTURE,
    )
    assert res.readiness_score == 0.0
    assert res.status == "unanswered"
    assert res.direct_answer_found is False
    assert len(res.recommendations) > 0
    assert res.recommendations[0]["priority"] == "critical"
