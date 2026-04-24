"""
Seed script for BBA Entrepreneurship Program.
Populates courses, students, and enrollments for Semester 1 and 2.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine
import models
from auth_utils import get_password_hash
from datetime import datetime

def seed_bba():
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

    print("--- Seeding BBA Entrepreneurship Program ---")

    # 1. Course Types
    core, _ = get_or_create(models.CourseType, name="Core")
    major, _ = get_or_create(models.CourseType, name="Major")
    elec, _ = get_or_create(models.CourseType, name="Elective")
    proj, _ = get_or_create(models.CourseType, name="Project")

    # 2. Program
    program, created = get_or_create(
        models.Program, 
        name="BBA Entrepreneurship",
        defaults=dict(duration_years=4, total_semesters=8)
    )
    if not created:
        program.duration_years = 4
        program.total_semesters = 8
        db.flush()

    # 3. Semesters
    semesters = {}
    for i in range(1, 9):
        sem, _ = get_or_create(models.Semester, program_id=program.id, semester_number=i)
        semesters[i] = sem

    # 4. Courses & Curriculum
    courses_sem1 = [
        ("Ethics for Business", core),
        ("Quantitative Techniques for Decision Making", major),
        ("The Founder’s Toolkit", major),
        ("Design Thinking & Innovation", major),
        ("English – I", core),
        ("Language I", core),
        ("Open Elective", elec),
        ("Mind Management & Human Values – I", core),
        ("TDPCL – 1 (Project Learning)", proj)
    ]

    courses_sem2 = [
        ("Start-up Organizational Effectiveness", major),
        ("Consumer Behaviour & Analytics", major),
        ("Managerial Accounting I", core),
        ("Business Communication", core),
        ("Language II", core),
        ("Open Elective", elec),
        ("Mind Management & Human Values – II", core),
        ("TDPCL – 2", proj)
    ]

    def setup_curriculum(course_list, semester):
        classes_created = []
        for name, ctype in course_list:
            course, _ = get_or_create(models.Course, name=name, defaults=dict(course_type_id=ctype.id))
            get_or_create(models.SemesterCourse, semester_id=semester.id, course_id=course.id)
            
            # Create a Class instance for each course
            cls, created = get_or_create(
                models.Class, 
                course_id=course.id, 
                semester_id=semester.id,
                defaults=dict(
                    name=name,
                    section="A",
                    academic_year="2023-24",
                    instructor_name="Dr. Sarah Johnson"
                )
            )
            if not created:
                cls.name = name
                db.flush()
            classes_created.append(cls)
        return classes_created

    classes_sem1 = setup_curriculum(courses_sem1, semesters[1])
    classes_sem2 = setup_curriculum(courses_sem2, semesters[2])

    # 5. Students
    students_data_sem1 = [
        ("aarav", "Aarav Sharma", "aarav.sharma@email.com"),
        ("diya", "Diya Patel", "diya.patel@email.com"),
        ("rohan", "Rohan Mehta", "rohan.mehta@email.com"),
        ("sneha", "Sneha Reddy", "sneha.reddy@email.com"),
        ("arjun", "Arjun Verma", "arjun.verma@email.com"),
        ("kavya", "Kavya Nair", "kavya.nair@email.com"),
        ("rahul", "Rahul Singh", "rahul.singh@email.com"),
        ("ananya", "Ananya Iyer", "ananya.iyer@email.com"),
        ("karan", "Karan Gupta", "karan.gupta@email.com"),
        ("meera", "Meera Joshi", "meera.joshi@email.com"),
    ]

    students_data_sem2 = [
        ("aditya", "Aditya Kapoor", "aditya.kapoor@email.com"),
        ("pooja", "Pooja Shah", "pooja.shah@email.com"),
        ("vikram", "Vikram Rao", "vikram.rao@email.com"),
        ("neha", "Neha Agarwal", "neha.agarwal@email.com"),
        ("suresh", "Suresh Kumar", "suresh.kumar@email.com"),
        ("priya", "Priya Menon", "priya.menon@email.com"),
        ("manish", "Manish Yadav", "manish.yadav@email.com"),
        ("ritu", "Ritu Sharma", "ritu.sharma@email.com"),
        ("deepak", "Deepak Jain", "deepak.jain@email.com"),
        ("simran", "Simran Kaur", "simran.kaur@email.com"),
    ]

    def create_and_enroll_students(data, semester_num, classes):
        for username, name, email in data:
            user, _ = get_or_create(
                models.User, 
                username=username,
                defaults=dict(
                    full_name=name,
                    email=email,
                    role="student",
                    hashed_password=get_password_hash(f"{username}123")
                )
            )
            
            student, _ = get_or_create(
                models.Student,
                user_id=user.id,
                defaults=dict(
                    name=name,
                    email=email,
                    program_id=program.id,
                    current_semester=semester_num
                )
            )
            
            # Enroll in all classes for this semester
            for cls in classes:
                get_or_create(models.Enrollment, student_id=student.id, class_id=cls.id)

    print("Registering Semester 1 students...")
    create_and_enroll_students(students_data_sem1, 1, classes_sem1)
    
    print("Registering Semester 2 students...")
    create_and_enroll_students(students_data_sem2, 2, classes_sem2)

    db.commit()
    print("BBA Entrepreneurship data seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed_bba()
