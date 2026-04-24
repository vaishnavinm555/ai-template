"""
Faculty Portal Routes — strict role-based access
All attendance uses the session model: AttendanceSession + AttendanceDetail
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, uuid
from datetime import date as date_type, datetime

import models, schemas
from database import get_db
from dependencies import get_current_active_user

router = APIRouter()

UPLOAD_DIR = "uploads"


# ── helpers ──────────────────────────────────────────────────────────────────

def _assert_class_access(class_id: int, user: models.User, db: Session):
    """Raise 403 if faculty is NOT assigned to this class (admins always pass)."""
    if user.role == "admin":
        return
    assigned = db.query(models.ClassFaculty).filter(
        models.ClassFaculty.class_id == class_id,
        models.ClassFaculty.faculty_id == user.id
    ).first()
    if not assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to this class")


def _enrolled_students(class_id: int, db: Session) -> List[models.User]:
    ids = [e.student_id for e in db.query(models.Enrollment).filter(
        models.Enrollment.class_id == class_id
    ).all()]
    return db.query(models.User).filter(models.User.id.in_(ids)).all()


# ─────────────────────────────────────────────────────────────────────────────
# FACULTY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/faculty/classes", response_model=List[schemas.Class])
def get_my_classes(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Faculty: only their assigned classes. Admin: all classes."""
    if current_user.role == "admin":
        return db.query(models.Class).all()
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Forbidden")
    class_ids = [a.class_id for a in db.query(models.ClassFaculty).filter(
        models.ClassFaculty.faculty_id == current_user.id
    ).all()]
    return db.query(models.Class).filter(models.Class.id.in_(class_ids)).all()


@router.get("/class/{class_id}/students", response_model=List[schemas.User])
def get_class_students(
    class_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)
    return _enrolled_students(class_id, db)


@router.get("/class/{class_id}/announcements", response_model=List[schemas.Announcement])
def get_announcements(
    class_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)
    return db.query(models.Announcement).filter(
        models.Announcement.class_id == class_id
    ).order_by(models.Announcement.timestamp.desc()).all()


@router.get("/class/{class_id}/materials", response_model=List[schemas.StudyMaterial])
def get_materials(
    class_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)
    return db.query(models.StudyMaterial).filter(
        models.StudyMaterial.class_id == class_id
    ).all()


@router.get("/class/{class_id}/exams", response_model=List[schemas.Exam])
def get_exams(
    class_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)
    return db.query(models.Exam).filter(
        models.Exam.class_id == class_id
    ).order_by(models.Exam.date).all()


@router.get("/class/{class_id}/attendance-dates")
def get_attendance_dates(
    class_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)
    sessions = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.class_id == class_id
    ).order_by(models.AttendanceSession.date.desc()).all()
    return [{"date": str(s.date), "session_id": s.id, "student_count": len(s.details)} for s in sessions]


# ── POST /attendance ─────────────────────────────────────────────────────────

