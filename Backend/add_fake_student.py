from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth_utils import get_password_hash

def add_fake_student(username, full_name, password):
    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if user already exists
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        user = models.User(
            username=username,
            full_name=full_name,
            email=f"{username}@example.com",
            department="Computer Science",
            year="3rd Year",
            hashed_password=get_password_hash(password),
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created student: {username}")
    else:
        print(f"Student {username} already exists")

    # Enroll in the first available class and mark as present
    first_class = db.query(models.Class).first()
    if first_class:
        attendance = db.query(models.Attendance).filter(
            models.Attendance.student_id == user.id,
            models.Attendance.class_id == first_class.id
        ).first()

        if not attendance:
            # Find a faculty/admin to mark it (or just use the class faculty)
            attendance = models.Attendance(
                student_id=user.id,
                class_id=first_class.id,
                is_present=True,
                marked_by_id=first_class.faculty_id
            )
            db.add(attendance)
            db.commit()
            print(f"Added {username} to attendance for class: {first_class.name}")
        else:
            attendance.is_present = True
            db.commit()
            print(f"{username} was already in attendance, marked as present.")
    else:
        print("No classes found in the database. Please create a class first.")

    db.close()

if __name__ == "__main__":
    import sys
    # Default values if no arguments provided
    u = "fake_student"
    n = "Fake Student Name"
    p = "password123"
    
    if len(sys.argv) > 1:
        u = sys.argv[1]
    if len(sys.argv) > 2:
        n = sys.argv[2]
    if len(sys.argv) > 3:
        p = sys.argv[3]
        
    add_fake_student(u, n, p)
