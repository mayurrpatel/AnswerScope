import json
import logging
import httpx
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.services.questions.classifier import classify_intent_rules

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.api_key = settings.openai_api_key or settings.gemini_api_key
        self.model = settings.ai_model_name

    @property
    def is_ai_available(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def classify_intent(self, question_text: str) -> Dict[str, Any]:
        """Classifies intent with AI if configured, otherwise uses deterministic heuristics."""
        # Always run deterministic baseline
        det_intent, det_conf, det_reason = classify_intent_rules(question_text)

        if not self.is_ai_available:
            return {
                "intent": det_intent.value,
                "confidence": det_conf,
                "reason": f"[Rule-Based] {det_reason}",
                "is_ai": False,
            }

        prompt = f"""You are an SEO search intent analyzer. Classify the user question into one of:
- informational
- commercial_investigation
- transactional
- navigational
- unknown

Question: "{question_text}"

Respond ONLY with valid JSON in this exact shape:
{{"intent": "...", "confidence": 0.95, "reason": "..."}}"""

        try:
            # Use OpenAI compatible endpoint
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.0,
                        "response_format": {"type": "json_object"},
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return {
                        "intent": parsed.get("intent", det_intent.value),
                        "confidence": float(parsed.get("confidence", det_conf)),
                        "reason": f"[AI Evaluated] {parsed.get('reason', det_reason)}",
                        "is_ai": True,
                    }
        except Exception as e:
            logger.warning(f"AI classification failed, falling back to deterministic: {e}")

        return {
            "intent": det_intent.value,
            "confidence": det_conf,
            "reason": f"[Rule-Based Fallback] {det_reason}",
            "is_ai": False,
        }

    async def summarize_audit(
        self,
        website_domain: str,
        overall_score: float,
        readiness_level: str,
        answered_count: int,
        unanswered_count: int,
        recommendations: List[Dict[str, Any]],
    ) -> str:
        """Generates executive summary for audit report."""
        if not self.is_ai_available:
            rec_texts = "; ".join([r.get("issue", "") for r in recommendations[:3]])
            return (
                f"Website '{website_domain}' achieved an Answer-Readiness Score of {overall_score:.1f}/100 ({readiness_level.upper()}). "
                f"Out of tracked questions, {answered_count} have direct verifiable answers, while {unanswered_count} require new content or structure. "
                f"Key priority focus: {rec_texts or 'Maintain content freshness'}."
            )

        prompt = f"""Provide a concise 3-sentence executive summary of an AI Search Answer-Readiness Audit for {website_domain}.
Overall Score: {overall_score}/100 ({readiness_level})
Answered: {answered_count}, Unanswered: {unanswered_count}
Top issues: {[r.get('issue') for r in recommendations[:3]]}
Do not hallucinate external rankings. Focus on content answerability and structure."""

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning(f"AI summary failed, using deterministic summary: {e}")

        return (
            f"Audit Summary for {website_domain}: Score {overall_score:.1f}/100 ({readiness_level}). "
            f"{answered_count} answered questions, {unanswered_count} unanswered questions."
        )


ai_service = AIService()
