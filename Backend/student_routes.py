from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models, schemas
from database import get_db
from dependencies import get_current_active_user

router = APIRouter(prefix="/student", tags=["Student Portal"])

@router.get("/me", response_model=schemas.Student)
def get_student_profile(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.get("/classes", response_model=List[schemas.ClassWithStatus])
def get_enrolled_classes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student.id).all()
    class_ids = [e.class_id for e in enrollments]
    
    classes = db.query(models.Class).filter(models.Class.id.in_(class_ids)).all()
    
    res = []
    for cls in classes:
        # Check if feedback submitted
        fb = db.query(models.Feedback).filter(
            models.Feedback.student_id == current_user.id,
            models.Feedback.class_id == cls.id
        ).first()
        
        c_schema = schemas.ClassWithStatus.from_orm(cls)
        c_schema.feedback_submitted = fb is not None
        res.append(c_schema)
        
    return res

@router.get("/attendance", response_model=List[schemas.AttendanceDetailOut])
def get_attendance_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        return []
    
    return db.query(models.AttendanceDetail).filter(models.AttendanceDetail.student_id == student.id).all()

@router.get("/dashboard")
def get_student_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Enrollments
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student.id).all()
    class_ids = [e.class_id for e in enrollments]

    # Recent Materials
    materials = db.query(models.StudyMaterial).filter(models.StudyMaterial.class_id.in_(class_ids)).order_by(models.StudyMaterial.timestamp.desc()).limit(5).all()
    
    # Upcoming Assignments
    assignments = db.query(models.Assignment).filter(models.Assignment.class_id.in_(class_ids)).order_by(models.Assignment.deadline.asc()).all()
    
    # Announcements
    announcements = db.query(models.Announcement).filter(models.Announcement.class_id.in_(class_ids)).order_by(models.Announcement.timestamp.desc()).limit(10).all()

    return {
        "profile": student,
        "classes": [e.class_ for e in enrollments],
        "classes_count": len(class_ids),
        "recent_materials": materials,
        "upcoming_assignments": assignments,
        "announcements": announcements
    }
