from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.db.session import get_db
from app.models.website import Website
from app.models.question import TargetQuestion
from app.models.crawler import CrawlJob, CrawledPage
from app.models.audit import AnswerReadinessAudit, QuestionAuditResult, AuditRecommendation
from app.schemas.audit import AuditStartRequest, AuditResponse, QuestionAuditResultResponse
from app.services.answer_readiness.evaluator import evaluate_question_readiness

router = APIRouter(prefix="/audits", tags=["Answer-Readiness Audits"])


@router.post("/run", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def run_audit(payload: AuditStartRequest, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    # Fetch crawled pages
    if payload.crawl_job_id:
        pages = db.query(CrawledPage).filter(CrawledPage.crawl_job_id == payload.crawl_job_id).all()
        crawl_job_id = payload.crawl_job_id
    else:
        # Latest completed crawl job
        latest_job = (
            db.query(CrawlJob)
            .filter(CrawlJob.website_id == website.id, CrawlJob.status == "completed")
            .order_by(CrawlJob.finished_at.desc())
            .first()
        )
        if not latest_job:
            raise HTTPException(
                status_code=400,
                detail="No completed crawl found for this website. Please run a crawl first.",
            )
        pages = db.query(CrawledPage).filter(CrawledPage.crawl_job_id == latest_job.id).all()
        crawl_job_id = latest_job.id

    if not pages:
        raise HTTPException(status_code=400, detail="Crawl contains 0 accessible pages to audit.")

    # Convert pages to dictionaries for evaluator
    crawled_pages_data = [
        {
            "url": p.url,
            "title": p.title,
            "meta_description": p.meta_description,
            "headings": p.headings or {},
            "body_text": p.body_text or "",
            "structured_data": p.structured_data or [],
            "word_count": p.word_count,
        }
        for p in pages
    ]

    # Fetch target questions
    q_query = db.query(TargetQuestion).filter(TargetQuestion.website_id == website.id)
    if payload.question_ids:
        q_query = q_query.filter(TargetQuestion.id.in_(payload.question_ids))
    questions = q_query.all()

    if not questions:
        raise HTTPException(status_code=400, detail="No target questions available to audit.")

    audit = AnswerReadinessAudit(
        website_id=website.id,
        crawl_job_id=crawl_job_id,
        status="running",
        started_at=datetime.utcnow(),
        scoring_methodology={
            "direct_answer_max": 30,
            "content_depth_max": 30,
            "structured_data_max": 15,
            "heading_structure_max": 15,
            "evidence_quality_max": 10,
            "total_scale": 100,
            "confidence_threshold": 0.85,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    total_score = 0.0
    answered = 0
    partially = 0
    unanswered = 0
    total_conf = 0.0

    all_recommendations = []

    for q in questions:
        res = evaluate_question_readiness(
            question_id=q.id,
            question_text=q.text,
            intent=q.intent,
            crawled_pages=crawled_pages_data,
        )

        total_score += res.readiness_score
        total_conf += res.confidence_level

        if res.status == "ready":
            answered += 1
        elif res.status == "partially_ready":
            partially += 1
        else:
            unanswered += 1

        db_q_res = QuestionAuditResult(
            audit_id=audit.id,
            question_id=q.id,
            readiness_score=res.readiness_score,
            status=res.status,
            direct_answer_found=res.direct_answer_found,
            direct_answer_snippet=res.direct_answer_snippet,
            answer_clarity_score=res.answer_clarity_score,
            content_depth_score=res.content_depth_score,
            structured_data_present=res.structured_data_present,
            structured_data_score=res.structured_data_score,
            heading_structure_score=res.heading_structure_score,
            evidence_quality_score=res.evidence_quality_score,
            relevant_page_urls=res.relevant_page_urls,
            evidence_snippets=res.evidence_snippets,
            missing_subtopics=res.missing_subtopics,
            confidence_level=res.confidence_level,
            explanation=res.explanation,
        )
        db.add(db_q_res)

        for rec in res.recommendations:
            db_rec = AuditRecommendation(
                audit_id=audit.id,
                question_id=q.id,
                affected_page_url=rec.get("affected_page_url"),
                issue=rec["issue"],
                supporting_evidence=rec["supporting_evidence"],
                why_it_helps=rec["why_it_helps"],
                suggested_action=rec["suggested_action"],
                priority=rec.get("priority", "medium"),
                estimated_effort=rec.get("estimated_effort", "medium"),
                is_ai_generated=rec.get("is_ai_generated", False),
            )
            db.add(db_rec)
            all_recommendations.append(db_rec)

    q_count = len(questions)
    overall_score = round(total_score / q_count, 1) if q_count else 0.0
    overall_conf = round(total_conf / q_count, 2) if q_count else 0.0

    if overall_score >= 80:
        level = "excellent"
    elif overall_score >= 65:
        level = "good"
    elif overall_score >= 50:
        level = "fair"
    elif overall_score >= 30:
        level = "poor"
    else:
        level = "missing"

    audit.status = "completed"
    audit.overall_score = overall_score
    audit.readiness_level = level
    audit.questions_analyzed = q_count
    audit.answered_count = answered
    audit.partially_answered_count = partially
    audit.unanswered_count = unanswered
    audit.confidence_score = overall_conf
    audit.finished_at = datetime.utcnow()

    db.commit()
    db.refresh(audit)
    return audit


@router.get("", response_model=List[AuditResponse])
def list_audits(website_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(AnswerReadinessAudit)
    if website_id:
        query = query.filter(AnswerReadinessAudit.website_id == website_id)
    return query.order_by(AnswerReadinessAudit.created_at.desc()).all()


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AnswerReadinessAudit).filter(AnswerReadinessAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    # Enrich question results with question text and intent
    for qr in audit.question_results:
        if qr.question:
            qr.question_text = qr.question.text
            qr.question_intent = qr.question.intent

    return audit
