"""
University Management Seed Script
Populates Programs, Semesters, Course Types, Courses, and initial Users.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine
import models
from auth_utils import get_password_hash

def seed():
    # Create / migrate all tables
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    def get_or_create(model, defaults=None, **kwargs):
        obj = db.query(model).filter_by(**kwargs).first()
        if obj:
            return obj, False
        params = {**kwargs, **(defaults or {})}
        obj = model(**params)
        db.add(obj)
        db.flush()
        return obj, True

    # ── Users ────────────────────────────────────────────────────────────────
    admin, _ = get_or_create(
        models.User, username="admin",
        defaults=dict(
            full_name="System Admin",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            email="admin@university.edu"
        )
    )

    faculty1, _ = get_or_create(
        models.User, username="faculty1",
        defaults=dict(
            full_name="Dr. Sarah Johnson",
            email="sarah.j@university.edu",
            department="Computer Science",
            hashed_password=get_password_hash("faculty123"),
            role="faculty"
        )
    )

    # ── Course Types ─────────────────────────────────────────────────────────
    core, _ = get_or_create(models.CourseType, name="Core")
    major, _ = get_or_create(models.CourseType, name="Major")
    minor, _ = get_or_create(models.CourseType, name="Minor")
    elec, _ = get_or_create(models.CourseType, name="Elective")
    proj, _ = get_or_create(models.CourseType, name="Project")

    # ── Programs ─────────────────────────────────────────────────────────────
    bba, _ = get_or_create(
        models.Program, name="BBA Entrepreneurship",
        defaults=dict(duration_years=3, total_semesters=6)
    )
    
    bca, _ = get_or_create(
        models.Program, name="BCA (Computer Applications)",
        defaults=dict(duration_years=3, total_semesters=6)
    )

    # Auto-generate semesters if they don't exist
    for p in [bba, bca]:
        for i in range(1, p.total_semesters + 1):
            get_or_create(models.Semester, program_id=p.id, semester_number=i)

    db.commit()

    # ── Courses ──────────────────────────────────────────────────────────────
    c1, _ = get_or_create(models.Course, name="Business Management", defaults=dict(course_type_id=core.id))
    c2, _ = get_or_create(models.Course, name="Marketing 101", defaults=dict(course_type_id=major.id))
    c3, _ = get_or_create(models.Course, name="Economics", defaults=dict(course_type_id=core.id))
    c4, _ = get_or_create(models.Course, name="C++ Programming", defaults=dict(course_type_id=core.id))
    c5, _ = get_or_create(models.Course, name="Data Structures", defaults=dict(course_type_id=major.id))

    # ── Semester-Course (Curriculum) ────────────────────────────────────────
    # BBA Sem 1
    sem1_bba = db.query(models.Semester).filter_by(program_id=bba.id, semester_number=1).first()
    if sem1_bba:
        get_or_create(models.SemesterCourse, semester_id=sem1_bba.id, course_id=c1.id)
        get_or_create(models.SemesterCourse, semester_id=sem1_bba.id, course_id=c3.id)

    # BCA Sem 1
    sem1_bca = db.query(models.Semester).filter_by(program_id=bca.id, semester_number=1).first()
    if sem1_bca:
        get_or_create(models.SemesterCourse, semester_id=sem1_bca.id, course_id=c4.id)

    db.commit()
    print("Database seeded with University Management structure.")
    db.close()

if __name__ == "__main__":
    seed()
