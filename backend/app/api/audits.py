from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional

from app.db.session import get_db
from app.models.website import Website
from app.models.question import TargetQuestion
from app.models.crawler import CrawlJob, CrawledPage
from app.models.audit import AnswerReadinessAudit, QuestionAuditResult, AuditRecommendation
from app.schemas.audit import AuditStartRequest, QuickAuditRequest, AuditResponse, QuestionAuditResultResponse
from app.services.answer_readiness.evaluator import evaluate_question_readiness
from app.services.crawler.crawler import AsyncCrawler
from app.services.crawler.security import normalize_url, extract_domain, validate_url_security
from app.services.questions.classifier import classify_intent_rules

router = APIRouter(prefix="/audits", tags=["Answer-Readiness Audits"])


def _execute_audit_evaluation(
    db: Session,
    website: Website,
    crawl_job_id: str,
    question_ids: Optional[List[str]] = None,
) -> AnswerReadinessAudit:
    """Internal helper to evaluate question readiness against crawled pages."""
    pages = db.query(CrawledPage).filter(CrawledPage.crawl_job_id == crawl_job_id).all()
    if not pages:
        raise HTTPException(status_code=400, detail="Crawl contains 0 accessible pages to audit.")

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
        if p.status_code == 200  # Only evaluate successfully retrieved pages
    ]

    if not crawled_pages_data:
        raise HTTPException(
            status_code=400,
            detail="None of the crawled pages were successfully retrieved with status 200.",
        )

    q_query = db.query(TargetQuestion).filter(TargetQuestion.website_id == website.id)
    if question_ids:
        q_query = q_query.filter(TargetQuestion.id.in_(question_ids))
    questions = q_query.all()

    if not questions:
        raise HTTPException(status_code=400, detail="No target questions available to audit.")

    audit = AnswerReadinessAudit(
        website_id=website.id,
        crawl_job_id=crawl_job_id,
        status="running",
        started_at=datetime.now(timezone.utc),
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
            suggested_headings=res.suggested_headings,
            suggested_schema_types=res.suggested_schema_types,
            owner_confirmation_needed=res.owner_confirmation_needed,
            confidence_level=res.confidence_level,
            explanation=res.explanation,
        )
        db.add(db_q_res)

        for rec in res.recommendations:
            db_rec = AuditRecommendation(
                audit_id=audit.id,
                question_id=q.id,
                affected_page_url=rec.get("affected_page_url"),
                target_query=rec.get("target_query", q.text),
                identified_gap=rec.get("identified_gap"),
                issue=rec["issue"],
                supporting_evidence=rec["supporting_evidence"],
                why_it_helps=rec["why_it_helps"],
                suggested_action=rec["suggested_action"],
                priority=rec.get("priority", "medium"),
                estimated_effort=rec.get("estimated_effort", "medium"),
                is_ai_generated=rec.get("is_ai_generated", False),
                owner_confirmation_note=rec.get("owner_confirmation_note"),
            )
            db.add(db_rec)

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
    audit.finished_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(audit)
    return audit


