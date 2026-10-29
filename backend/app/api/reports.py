from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.models.website import Website
from app.models.audit import AnswerReadinessAudit
from app.models.visibility import VisibilityJob
from app.models.competitor import CompetitorGapFinding
from app.schemas.report import ReportSummaryResponse
from app.schemas.audit import AuditResponse
from app.schemas.visibility import VisibilityJobResponse
from app.schemas.competitor import CompetitorFindingResponse
from app.services.reports.exporter import export_audit_to_csv, export_audit_to_pdf

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])


@router.get("/summary/{website_id}", response_model=ReportSummaryResponse)
def get_report_summary(website_id: str, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    latest_audit = (
        db.query(AnswerReadinessAudit)
        .filter(AnswerReadinessAudit.website_id == website.id)
        .order_by(AnswerReadinessAudit.created_at.desc())
        .first()
    )

    latest_vis = (
        db.query(VisibilityJob)
        .filter(VisibilityJob.website_id == website.id)
        .order_by(VisibilityJob.created_at.desc())
        .first()
    )

    gaps = (
        db.query(CompetitorGapFinding)
        .filter(CompetitorGapFinding.website_id == website.id)
        .order_by(CompetitorGapFinding.created_at.desc())
        .limit(10)
        .all()
    )
    for g in gaps:
        if g.question:
            g.question_text = g.question.text

    top_recs = []
    if latest_audit and latest_audit.recommendations:
        top_recs = [
            {
                "issue": r.issue,
                "suggested_action": r.suggested_action,
                "priority": r.priority,
                "estimated_effort": r.estimated_effort,
            }
            for r in latest_audit.recommendations[:5]
        ]

    limitations = [
        "Readiness scores assess content clarity and structured metadata on crawled pages, not guaranteed search engine rankings.",
        "Visibility metrics measure recorded observations from specified providers under current query terms and cannot represent every user.",
    ]
    if latest_vis and not latest_vis.is_live_provider:
        limitations.append("Latest visibility results reflect synthetic test fixtures rather than live external provider queries.")

    return ReportSummaryResponse(
        website_id=website.id,
        website_name=website.name,
        canonical_url=website.canonical_url,
        generated_at=datetime.utcnow(),
        latest_audit=AuditResponse.model_validate(latest_audit) if latest_audit else None,
        latest_visibility=VisibilityJobResponse.model_validate(latest_vis) if latest_vis else None,
        competitor_gaps=[CompetitorFindingResponse.model_validate(g) for g in gaps],
        top_recommendations=top_recs,
        data_limitations=limitations,
    )


@router.get("/export/csv/{audit_id}")
def export_csv_endpoint(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AnswerReadinessAudit).filter(AnswerReadinessAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    q_results = []
    for qr in audit.question_results:
        q_text = qr.question.text if qr.question else "Unknown Question"
        q_intent = qr.question.intent if qr.question else "unknown"
        q_results.append({
            "question_text": q_text,
            "question_intent": q_intent,
            "readiness_score": qr.readiness_score,
            "status": qr.status,
            "direct_answer_found": qr.direct_answer_found,
            "direct_answer_snippet": qr.direct_answer_snippet,
            "structured_data_present": qr.structured_data_present,
            "relevant_page_urls": qr.relevant_page_urls or [],
            "missing_subtopics": qr.missing_subtopics or [],
            "confidence_level": qr.confidence_level,
        })

    csv_data = export_audit_to_csv(
        website_name=audit.website.name,
        website_domain=audit.website.domain,
        overall_score=audit.overall_score,
        readiness_level=audit.readiness_level,
        question_results=q_results,
    )

    filename = f"audit-{audit.website.domain}-{audit.id[:8]}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf/{audit_id}")
def export_pdf_endpoint(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AnswerReadinessAudit).filter(AnswerReadinessAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    q_results = []
    for qr in audit.question_results:
        q_text = qr.question.text if qr.question else "Unknown Question"
        q_intent = qr.question.intent if qr.question else "unknown"
        q_results.append({
            "question_text": q_text,
            "question_intent": q_intent,
            "readiness_score": qr.readiness_score,
            "status": qr.status,
            "direct_answer_snippet": qr.direct_answer_snippet,
        })

    recs = [
        {
            "priority": r.priority,
            "issue": r.issue,
            "suggested_action": r.suggested_action,
            "why_it_helps": r.why_it_helps,
        }
        for r in audit.recommendations
    ]

    pdf_bytes = export_audit_to_pdf(
        website_name=audit.website.name,
        website_domain=audit.website.domain,
        overall_score=audit.overall_score,
        readiness_level=audit.readiness_level,
        question_results=q_results,
        recommendations=recs,
    )

    filename = f"audit-{audit.website.domain}-{audit.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
