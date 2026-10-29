from typing import List, Dict, Any
from app.services.answer_readiness.evaluator import evaluate_question_readiness
from app.services.answer_readiness.matcher import tokenize


class CompetitorGapResult:
    def __init__(
        self,
        question_id: str,
        question_text: str,
        competitor_domain: str,
        user_score: float,
        competitor_score: float,
        gap_type: str,
        competitor_urls: List[str],
        missing_subtopics: List[str],
        observed_facts: str,
        derived_findings: str,
        ai_suggestions: str | None,
        priority: str,
        estimated_effort: str,
    ):
        self.question_id = question_id
        self.question_text = question_text
        self.competitor_domain = competitor_domain
        self.user_score = user_score
        self.competitor_score = competitor_score
        self.gap_type = gap_type
        self.competitor_urls = competitor_urls
        self.missing_subtopics = missing_subtopics
        self.observed_facts = observed_facts
        self.derived_findings = derived_findings
        self.ai_suggestions = ai_suggestions
        self.priority = priority
        self.estimated_effort = estimated_effort


def analyze_competitor_gaps(
    question_id: str,
    question_text: str,
    intent: str,
    user_pages: List[Dict[str, Any]],
    competitor_domain: str,
    competitor_pages: List[Dict[str, Any]],
) -> CompetitorGapResult:
    """
    Compares user site content readiness against competitor site content readiness.
    Separates:
      1. Observed facts
      2. Derived findings
      3. AI / recommended suggestions
    """
    user_eval = evaluate_question_readiness(question_id, question_text, intent, user_pages)
    comp_eval = evaluate_question_readiness(question_id, question_text, intent, competitor_pages)

    user_score = user_eval.readiness_score
    comp_score = comp_eval.readiness_score

    # Determine subtopics present in competitor pages but missing in user site
    user_tokens = set()
    for p in user_pages:
        user_tokens.update(tokenize(p.get("body_text", "")))

    comp_tokens = set()
    for p in competitor_pages:
        comp_tokens.update(tokenize(p.get("body_text", "")))

    # Tokens relevant to question in competitor but missing in user
    q_tokens = set(tokenize(question_text))
    comp_relevant = comp_tokens.intersection(q_tokens)
    subtopics_gap = list(comp_tokens.difference(user_tokens))
    # Filter for meaningful subtopic terms
    meaningful_gaps = [w for w in subtopics_gap if len(w) > 4][:5]

    # Categorize gap
    if user_score < 40 and comp_score >= 60:
        gap_type = "unanswered_by_user"
        priority = "critical"
        effort = "medium"
    elif comp_score > user_score + 20:
        gap_type = "competitor_superior"
        priority = "high"
        effort = "medium"
    elif meaningful_gaps:
        gap_type = "subtopic_missing"
        priority = "medium"
        effort = "low"
    else:
        gap_type = "comparable_coverage"
        priority = "low"
        effort = "low"

    observed_facts = (
        f"OBSERVED FACTS: User site readiness score: {user_score:.1f}/100 based on {len(user_eval.relevant_page_urls)} relevant page(s). "
        f"Competitor '{competitor_domain}' readiness score: {comp_score:.1f}/100 across {len(comp_eval.relevant_page_urls)} relevant page(s). "
        f"Competitor structured data: {'Detected' if comp_eval.structured_data_present else 'None'}. "
        f"User structured data: {'Detected' if user_eval.structured_data_present else 'None'}."
    )

    derived_findings = (
        f"DERIVED FINDINGS: Gap classification is '{gap_type}'. "
        f"Score differential is {comp_score - user_score:+.1f} points. "
        + (f"Competitor content covers terminology missing from user pages: {', '.join(meaningful_gaps)}." if meaningful_gaps else "No major vocabulary gaps identified.")
    )

    ai_suggestions = (
        f"RECOMMENDED NEXT ACTION: "
        + (f"Develop a targeted answer page matching competitor's depth on {competitor_domain} ({comp_eval.relevant_page_urls[0] if comp_eval.relevant_page_urls else 'competitor site'}). " if gap_type in ('unanswered_by_user', 'competitor_superior') else "Enhance existing page content with clearer introductory summaries and structured FAQ markup.")
    )

    return CompetitorGapResult(
        question_id=question_id,
        question_text=question_text,
        competitor_domain=competitor_domain,
        user_score=user_score,
        competitor_score=comp_score,
        gap_type=gap_type,
        competitor_urls=comp_eval.relevant_page_urls,
        missing_subtopics=meaningful_gaps,
        observed_facts=observed_facts,
        derived_findings=derived_findings,
        ai_suggestions=ai_suggestions,
        priority=priority,
        estimated_effort=effort,
    )