@router.post("/run", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def run_audit(payload: AuditStartRequest, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    if payload.crawl_job_id:
        crawl_job_id = payload.crawl_job_id
    else:
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
        crawl_job_id = latest_job.id

    return _execute_audit_evaluation(db, website, crawl_job_id, payload.question_ids)


@router.post("/quick-run", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def quick_run_audit(payload: QuickAuditRequest, db: Session = Depends(get_db)):
    """
    Unified end-to-end audit workflow:
    Accepts website URL, description, audience, questions, and max pages.
    Validates inputs, crawls accessible pages, performs answer-quality audit,
    and returns complete findings immediately.
    """
    clean_questions = [q.strip() for q in payload.questions if q.strip()]
    if not clean_questions:
        raise HTTPException(status_code=400, detail="At least one target search query or question is required.")

    try:
        norm_url = normalize_url(payload.url)
        domain = extract_domain(norm_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")

    if not validate_url_security(norm_url):
        raise HTTPException(status_code=400, detail=f"Security check failed: Destination '{norm_url}' is not permitted.")

    # 1. Website lookup or registration
    website = db.query(Website).filter(Website.domain == domain).first()
    site_name = payload.name or domain
    if not website:
        website = Website(
            name=site_name,
            canonical_url=norm_url,
            domain=domain,
            description=payload.description,
            target_audience=payload.target_audience,
            brand_aliases=[site_name, domain],
            robots_txt_respected=payload.respect_robots_txt,
            max_crawl_pages=payload.max_pages,
        )
        db.add(website)
        db.commit()
        db.refresh(website)
    else:
        if payload.description:
            website.description = payload.description
        if payload.target_audience:
            website.target_audience = payload.target_audience
        website.max_crawl_pages = payload.max_pages
        db.commit()

    # 2. Register Target Questions
    existing_q_texts = {q.text.lower().strip() for q in db.query(TargetQuestion).filter(TargetQuestion.website_id == website.id).all()}
    created_q_ids = []
    for q_text in clean_questions:
        if q_text.lower() not in existing_q_texts:
            intent, conf, reasoning = classify_intent_rules(q_text)
            new_q = TargetQuestion(
                website_id=website.id,
                text=q_text,
                intent=intent.value,
                priority="high",
            )
            db.add(new_q)
            db.commit()
            db.refresh(new_q)
            created_q_ids.append(new_q.id)
            existing_q_texts.add(q_text.lower())
        else:
            matching = db.query(TargetQuestion).filter(
                TargetQuestion.website_id == website.id,
                TargetQuestion.text.ilike(q_text),
            ).first()
            if matching:
                created_q_ids.append(matching.id)

    all_q_ids = [q.id for q in db.query(TargetQuestion).filter(TargetQuestion.website_id == website.id).all()]

    # 3. Perform Crawl
    crawler = AsyncCrawler(
        base_url=website.canonical_url,
        max_pages=payload.max_pages,
        max_depth=2,
        crawl_delay=0.3,
        respect_robots_txt=payload.respect_robots_txt,
    )
    crawl_result = await crawler.crawl()

    crawl_job = CrawlJob(
        website_id=website.id,
        status="completed" if crawl_result.pages else "failed",
        pages_crawled=len(crawl_result.pages),
        max_pages=payload.max_pages,
        max_depth=2,
        error_message=crawl_result.error_message,
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
    )
    db.add(crawl_job)
    db.commit()
    db.refresh(crawl_job)

    if not crawl_result.pages:
        err = crawl_result.error_message or "Failed to retrieve any accessible HTML pages from the submitted URL."
        raise HTTPException(status_code=400, detail=f"Crawl failure: {err}")

    for p in crawl_result.pages:
        page_rec = CrawledPage(
            crawl_job_id=crawl_job.id,
            website_id=website.id,
            url=p["url"],
            canonical_url=p.get("canonical_url"),
            status_code=p.get("status_code", 200),
            title=p.get("title"),
            meta_description=p.get("meta_description"),
            language=p.get("language"),
            headings=p.get("headings", {}),
            body_text=p.get("body_text", ""),
            structured_data=p.get("structured_data", []),
            word_count=p.get("word_count", 0),
            response_time_ms=p.get("response_time_ms", 0.0),
        )
        db.add(page_rec)

    website.last_crawled_at = datetime.now(timezone.utc)
    db.commit()

    # 4. Perform Answer-Readiness Audit
    audit = _execute_audit_evaluation(db, website, crawl_job.id, all_q_ids)
    return audit


@router.post("/seed-sample", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def seed_sample_audit(db: Session = Depends(get_db)):
    """
    Seeds an illustrative offline sample audit for NexusFlow (sample-site.nexusflow.io).
    Allows full offline evaluation of all answer readiness, query explorer,
    and report export features.
    """
    sample_request = QuickAuditRequest(
        url="https://sample-site.nexusflow.io/",
        name="NexusFlow Workflow Automation",
        description="Intelligent enterprise workflow automation platform orchestrating APIs, document AI, and event routing.",
        target_audience="Operations Teams, Engineering Leads, Product Managers",
        questions=[
            "What services does this company provide?",
            "How much does this service cost?",
            "How does this product work?",
            "What are the benefits of this service?",
            "How does this company compare with alternatives?",
        ],
        max_pages=15,
        respect_robots_txt=True,
    )
    return await quick_run_audit(sample_request, db)


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
