from app.services.reports.exporter import export_audit_to_csv, export_audit_to_pdf

SAMPLE_RESULTS = [
    {
        "question_text": "What is answer engine visibility?",
        "question_intent": "informational",
        "readiness_score": 88.5,
        "status": "ready",
        "direct_answer_found": True,
        "direct_answer_snippet": "Answer engine visibility is presence in AI answer citations.",
        "structured_data_present": True,
        "relevant_page_urls": ["https://example.com/guide"],
        "missing_subtopics": ["pricing"],
        "confidence_level": 0.90,
    }
]

SAMPLE_RECS = [
    {
        "priority": "high",
        "issue": "Add FAQ schema markup",
        "suggested_action": "Implement Schema.org FAQPage JSON-LD",
        "why_it_helps": "Helps AI crawlers synthesize questions and answers cleanly.",
    }
]


def test_export_to_csv():
    csv_str = export_audit_to_csv(
        website_name="Acme Inc",
        website_domain="acme.com",
        overall_score=88.5,
        readiness_level="excellent",
        question_results=SAMPLE_RESULTS,
    )

    assert "Acme Inc" in csv_str
    assert "acme.com" in csv_str
    assert "What is answer engine visibility?" in csv_str
    assert "88.5" in csv_str


def test_export_to_pdf():
    pdf_bytes = export_audit_to_pdf(
        website_name="Acme Inc",
        website_domain="acme.com",
        overall_score=88.5,
        readiness_level="excellent",
        question_results=SAMPLE_RESULTS,
        recommendations=SAMPLE_RECS,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
