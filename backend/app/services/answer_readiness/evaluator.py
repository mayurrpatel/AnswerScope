import re
from typing import List, Dict, Any, Tuple

from app.services.answer_readiness.matcher import (
    match_question_to_pages,
    extract_evidence_snippets,
    tokenize,
)


EXPECTED_SUBTOPICS = {
    "pricing": ["cost", "plans", "subscription", "free trial", "annual", "monthly", "billing"],
    "commercial_investigation": ["features", "comparison", "benefits", "integrations", "pros", "cons"],
    "transactional": ["signup", "demo", "get started", "onboarding", "security", "support"],
    "informational": ["definition", "steps", "guide", "overview", "examples", "best practices"],
}


class QuestionEvaluationResult:
    def __init__(
        self,
        question_id: str,
        readiness_score: float,
        status: str,
        direct_answer_found: bool,
        direct_answer_snippet: str | None,
        answer_clarity_score: float,
        content_depth_score: float,
        structured_data_present: bool,
        structured_data_score: float,
        heading_structure_score: float,
        evidence_quality_score: float,
        relevant_page_urls: List[str],
        evidence_snippets: List[Dict[str, Any]],
        missing_subtopics: List[str],
        confidence_level: float,
        explanation: str,
        recommendations: List[Dict[str, Any]],
    ):
        self.question_id = question_id
        self.readiness_score = readiness_score
        self.status = status
        self.direct_answer_found = direct_answer_found
        self.direct_answer_snippet = direct_answer_snippet
        self.answer_clarity_score = answer_clarity_score
        self.content_depth_score = content_depth_score
        self.structured_data_present = structured_data_present
        self.structured_data_score = structured_data_score
        self.heading_structure_score = heading_structure_score
        self.evidence_quality_score = evidence_quality_score
        self.relevant_page_urls = relevant_page_urls
        self.evidence_snippets = evidence_snippets
        self.missing_subtopics = missing_subtopics
        self.confidence_level = confidence_level
        self.explanation = explanation
        self.recommendations = recommendations


