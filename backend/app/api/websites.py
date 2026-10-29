from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import urlparse

from app.db.session import get_db
from app.models.website import Website
from app.schemas.website import WebsiteCreate, WebsiteUpdate, WebsiteResponse
from app.services.crawler.security import normalize_url, extract_domain

router = APIRouter(prefix="/websites", tags=["Websites"])


@router.post("", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
def create_website(payload: WebsiteCreate, db: Session = Depends(get_db)):
    try:
        norm_url = normalize_url(payload.canonical_url)
        domain = extract_domain(norm_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")

    existing = db.query(Website).filter(Website.domain == domain).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Website with domain '{domain}' already exists (ID: {existing.id})",
        )

    # Automatically add domain and name variations to brand aliases if empty
    aliases = list(payload.brand_aliases)
    if payload.name not in aliases:
        aliases.append(payload.name)
    if domain not in aliases:
        aliases.append(domain)

    website = Website(
        name=payload.name,
        canonical_url=norm_url,
        domain=domain,
        brand_aliases=aliases,
        competitor_domains=payload.competitor_domains,
        robots_txt_respected=payload.robots_txt_respected,
        max_crawl_pages=payload.max_crawl_pages,
        crawl_delay_seconds=payload.crawl_delay_seconds,
    )
    db.add(website)
    db.commit()
    db.refresh(website)
    return website


@router.get("", response_model=List[WebsiteResponse])
def list_websites(db: Session = Depends(get_db)):
    return db.query(Website).order_by(Website.created_at.desc()).all()


@router.get("/{website_id}", response_model=WebsiteResponse)
def get_website(website_id: str, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    return website


@router.put("/{website_id}", response_model=WebsiteResponse)
def update_website(website_id: str, payload: WebsiteUpdate, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "canonical_url" in update_data:
        try:
            norm_url = normalize_url(update_data["canonical_url"])
            domain = extract_domain(norm_url)
            website.canonical_url = norm_url
            website.domain = domain
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")
        del update_data["canonical_url"]

    for key, value in update_data.items():
        setattr(website, key, value)

    db.commit()
    db.refresh(website)
    return website


@router.delete("/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_website(website_id: str, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    db.delete(website)
    db.commit()
    return None
