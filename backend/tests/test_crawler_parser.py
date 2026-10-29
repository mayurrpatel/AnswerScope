from app.services.crawler.parser import parse_html

SAMPLE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Answer Engine Optimization Guide - Example Inc</title>
    <meta name="description" content="A comprehensive guide to optimizing content for AI answer engines.">
    <link rel="canonical" href="https://example.com/guide">
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
            "@type": "Question",
            "name": "How does answer engine optimization work?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "It focuses on structured answers, clarity, and authority."
            }
        }]
    }
    </script>
</head>
<body>
    <nav><a href="/home">Home</a></nav>
    <h1>Answer Engine Optimization</h1>
    <h2>What is Answer Engine Optimization?</h2>
    <p>Answer Engine Optimization (AEO) is the practice of optimizing content so AI answer engines like Perplexity, ChatGPT, and Google AI Overviews can cite and synthesize direct answers.</p>
    <h2>Pricing and Plans</h2>
    <p>We provide affordable annual and monthly subscription options with a 14-day free trial.</p>
    <a href="/pricing">View Pricing</a>
    <a href="https://external-site.com">External Partner</a>
    <footer>Copyright 2026</footer>
</body>
</html>
"""


def test_parse_html():
    parsed = parse_html("https://example.com/guide", SAMPLE_HTML, "example.com")
    
    assert parsed.title == "Answer Engine Optimization Guide - Example Inc"
    assert parsed.meta_description == "A comprehensive guide to optimizing content for AI answer engines."
    assert parsed.canonical_url == "https://example.com/guide"
    assert parsed.language == "en"
    
    assert "Answer Engine Optimization" in parsed.headings["h1"]
    assert "What is Answer Engine Optimization?" in parsed.headings["h2"]
    assert "Pricing and Plans" in parsed.headings["h2"]
    
    # Structured data JSON-LD extraction
    assert len(parsed.structured_data) == 1
    assert parsed.structured_data[0]["@type"] == "FAQPage"
    
    # Internal links
    assert "https://example.com/pricing" in parsed.internal_links
    assert "https://external-site.com" not in parsed.internal_links
    
    # Body text should NOT include navigation or footer
    assert "Copyright 2026" not in parsed.body_text
    assert "AI answer engines" in parsed.body_text
    assert parsed.word_count > 20
