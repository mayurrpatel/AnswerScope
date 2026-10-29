from app.services.questions.classifier import classify_intent_rules
from app.models.question import SearchIntent


def test_classify_informational():
    intent, conf, _ = classify_intent_rules("What is AI answer readiness and how does it work?")
    assert intent == SearchIntent.INFORMATIONAL
    assert conf >= 0.8


def test_classify_commercial_investigation():
    intent, conf, _ = classify_intent_rules("What are the best alternatives to Perplexity vs Google?")
    assert intent == SearchIntent.COMMERCIAL_INVESTIGATION
    assert conf >= 0.85


def test_classify_transactional():
    intent, conf, _ = classify_intent_rules("How much does the enterprise subscription pricing cost?")
    assert intent == SearchIntent.TRANSACTIONAL
    assert conf >= 0.85


def test_classify_navigational():
    intent, conf, _ = classify_intent_rules("Customer portal login and support desk")
    assert intent == SearchIntent.NAVIGATIONAL
    assert conf >= 0.8


def test_classify_unknown():
    intent, _, _ = classify_intent_rules("apple")
    assert intent == SearchIntent.UNKNOWN
