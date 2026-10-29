from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.db.session import get_db, get_session_factory
from app.models.website import Website
from app.models.crawler import CrawlJob, CrawledPage
from app.schemas.crawler import CrawlStartRequest, CrawlJobResponse, CrawledPageResponse
from app.services.crawler.crawler import AsyncCrawler

router = APIRouter(prefix="/crawler", tags=["Crawler"])


async def execute_crawl_task(job_id: str, website_id: str, canonical_url: str, max_pages: int, max_depth: int, delay: float, respect_robots: bool):
    session_factory = get_session_factory()
    db = session_factory()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if not job:
            return
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        crawler = AsyncCrawler(
            base_url=canonical_url,
            max_pages=max_pages,
            max_depth=max_depth,
            crawl_delay=delay,
            respect_robots_txt=respect_robots,
        )
        result = await crawler.crawl()

        if result.error_message and not result.pages:
            job.status = "failed"
            job.error_message = result.error_message
            job.finished_at = datetime.utcnow()
            db.commit()
            return

        # Persist crawled pages
        for p in result.pages:
            page_rec = CrawledPage(
                crawl_job_id=job.id,
                website_id=website_id,
                url=p["url"],
                canonical_url=p["canonical_url"],
                status_code=p["status_code"],
                title=p["title"],
                meta_description=p["meta_description"],
                language=p["language"],
                headings=p["headings"],
                body_text=p["body_text"],
                structured_data=p["structured_data"],
                word_count=p["word_count"],
                response_time_ms=p["response_time_ms"],
            )
            db.add(page_rec)

        job.status = "completed"
        job.pages_crawled = len(result.pages)
        job.finished_at = datetime.utcnow()

        website = db.query(Website).filter(Website.id == website_id).first()
        if website:
            website.last_crawled_at = datetime.utcnow()

        db.commit()
    except Exception as e:
        db.rollback()
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.finished_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/crawl", response_model=CrawlJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_crawl(payload: CrawlStartRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    max_pages = payload.max_pages or website.max_crawl_pages
    max_depth = payload.max_depth or 2

    job = CrawlJob(
        website_id=website.id,
        status="pending",
        max_pages=max_pages,
        max_depth=max_depth,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        execute_crawl_task,
        job.id,
        website.id,
        website.canonical_url,
        max_pages,
        max_depth,
        website.crawl_delay_seconds,
        website.robots_txt_respected,
    )

    return job


@router.get("/jobs/{job_id}", response_model=CrawlJobResponse)
def get_crawl_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Crawl job not found")
    return job


@router.get("/pages", response_model=List[CrawledPageResponse])
def list_crawled_pages(website_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(CrawledPage).filter(CrawledPage.website_id == website_id).order_by(CrawledPage.created_at.desc()).all()
