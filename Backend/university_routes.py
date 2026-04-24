from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import io, csv
import models, schemas
from database import get_db
from dependencies import get_current_active_user

router = APIRouter(prefix="/admin", tags=["University Management"])

# ── Students ──────────────────────────────────────────────────────────────────

@router.post("/students", response_model=schemas.Student)
def create_student(
    student: schemas.StudentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Check max 10 students per program+semester
    count = db.query(models.Student).filter(
        models.Student.program_id == student.program_id,
        models.Student.current_semester == student.current_semester
    ).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 students allowed per semester per program")

    db_student = models.Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/students", response_model=List[schemas.Student])
def list_students(db: Session = Depends(get_db)):
    return db.query(models.Student).all()

@router.delete("/students/{id}")
def delete_student(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db.query(models.Student).filter(models.Student.id == id).delete()
    db.commit()
    return {"message": "Student deleted"}

# ── Programs ──────────────────────────────────────────────────────────────────

@router.post("/university/classes", response_model=schemas.Class)
def create_class_instance(
    cls: schemas.ClassCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    db_class = models.Class(**cls.dict())
    db.add(db_class)
    db.flush()

    # Link faculty if instructor_id provided
    if cls.instructor_id:
        db.add(models.ClassFaculty(class_id=db_class.id, faculty_id=cls.instructor_id))

    # AUTO-ENROLL LOGIC
    sm = db.query(models.Semester).filter(models.Semester.id == cls.semester_id).first()
    if sm:
        students = db.query(models.Student).filter(
            models.Student.program_id == sm.program_id,
            models.Student.current_semester == sm.semester_number
        ).all()
        for std in students:
            count = db.query(models.Enrollment).filter(models.Enrollment.class_id == db_class.id).count()
            if count < 10:
                db.add(models.Enrollment(student_id=std.id, class_id=db_class.id))

    db.commit()
    db.refresh(db_class)
    return db_class

@router.post("/programs", response_model=schemas.Program)
def create_program(
    program: schemas.ProgramCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    db_program = models.Program(**program.dict())
    db.add(db_program)
    db.flush()
    
    # Auto-generate semesters
    for i in range(1, db_program.total_semesters + 1):
        db.add(models.Semester(program_id=db_program.id, semester_number=i))
    
    db.commit()
    db.refresh(db_program)
    return db_program

@router.get("/programs", response_model=List[schemas.Program])
def get_programs(db: Session = Depends(get_db)):
    return db.query(models.Program).all()

@router.get("/programs/{program_id}/full-structure", response_model=schemas.ProgramStructure)
def get_program_structure(program_id: int, db: Session = Depends(get_db)):
    program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    structure = schemas.ProgramStructure.from_orm(program)
    
    # Build semester details
    sem_list = []
    for sem in program.semesters:
        sem_schema = schemas.SemesterWithDetails.from_orm(sem)
        
        # 1. Courses (Curriculum)
        courses = []
        for sc in sem.semester_courses:
            c_info = schemas.CourseWithInfo.from_orm(sc.course)
            c_info.course_type_name = sc.course.course_type.name if sc.course.course_type else None
            courses.append(c_info)
        sem_schema.courses = courses
        
        # 2. Classes (Instances with student count)
        classes = []
        for cl in sem.classes:
            cl_info = schemas.ClassWithCount.from_orm(cl)
            cl_info.student_count = len(cl.enrollments)
            cl_info.course_name = cl.course.name if cl.course else cl.name
            classes.append(cl_info)
        sem_schema.classes = classes
        
        sem_list.append(sem_schema)
    
    structure.semesters = sem_list
    return structure


# ── Semesters ─────────────────────────────────────────────────────────────────

@router.get("/semesters", response_model=List[schemas.Semester])
def get_semesters(program_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Semester)
    if program_id:
        q = q.filter(models.Semester.program_id == program_id)
    return q.all()


# ── Course Types ──────────────────────────────────────────────────────────────

@router.get("/course-types", response_model=List[schemas.CourseType])
def get_course_types(db: Session = Depends(get_db)):
    return db.query(models.CourseType).all()

@router.post("/course-types", response_model=schemas.CourseType)
def create_course_type(ct: schemas.CourseTypeCreate, db: Session = Depends(get_db)):
    db_ct = models.CourseType(name=ct.name)
    db.add(db_ct)
    db.commit()
    db.refresh(db_ct)
    return db_ct


# ── Courses ───────────────────────────────────────────────────────────────────

@router.post("/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@router.post("/courses/bulk")
async def bulk_upload_courses(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    count = 0
    for row in reader:
        # Expected CSV columns: name, course_type_id
        db_course = models.Course(name=row['name'], course_type_id=int(row['course_type_id']))
        db.add(db_course)
        count += 1
    
    db.commit()
    return {"message": f"Successfully imported {count} courses"}

@router.get("/courses", response_model=List[schemas.CourseWithInfo])
def get_courses(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    res = []
    for c in courses:
        ci = schemas.CourseWithInfo.from_orm(c)
        ci.course_type_name = c.course_type.name if c.course_type else None
        res.append(ci)
    return res


# ── Curriculum Builder (Semester-Course Mapping) ─────────────────────────────

@router.post("/semester-course")
def assign_course_to_semester(sc: schemas.SemesterCourseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SemesterCourse).filter(
        models.SemesterCourse.semester_id == sc.semester_id,
        models.SemesterCourse.course_id == sc.course_id
    ).first()
    if existing:
        return {"message": "Already assigned"}
    
    db_sc = models.SemesterCourse(**sc.dict())
    db.add(db_sc)
    db.commit()
    return {"message": "Course assigned to semester"}

@router.post("/assign-courses-to-semester")
def bulk_assign_courses(semester_id: int, course_ids: List[int], db: Session = Depends(get_db)):
    for cid in course_ids:
        existing = db.query(models.SemesterCourse).filter(
            models.SemesterCourse.semester_id == semester_id,
            models.SemesterCourse.course_id == cid
        ).first()
        if not existing:
            db.add(models.SemesterCourse(semester_id=semester_id, course_id=cid))
    db.commit()
    return {"message": f"Assigned {len(course_ids)} courses"}

@router.get("/semester/{id}/courses", response_model=List[schemas.CourseWithInfo])
def get_semester_courses(id: int, db: Session = Depends(get_db)):
    sm = db.query(models.Semester).filter(models.Semester.id == id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    res = []
    for sc in sm.semester_courses:
        ci = schemas.CourseWithInfo.from_orm(sc.course)
        ci.course_type_name = sc.course.course_type.name if sc.course.course_type else None
        res.append(ci)
    return res

@router.post("/generate-classes")
def generate_semester_classes(semester_id: int, academic_year: str, sections: int = 1, instructor_id: Optional[int] = None, db: Session = Depends(get_db)):
    sm = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    faculty = None
    if instructor_id:
        faculty = db.query(models.User).filter(models.User.id == instructor_id).first()

    section_labels = ["A", "B", "C", "D", "E", "F"]
    classes_created = 0
    
    for sc in sm.semester_courses:
        for i in range(min(sections, len(section_labels))):
            section = section_labels[i]
            # Check if exists
            existing = db.query(models.Class).filter(
                models.Class.course_id == sc.course_id,
                models.Class.semester_id == semester_id,
                models.Class.section == section,
                models.Class.academic_year == academic_year
            ).first()
            
            if not existing:
                new_class = models.Class(
                    course_id=sc.course_id,
                    semester_id=semester_id,
                    section=section,
                    academic_year=academic_year,
                    instructor_id=instructor_id,
                    instructor_name=faculty.full_name or faculty.username if faculty else None
                )
                db.add(new_class)
                db.flush() # Get the new_class.id
                
                # Also add to link table if assigned
                if instructor_id:
                    db.add(models.ClassFaculty(class_id=new_class.id, faculty_id=instructor_id))
                
                # AUTO-ENROLL LOGIC: Enroll students in that program + semester
                students_to_enroll = db.query(models.Student).filter(
                    models.Student.program_id == sm.program_id,
                    models.Student.current_semester == sm.semester_number
                ).all()
                
                for std in students_to_enroll:
                    # Enforce max 10 students per class
                    count = db.query(models.Enrollment).filter(models.Enrollment.class_id == new_class.id).count()
                    if count < 10:
                        db.add(models.Enrollment(student_id=std.id, class_id=new_class.id))
                    
                classes_created += 1
    
    db.commit()
    return {"message": f"Generated {classes_created} class instances for {len(sm.semester_courses)} courses."}

@router.delete("/semester-course")
def remove_course_from_semester(semester_id: int, course_id: int, db: Session = Depends(get_db)):
    db.query(models.SemesterCourse).filter(
        models.SemesterCourse.semester_id == semester_id,
        models.SemesterCourse.course_id == course_id
    ).delete()
    db.commit()
    return {"message": "Course removed from semester"}


# ── Classes (Course Instances) ───────────────────────────────────────────────

# Duplicate removed

@router.get("/university/classes")
def get_all_classes(db: Session = Depends(get_db)):
    # Join with Course and Semester for a better view
    return db.query(models.Class).all()

@router.get("/semester/{semester_id}/classes")
def get_classes_by_semester(semester_id: int, db: Session = Depends(get_db)):
    """Get all class instances for a given semester, with enriched data."""
    sm = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    classes = db.query(models.Class).filter(models.Class.semester_id == semester_id).all()
    result = []
    for cl in classes:
        # Get assigned faculty from ClassFaculty link table
        faculty_link = db.query(models.ClassFaculty).filter(
            models.ClassFaculty.class_id == cl.id
        ).first()
        faculty_user = None
        if faculty_link:
            faculty_user = db.query(models.User).filter(models.User.id == faculty_link.faculty_id).first()
        
        result.append({
            "id": cl.id,
            "course_name": cl.course.name if cl.course else cl.name,
            "faculty_name": (faculty_user.full_name or faculty_user.username) if faculty_user else (cl.instructor_name or "Not Assigned"),
            "faculty_id": faculty_link.faculty_id if faculty_link else None,
            "section": cl.section,
            "academic_year": cl.academic_year,
            "schedule": cl.schedule,
            "date": str(cl.date) if cl.date else None,
            "student_count": len(cl.enrollments),
        })
    return result

@router.get("/program/{program_id}/semesters")
def get_semesters_for_program(program_id: int, db: Session = Depends(get_db)):
    """Get semesters for a program with class count per semester."""
    prog = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    
    result = []
    for sem in prog.semesters:
        class_count = db.query(models.Class).filter(models.Class.semester_id == sem.id).count()
        result.append({
            "id": sem.id,
            "semester_number": sem.semester_number,
            "class_count": class_count,
            "course_count": len(sem.semester_courses),
        })
    return result


@router.post("/sync-enrollments")
def sync_enrollments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    classes = db.query(models.Class).all()
    enrollments_added = 0
    
    for cls in classes:
        # Get semester for this class
        sm = db.query(models.Semester).filter(models.Semester.id == cls.semester_id).first()
        if not sm:
            continue
            
        # Get students in this program and semester
        students = db.query(models.Student).filter(
            models.Student.program_id == sm.program_id,
            models.Student.current_semester == sm.semester_number
        ).all()
        
        for std in students:
            # Check if already enrolled
            existing = db.query(models.Enrollment).filter(
                models.Enrollment.student_id == std.id,
                models.Enrollment.class_id == cls.id
            ).first()
            
            if not existing:
                # Check 10 student limit per class
                count = db.query(models.Enrollment).filter(models.Enrollment.class_id == cls.id).count()
                if count < 10:
                    db.add(models.Enrollment(student_id=std.id, class_id=cls.id))
                    enrollments_added += 1
    
    db.commit()
    return {"message": f"Successfully synced enrollments. Added {enrollments_added} new enrollment records."}
