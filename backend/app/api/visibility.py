from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from collections import Counter

from app.db.session import get_db
from app.models.website import Website
from app.models.question import TargetQuestion
from app.models.visibility import VisibilityJob, VisibilityObservation, VisibilityCitation
from app.schemas.visibility import (
    VisibilityStartRequest, VisibilityJobResponse, ProviderStatusResponse,
)
from app.services.providers.registry import get_provider, get_provider_statuses

router = APIRouter(prefix="/visibility", tags=["AI Search Visibility"])


@router.get("/providers", response_model=List[ProviderStatusResponse])
def list_providers():
    return get_provider_statuses()


@router.post("/run", response_model=VisibilityJobResponse, status_code=status.HTTP_201_CREATED)
async def run_visibility_job(payload: VisibilityStartRequest, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    provider_name = payload.provider_name
    if payload.use_test_fixture:
        provider_name = "test_fixture"

    try:
        provider = get_provider(provider_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not provider.is_configured and not payload.use_test_fixture:
        raise HTTPException(
            status_code=400,
            detail=f"Provider '{provider_name}' is not configured with an API key. "
                   f"Set the appropriate environment variable or select 'Use Test Fixture' for offline evaluation.",
        )

    # Fetch questions
    q_query = db.query(TargetQuestion).filter(TargetQuestion.website_id == website.id)
    if payload.question_ids:
        q_query = q_query.filter(TargetQuestion.id.in_(payload.question_ids))
    questions = q_query.all()

    if not questions:
        raise HTTPException(status_code=400, detail="No target questions available to query.")

    job = VisibilityJob(
        website_id=website.id,
        provider_name=provider_name,
        status="running",
        is_live_provider=(provider_name != "test_fixture"),
        total_questions=len(questions),
        started_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    brand_mentions_count = 0
    competitor_mentions_count = 0
    competitor_without_brand = 0
    all_citations_count = 0
    domain_counter: Counter = Counter()

    for q in questions:
        query_res = await provider.query(
            query=q.text,
            brand_domain=website.domain,
            brand_aliases=website.brand_aliases or [],
            competitor_domains=website.competitor_domains or [],
        )

        has_brand = len(query_res.brand_mentions) > 0
        has_comp = len(query_res.competitor_mentions) > 0

        if has_brand:
            brand_mentions_count += 1
        if has_comp:
            competitor_mentions_count += 1
        if has_comp and not has_brand:
            competitor_without_brand += 1

        obs = VisibilityObservation(
            visibility_job_id=job.id,
            question_id=q.id,
            query_text=q.text,
            provider_name=query_res.provider_name,
            model_name=query_res.model_name,
            raw_response_snippet=query_res.raw_response,
            brand_mentioned=has_brand,
            brand_mention_snippets=query_res.brand_mentions,
            competitor_mentions=query_res.competitor_mentions,
            retrieved_at=query_res.retrieved_at,
            is_simulated_fixture=query_res.is_simulated_fixture,
        )
        db.add(obs)
        db.flush()

        for cit in query_res.citations:
            all_citations_count += 1
            domain_counter[cit.domain] += 1
            matches_brand = cit.domain.lower() == website.domain.lower()
            matches_comp = any(c.lower() in cit.domain.lower() for c in (website.competitor_domains or []))

            db_cit = VisibilityCitation(
                observation_id=obs.id,
                cited_url=cit.url,
                cited_domain=cit.domain,
                title=cit.title,
                snippet=cit.snippet,
                position=cit.position,
                matches_brand_domain=matches_brand,
                matches_competitor_domain=matches_comp,
            )
            db.add(db_cit)

    total_q = len(questions)
    job.status = "completed"
    job.questions_completed = total_q
    job.brand_mentions_count = brand_mentions_count
    # Documented denominator: brand_mentions_count / total_questions
    job.brand_mention_rate = round((brand_mentions_count / total_q) * 100, 1) if total_q else 0.0
    job.citations_count = all_citations_count
    job.competitor_mentions_count = competitor_mentions_count
    job.questions_with_competitor_without_brand = competitor_without_brand
    job.domain_distribution = dict(domain_counter.most_common(15))
    job.finished_at = datetime.utcnow()

    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=List[VisibilityJobResponse])
def list_visibility_jobs(website_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(VisibilityJob)
    if website_id:
        query = query.filter(VisibilityJob.website_id == website_id)
    return query.order_by(VisibilityJob.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=VisibilityJobResponse)
def get_visibility_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(VisibilityJob).filter(VisibilityJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Visibility job not found")

    for obs in job.observations:
        if obs.question:
            obs.question_text = obs.question.text

    return job
