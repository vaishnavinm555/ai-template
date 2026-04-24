from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, uuid
from datetime import datetime, date as date_type

import models, schemas
from database import get_db
from dependencies import get_current_active_user

router = APIRouter(tags=["Interaction Layer"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ── Materials ──────────────────────────────────────────────────────────

@router.post("/materials", response_model=schemas.StudyMaterial)
async def upload_material(
    class_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    material = models.StudyMaterial(
        class_id=class_id,
        title=title,
        file_path=file_path,
        file_url=f"/uploads/{file_name}",
        uploaded_by=current_user.id
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.get("/class/{id}/materials", response_model=List[schemas.StudyMaterial])
def get_class_materials(id: int, db: Session = Depends(get_db)):
    return db.query(models.StudyMaterial).filter(models.StudyMaterial.class_id == id).all()

# ── Assignments ──────────────────────────────────────────────────────

@router.post("/assignments", response_model=schemas.Assignment)
def create_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    db_assignment = models.Assignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.post("/submissions", response_model=schemas.Submission)
async def submit_assignment(
    assignment_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Only registered students can submit")

    # Prevent duplicate
    existing = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already submitted")

    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"sub_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    submission = models.Submission(
        assignment_id=assignment_id,
        student_id=student.id,
        file_url=f"/uploads/{file_name}"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

# ── Announcements & Polls ──────────────────────────────────────────

@router.post("/announcements", response_model=schemas.Announcement)
def create_announcement(
    data: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    db_ann = models.Announcement(
        class_id=data.class_id,
        title=data.title,
        message=data.content,
        type=data.type,
        created_by_id=current_user.id
    )
    db.add(db_ann)
    db.flush()

    if data.type == "poll" and data.poll:
        db_poll = models.Poll(announcement_id=db_ann.id, question=data.poll.question)
        db.add(db_poll)
        db.flush()
        for opt in data.poll.options:
            db.add(models.PollOption(poll_id=db_poll.id, option_text=opt.option_text))

    db.commit()
    db.refresh(db_ann)
    return db_ann

@router.post("/poll-responses", response_model=schemas.PollResponse)
def respond_to_poll(
    data: schemas.PollResponseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Only students can vote")

    # Prevent duplicate
    existing = db.query(models.PollResponse).filter(
        models.PollResponse.poll_id == data.poll_id,
        models.PollResponse.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already voted")

    response = models.PollResponse(
        poll_id=data.poll_id,
        student_id=student.id,
        selected_option_id=data.selected_option_id,
        comment=data.comment
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response
