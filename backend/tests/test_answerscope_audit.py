import pytest
from app.services.crawler.security import normalize_url, validate_url_security, extract_domain
from app.services.crawler.parser import parse_html
from app.services.crawler.crawler import AsyncCrawler
from app.services.answer_readiness.matcher import match_question_to_pages, extract_evidence_snippets
from app.services.answer_readiness.evaluator import evaluate_question_readiness
from app.services.reports.exporter import export_audit_to_csv, export_audit_to_pdf, export_audit_to_html
from app.services.questions.classifier import classify_intent_rules


def test_valid_and_invalid_urls():
    # Valid
    assert normalize_url("example.com") == "https://example.com/"
    assert normalize_url("http://example.com/path") == "http://example.com/path"
    assert normalize_url("https://example.com:443/test//sub") == "https://example.com/test/sub"
    assert extract_domain("https://example.com/about") == "example.com"

    # Invalid
    with pytest.raises(ValueError):
        normalize_url("")
    with pytest.raises(ValueError):
        normalize_url("ftp://example.com")
    with pytest.raises(ValueError):
        normalize_url("javascript:alert(1)")


def test_ssrf_protections():
    # Loopbacks and private networks must be blocked
    assert validate_url_security("http://127.0.0.1:8080") is False
    assert validate_url_security("http://localhost:3000") is False
    assert validate_url_security("http://10.0.0.5") is False
    assert validate_url_security("http://192.168.1.1") is False
    assert validate_url_security("http://172.16.0.1") is False
    assert validate_url_security("http://169.254.169.254/latest/meta-data") is False
    assert validate_url_security("http://metadata.google.internal") is False

    # Whitelisted simulated sample domain must be permitted
    assert validate_url_security("https://sample-site.nexusflow.io/") is True


def test_html_extraction_titles_headings_images():
    html_sample = """<!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Workflow Automation Solutions - NexusFlow</title>
        <meta name="description" content="Intelligent workflow orchestration and automated event dispatching.">
        <link rel="canonical" href="https://sample-site.nexusflow.io/services.html">
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Cloud Workflow Automation"
        }
        </script>
    </head>
    <body>
        <nav><a href="/">Home</a></nav>
        <h1>Core Automation Services</h1>
        <h2>What services does this company provide?</h2>
        <p>NexusFlow provides enterprise workflow automation, document understanding, and API integration for modern operations teams.</p>
        <img src="/assets/diagram.png" alt="Architecture Diagram">
        <footer>Copyright 2026</footer>
    </body>
    </html>"""

    parsed = parse_html("https://sample-site.nexusflow.io/services.html", html_sample, "sample-site.nexusflow.io")

    assert parsed.title == "Workflow Automation Solutions - NexusFlow"
    assert "Intelligent workflow orchestration" in parsed.meta_description
    assert parsed.canonical_url == "https://sample-site.nexusflow.io/services.html"
    assert parsed.language == "en"
    assert "Core Automation Services" in parsed.headings["h1"]
    assert "What services does this company provide?" in parsed.headings["h2"]
    assert len(parsed.structured_data) == 1
    assert parsed.structured_data[0]["@type"] == "Service"
    assert len(parsed.images) == 1
    assert "diagram.png" in parsed.images[0]["src"]
    assert parsed.images[0]["alt"] == "Architecture Diagram"


def test_query_to_page_relevance_matching():
    pages = [
        {
            "url": "https://example.com/pricing",
            "title": "Pricing & Costs | Example Software",
            "headings": {"h1": ["Pricing Plans"], "h2": ["How much does this service cost?"]},
            "meta_description": "Review pricing tiers starting at $29/mo.",
            "body_text": "Our pricing plans start at $29 per month with annual subscription discounts.",
        },
        {
            "url": "https://example.com/about",
            "title": "About Us",
            "headings": {"h1": ["Company History"], "h2": ["Our Mission"]},
            "meta_description": "Learn about our founding story and executive leadership.",
            "body_text": "We were founded in 2024 to simplify operations software.",
        },
    ]

    matched = match_question_to_pages("How much does this service cost?", pages)
    assert len(matched) > 0
    top_page, score = matched[0]
    assert top_page["url"] == "https://example.com/pricing"
    assert score > 0


def test_direct_answer_detection_and_content_gaps():
    pages = [{
        "url": "https://example.com/pricing",
        "title": "Pricing Plans",
        "headings": {"h1": ["Pricing Overview"], "h2": ["How much does this service cost?"]},
        "meta_description": "Our software pricing starts at $29.",
        "body_text": "How much does this service cost? Plans start at $29 per month for up to 10 automated workflows. Annual plans receive a 20% discount with billing support.",
        "structured_data": [{"@type": "Product", "name": "NexusFlow"}],
        "word_count": 450,
    }]

    res = evaluate_question_readiness(
        question_id="q1",
        question_text="How much does this service cost?",
        intent="transactional",
        crawled_pages=pages,
    )

    assert res.readiness_score >= 70.0
    assert res.status in ("ready", "partially_ready")
    assert res.direct_answer_found is True
    assert "29 per month" in res.direct_answer_snippet
    assert res.structured_data_present is True
    assert len(res.suggested_headings) > 0


def test_score_boundaries_and_unanswered_query():
    # Empty pages or completely missing content should yield score 0
    res = evaluate_question_readiness(
        question_id="q-empty",
        question_text="What are your ISO 27001 certifications?",
        intent="informational",
        crawled_pages=[],
    )
    assert res.readiness_score == 0.0
    assert res.status == "unanswered"
    assert len(res.recommendations) > 0
    assert res.recommendations[0]["priority"] in ("critical", "high")


def test_structured_data_detection():
    faq_page = [{
        "url": "https://example.com/faq",
        "title": "FAQ Page",
        "headings": {"h1": ["FAQ"], "h2": ["Questions"]},
        "body_text": "Frequently asked questions regarding our software platform.",
        "structured_data": [{
            "@type": "FAQPage",
            "mainEntity": [{
                "@type": "Question",
                "name": "How does this product work?",
                "acceptedAnswer": {"@type": "Answer", "text": "It connects to APIs and automates tasks."}
            }]
        }],
        "word_count": 350,
    }]

    res = evaluate_question_readiness(
        question_id="q-faq",
        question_text="How does this product work?",
        intent="informational",
        crawled_pages=faq_page,
    )

    assert res.structured_data_present is True
    assert res.structured_data_score == 15.0


def test_offline_sample_site_crawler():
    crawler = AsyncCrawler("https://sample-site.nexusflow.io/", max_pages=10)
    result = crawler._crawl_sample_site()
    
    assert len(result.pages) >= 4
    urls = [p["url"] for p in result.pages]
    assert "https://sample-site.nexusflow.io/" in urls
    assert "https://sample-site.nexusflow.io/pricing.html" in urls
    assert "https://sample-site.nexusflow.io/faq.html" in urls
    
    # Check that all retrieved sample pages have status 200
    for p in result.pages:
        assert p["status_code"] == 200
        assert p["title"] is not None
        assert p["word_count"] > 20


def test_csv_pdf_and_html_exports():
    q_results = [{
        "question_text": "What services does this company provide?",
        "question_intent": "informational",
        "readiness_score": 85.0,
        "status": "ready",
        "direct_answer_found": True,
        "direct_answer_snippet": "NexusFlow provides enterprise workflow automation.",
        "structured_data_present": True,
        "relevant_page_urls": ["https://sample-site.nexusflow.io/services.html"],
        "missing_subtopics": [],
        "suggested_headings": ["## What services does this company provide?"],
        "confidence_level": 0.90,
    }]
    recs = [{
        "priority": "high",
        "estimated_effort": "low",
        "issue": "Add explicit introductory summary",
        "target_query": "What services does this company provide?",
        "supporting_evidence": "Page lacks 1-2 sentence lead answer",
        "identified_gap": "Direct answer placement",
        "suggested_action": "Add 2-sentence overview paragraph under H1",
        "why_it_helps": "Improves AI Overview answer extraction",
        "affected_page_url": "https://sample-site.nexusflow.io/services.html",
        "owner_confirmation_note": "Requires website owner confirmation",
    }]

    # CSV
    csv_str = export_audit_to_csv("NexusFlow", "sample-site.nexusflow.io", 85.0, "excellent", q_results)
    assert "NexusFlow" in csv_str
    assert "What services does this company provide?" in csv_str
    assert "85.0" in csv_str

    # PDF
    pdf_bytes = export_audit_to_pdf("NexusFlow", "sample-site.nexusflow.io", 85.0, "excellent", q_results, recs)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500

    # HTML
    html_str = export_audit_to_html(
        website_name="NexusFlow",
        website_domain="sample-site.nexusflow.io",
        canonical_url="https://sample-site.nexusflow.io/",
        overall_score=85.0,
        readiness_level="excellent",
        scoring_methodology={"total_scale": 100},
        question_results=q_results,
        recommendations=recs,
        pages_analyzed_count=5,
    )
    assert "<!DOCTYPE html>" in html_str
    assert "AnswerScope" in html_str
    assert "NexusFlow" in html_str
    assert "What services does this company provide?" in html_str
    assert "HIGH PRIORITY" in html_str