def evaluate_question_readiness(
    question_id: str,
    question_text: str,
    intent: str,
    crawled_pages: List[Dict[str, Any]],
) -> QuestionEvaluationResult:
    """
    Evaluates website content answer-readiness for a target question.
    Scoring rubric (0-100 total):
      1. Direct Answer Presence: 0-30 pts
      2. Content Depth & Coverage: 0-30 pts
      3. Structured Data: 0-15 pts
      4. Heading & Structure: 0-15 pts
      5. Evidence Clarity & Source: 0-10 pts
    """
    ranked = match_question_to_pages(question_text, crawled_pages)
    recommendations: List[Dict[str, Any]] = []

    if not ranked:
        # No relevant page found
        return QuestionEvaluationResult(
            question_id=question_id,
            readiness_score=0.0,
            status="unanswered",
            direct_answer_found=False,
            direct_answer_snippet=None,
            answer_clarity_score=0.0,
            content_depth_score=0.0,
            structured_data_present=False,
            structured_data_score=0.0,
            heading_structure_score=0.0,
            evidence_quality_score=0.0,
            relevant_page_urls=[],
            evidence_snippets=[],
            missing_subtopics=["Core answer content", "Dedicated page or section"],
            confidence_level=0.90,
            explanation="None of the crawled website pages contain content relevant to this question.",
            recommendations=[{
                "issue": "Question completely unanswered across crawled pages.",
                "supporting_evidence": f"Zero matching content for query: '{question_text}'",
                "why_it_helps": "Search engines and AI answer engines cannot cite a brand if no relevant content exists.",
                "suggested_action": f"Create a dedicated page or FAQ section specifically answering: '{question_text}'.",
                "priority": "critical",
                "estimated_effort": "medium",
                "is_ai_generated": False,
                "affected_page_url": None,
            }],
        )

    best_page, match_score = ranked[0]
    relevant_urls = [p[0]["url"] for p in ranked[:3]]

    # 1. Direct answer detection & clarity (0-30 pts)
    snippets = extract_evidence_snippets(question_text, best_page, max_snippets=3)
    direct_answer_found = False
    direct_answer_snippet = None
    clarity_score = 0.0

    if snippets:
        direct_answer_found = True
        direct_answer_snippet = snippets[0]["text"]
        # Clarity points based on snippet length, conciseness, and relevance
        clarity_score = min(30.0, 15.0 + snippets[0]["score"] * 1.5)
    else:
        clarity_score = 5.0

    # 2. Content depth and subtopic coverage (0-30 pts)
    word_count = best_page.get("word_count", 0)
    body_text_lower = (best_page.get("body_text") or "").lower()
    
    # Check expected subtopics based on intent
    expected = EXPECTED_SUBTOPICS.get(intent, EXPECTED_SUBTOPICS["informational"])
    found_subtopics = [st for st in expected if st in body_text_lower]
    missing_subtopics = [st for st in expected if st not in body_text_lower]
    
    coverage_ratio = len(found_subtopics) / max(len(expected), 1)
    
    depth_score = 0.0
    if word_count > 800:
        depth_score += 15.0
    elif word_count > 300:
        depth_score += 10.0
    else:
        depth_score += 5.0
    depth_score += coverage_ratio * 15.0

    # 3. Structured data (0-15 pts)
    structured_data = best_page.get("structured_data", [])
    structured_data_present = len(structured_data) > 0
    structured_data_score = 0.0

    if structured_data_present:
        structured_data_score = 10.0
        # Check if FAQPage, Article, HowTo or Product
        for sd in structured_data:
            sd_type = str(sd.get("@type", "")).lower()
            if any(t in sd_type for t in ["faq", "howto", "article", "product", "qa"]):
                structured_data_score = 15.0
                break
    else:
        structured_data_score = 0.0
        recommendations.append({
            "issue": "Missing Schema.org structured data on relevant page.",
            "supporting_evidence": f"Page {best_page['url']} lacks JSON-LD FAQPage, Article, or Product schema.",
            "why_it_helps": "AI search engines prioritize structured data for snippet generation and answer synthesis.",
            "suggested_action": "Add Schema.org JSON-LD markup (such as FAQPage or Article) to explicitly define answers.",
            "priority": "high",
            "estimated_effort": "low",
            "is_ai_generated": False,
            "affected_page_url": best_page["url"],
        })

    # 4. Heading structure (0-15 pts)
    headings = best_page.get("headings", {})
    h1_count = len(headings.get("h1", []))
    h2_count = len(headings.get("h2", []))
    heading_structure_score = 0.0

    if h1_count == 1:
        heading_structure_score += 7.0
    elif h1_count > 1:
        heading_structure_score += 4.0

    if h2_count >= 2:
        heading_structure_score += 8.0
    elif h2_count >= 1:
        heading_structure_score += 5.0

    # 5. Evidence quality & freshness (0-10 pts)
    evidence_quality_score = 0.0
    if snippets and len(snippets) >= 2:
        evidence_quality_score = 10.0
    elif snippets:
        evidence_quality_score = 6.0
    else:
        evidence_quality_score = 2.0

    # Calculate Total Score (0-100)
    total_score = round(
        clarity_score + depth_score + structured_data_score + heading_structure_score + evidence_quality_score,
        1,
    )
    total_score = min(100.0, max(0.0, total_score))

    # Readiness status
    if total_score >= 75.0:
        status = "ready"
    elif total_score >= 50.0:
        status = "partially_ready"
    else:
        status = "needs_improvement"

    # Missing subtopic recommendations
    if missing_subtopics:
        recommendations.append({
            "issue": f"Missing critical subtopics: {', '.join(missing_subtopics[:3])}.",
            "supporting_evidence": f"Expected coverage for {intent} intent lacked mentions of: {missing_subtopics[:3]}.",
            "why_it_helps": "AI engines favor comprehensive coverage that answers related follow-up queries.",
            "suggested_action": f"Expand the content on {best_page['url']} to explicitly address {', '.join(missing_subtopics[:3])}.",
            "priority": "medium",
            "estimated_effort": "medium",
            "is_ai_generated": False,
            "affected_page_url": best_page["url"],
        })

    if not direct_answer_found or clarity_score < 18.0:
        recommendations.append({
            "issue": "No concise, direct answer found near the top of the page.",
            "supporting_evidence": f"Page {best_page['url']} lacks an explicit 1-2 sentence direct response.",
            "why_it_helps": "Answer engines extract concise introductory sentences for AI overviews and featured snippets.",
            "suggested_action": "Add an explicit, direct answer paragraph in the first 200 words under a descriptive heading.",
            "priority": "high",
            "estimated_effort": "low",
            "is_ai_generated": False,
            "affected_page_url": best_page["url"],
        })

    confidence = 0.85 if len(snippets) > 0 else 0.70
    explanation = (
        f"Analyzed {len(crawled_pages)} crawled pages. Best matching page was '{best_page['url']}'. "
        f"Score of {total_score}/100 reflects {len(snippets)} evidence snippets, {coverage_ratio*100:.0f}% subtopic coverage, "
        f"and {'present' if structured_data_present else 'missing'} structured data."
    )

    return QuestionEvaluationResult(
        question_id=question_id,
        readiness_score=total_score,
        status=status,
        direct_answer_found=direct_answer_found,
        direct_answer_snippet=direct_answer_snippet,
        answer_clarity_score=clarity_score,
        content_depth_score=depth_score,
        structured_data_present=structured_data_present,
        structured_data_score=structured_data_score,
        heading_structure_score=heading_structure_score,
        evidence_quality_score=evidence_quality_score,
        relevant_page_urls=relevant_urls,
        evidence_snippets=snippets,
        missing_subtopics=missing_subtopics,
        confidence_level=confidence,
        explanation=explanation,
        recommendations=recommendations,
    )
