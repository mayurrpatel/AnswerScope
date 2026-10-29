from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.question import TargetQuestion
from app.models.website import Website
from app.schemas.question import (
    TargetQuestionCreate, TargetQuestionBatchCreate, TargetQuestionUpdate,
    TargetQuestionResponse, IntentClassifyRequest, IntentClassifyResponse,
)
from app.services.questions.classifier import classify_intent_rules
from app.services.ai.service import ai_service

router = APIRouter(prefix="/questions", tags=["Target Questions"])


@router.post("", response_model=TargetQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(payload: TargetQuestionCreate, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Associated website not found")

    # If intent is unknown, auto-classify intent using rules
    intent = payload.intent
    if intent == "unknown":
        rule_intent, _, _ = classify_intent_rules(payload.text)
        intent = rule_intent.value

    q = TargetQuestion(
        website_id=payload.website_id,
        text=payload.text.strip(),
        intent=intent,
        topic=payload.topic,
        target_audience=payload.target_audience,
        priority=payload.priority,
        notes=payload.notes,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.post("/batch", response_model=List[TargetQuestionResponse], status_code=status.HTTP_201_CREATED)
def create_questions_batch(payload: TargetQuestionBatchCreate, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == payload.website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Associated website not found")

    created = []
    for text in payload.questions:
        cleaned = text.strip()
        if not cleaned:
            continue
        rule_intent, _, _ = classify_intent_rules(cleaned)
        q = TargetQuestion(
            website_id=payload.website_id,
            text=cleaned,
            intent=rule_intent.value,
            topic=payload.topic,
            target_audience=payload.target_audience,
            priority="medium",
        )
        db.add(q)
        created.append(q)

    db.commit()
    for q in created:
        db.refresh(q)
    return created


@router.get("", response_model=List[TargetQuestionResponse])
def list_questions(
    website_id: Optional[str] = Query(None),
    intent: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(TargetQuestion)
    if website_id:
        query = query.filter(TargetQuestion.website_id == website_id)
    if intent:
        query = query.filter(TargetQuestion.intent == intent)
    if priority:
        query = query.filter(TargetQuestion.priority == priority)
    if search:
        query = query.filter(TargetQuestion.text.ilike(f"%{search}%"))

    return query.order_by(TargetQuestion.created_at.desc()).all()


@router.get("/{question_id}", response_model=TargetQuestionResponse)
def get_question(question_id: str, db: Session = Depends(get_db)):
    q = db.query(TargetQuestion).filter(TargetQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Target question not found")
    return q


@router.put("/{question_id}", response_model=TargetQuestionResponse)
def update_question(question_id: str, payload: TargetQuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(TargetQuestion).filter(TargetQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Target question not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(q, key, value)

    db.commit()
    db.refresh(q)
    return q


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: str, db: Session = Depends(get_db)):
    q = db.query(TargetQuestion).filter(TargetQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Target question not found")
    db.delete(q)
    db.commit()
    return None


@router.post("/classify-intent", response_model=IntentClassifyResponse)
async def classify_intent_endpoint(payload: IntentClassifyRequest):
    result = await ai_service.classify_intent(payload.text)
    return IntentClassifyResponse(
        intent=result["intent"],
        confidence=result["confidence"],
        reason=result["reason"],
    )