@router.post("/attendance")
def submit_attendance(
    payload: schemas.AttendanceSubmit,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit / update a full attendance session for a class+date.
    Prevents duplicate sessions — same class+date is updated, not duplicated.
    """
    _assert_class_access(payload.class_id, current_user, db)

    try:
        session_date = date_type.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date; use YYYY-MM-DD")

    # Upsert session
    session = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.class_id == payload.class_id,
        models.AttendanceSession.date == session_date
    ).first()

    if not session:
        session = models.AttendanceSession(
            class_id=payload.class_id,
            date=session_date,
            marked_by_id=current_user.id
        )
        db.add(session)
        db.flush()
    else:
        session.marked_by_id = current_user.id
        session.updated_at = datetime.utcnow()

    # Upsert each student's record
    for rec in payload.records:
        detail = db.query(models.AttendanceDetail).filter(
            models.AttendanceDetail.attendance_id == session.id,
            models.AttendanceDetail.student_id == rec.student_id
        ).first()
        if detail:
            detail.status = rec.status
        else:
            db.add(models.AttendanceDetail(
                attendance_id=session.id,
                student_id=rec.student_id,
                status=rec.status
            ))

    db.commit()
    return {"message": "Attendance saved", "session_id": session.id, "date": str(session_date)}


# ── GET /attendance ──────────────────────────────────────────────────────────

@router.get("/attendance")
def get_attendance(
    class_id: int,
    date: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _assert_class_access(class_id, current_user, db)

    q = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.class_id == class_id
    )
    if date:
        try:
            q = q.filter(models.AttendanceSession.date == date_type.fromisoformat(date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date")

    sessions = q.order_by(models.AttendanceSession.date.desc()).all()
    return [
        {
            "session_id": s.id,
            "class_id": s.class_id,
            "date": str(s.date),
            "details": [
                {
                    "student_id": d.student_id,
                    "student_name": d.student.full_name if d.student else None,
                    "student_username": d.student.username if d.student else None,
                    "status": d.status
                }
                for d in s.details
            ]
        }
        for s in sessions
    ]


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/attendance")
def admin_get_attendance(
    class_id: int,
    date: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    q = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.class_id == class_id
    )
    if date:
        try:
            q = q.filter(models.AttendanceSession.date == date_type.fromisoformat(date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date")

    sessions = q.order_by(models.AttendanceSession.date.desc()).all()
    cls = db.query(models.Class).filter(models.Class.id == class_id).first()

    return [
        {
            "session_id": s.id,
            "class_name": cls.name if cls else None,
            "date": str(s.date),
            "present_count": sum(1 for d in s.details if d.status == "present"),
            "absent_count": sum(1 for d in s.details if d.status == "absent"),
            "total": len(s.details),
            "details": [
                {
                    "student_id": d.student_id,
                    "student_name": d.student.full_name if d.student else None,
                    "username": d.student.username if d.student else None,
                    "status": d.status
                }
                for d in s.details
            ]
        }
        for s in sessions
    ]


@router.get("/admin/classes", response_model=List[schemas.Class])
def admin_get_classes(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(models.Class).all()


@router.post("/admin/classes", response_model=schemas.Class)
def admin_create_class(
    class_data: schemas.ClassCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Resolve faculty name for display
    faculty_name = None
    if class_data.faculty_id:
        faculty = db.query(models.User).filter(models.User.id == class_data.faculty_id).first()
        if faculty:
            faculty_name = faculty.full_name or faculty.username

    new_class = models.Class(
        name=class_data.name,
        description=class_data.description,
        faculty_id=class_data.faculty_id,
        instructor_id=class_data.faculty_id,
        instructor_name=faculty_name,
        course_id=class_data.course_id,          # Optional
        semester_id=class_data.semester_id,      # Optional
        created_by=current_user.id
    )
    db.add(new_class)
    db.flush()

    if class_data.faculty_id:
        db.add(models.ClassFaculty(class_id=new_class.id, faculty_id=class_data.faculty_id))

    db.commit()
    db.refresh(new_class)
    return new_class


@router.post("/admin/assign-faculty")
def assign_faculty(
    payload: schemas.ClassFacultyAssign,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    existing = db.query(models.ClassFaculty).filter(
        models.ClassFaculty.class_id == payload.class_id,
        models.ClassFaculty.faculty_id == payload.faculty_id
    ).first()

    # Also update the primary instructor on the class for easier display
    cls = db.query(models.Class).filter(models.Class.id == payload.class_id).first()
    faculty = db.query(models.User).filter(models.User.id == payload.faculty_id).first()
    if cls and faculty:
        cls.instructor_id = faculty.id
        cls.instructor_name = faculty.full_name or faculty.username

    if not existing:
        db.add(models.ClassFaculty(class_id=payload.class_id, faculty_id=payload.faculty_id))
    
    db.commit()
    return {"message": "Faculty assigned"}


@router.post("/admin/enroll")
def enroll_student(
    enroll_data: schemas.EnrollmentBase,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if db.query(models.Enrollment).filter(
        models.Enrollment.student_id == enroll_data.student_id,
        models.Enrollment.class_id == enroll_data.class_id
    ).first():
        raise HTTPException(status_code=400, detail="Student already enrolled")
    db.add(models.Enrollment(student_id=enroll_data.student_id, class_id=enroll_data.class_id))
    db.commit()
    return {"message": "Student enrolled"}


@router.get("/admin/faculties", response_model=List[schemas.User])
def get_faculties(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(models.User).filter(models.User.role == "faculty").all()


@router.get("/admin/students", response_model=List[schemas.User])
def get_all_students(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(models.User).filter(models.User.role == "student").all()


# ─────────────────────────────────────────────────────────────────────────────
# MATERIALS / ANNOUNCEMENTS / EXAMS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/materials")
async def upload_material(
    class_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    _assert_class_access(class_id, current_user, db)
    mat_dir = os.path.join(UPLOAD_DIR, "materials")
    os.makedirs(mat_dir, exist_ok=True)
    fname = f"{uuid.uuid4().hex}_{file.filename}"
    fpath = os.path.join(mat_dir, fname)
    with open(fpath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    material = models.StudyMaterial(
        class_id=class_id,
        title=title,
        file_path=fpath,
        file_url=f"/files/materials/{fname}",
        uploaded_by=current_user.id
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.post("/announcements", response_model=schemas.Announcement)
def post_announcement(
    ann: schemas.AnnouncementPost,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    _assert_class_access(ann.class_id, current_user, db)
    new_ann = models.Announcement(
        class_id=ann.class_id,
        title="Announcement",
        content=ann.message,
        message=ann.message
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)
    return new_ann


@router.post("/exams", response_model=schemas.Exam)
def create_exam(
    exam_data: schemas.ExamCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    _assert_class_access(exam_data.class_id, current_user, db)
    new_exam = models.Exam(
        class_id=exam_data.class_id,
        title=exam_data.title,
        date=exam_data.date,
        duration=exam_data.duration,
        total_marks=exam_data.total_marks
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam
