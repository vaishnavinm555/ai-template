from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Boolean, Date, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ClassFaculty(Base):
    """Many-to-many: which faculty members are assigned to which classes."""
    __tablename__ = "class_faculty"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    __table_args__ = (UniqueConstraint("class_id", "faculty_id", name="uq_class_faculty"),)

    class_ = relationship("Class", back_populates="class_faculties")
    faculty = relationship("User", back_populates="class_faculty_assignments")


class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True)
    timestamp = Column(DateTime, default=func.now())

    student = relationship("Student", back_populates="enrollments")
    class_ = relationship("Class", back_populates="enrollments")

    __table_args__ = (UniqueConstraint("student_id", "class_id", name="uq_student_enrollment"),)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # student, faculty, admin

    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    department = Column(String, nullable=True)
    year = Column(String, nullable=True)

    # Relationships
    attendances = relationship("Attendance", back_populates="student", foreign_keys="[Attendance.student_id]")
    attendances_marked = relationship("Attendance", back_populates="marked_by", foreign_keys="[Attendance.marked_by_id]")
    student_feedbacks = relationship("Feedback", back_populates="student", foreign_keys="[Feedback.student_id]")
    faculty_feedbacks = relationship("Feedback", back_populates="faculty", foreign_keys="[Feedback.faculty_id]")
    managed_classes = relationship("Class", back_populates="instructor", foreign_keys="[Class.instructor_id]")
    class_faculty_assignments = relationship("ClassFaculty", back_populates="faculty")
    attendance_details = relationship("AttendanceDetail", back_populates="student")
    student_profile = relationship("Student", back_populates="user", uselist=False)


# ── University Management Tables ──────────────────────────────────────────

class Program(Base):
    __tablename__ = "programs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration_years = Column(Integer)
    total_semesters = Column(Integer)

    semesters = relationship("Semester", back_populates="program", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="program")


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    name = Column(String) # For direct access
    email = Column(String, unique=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), index=True)
    current_semester = Column(Integer)
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="student_profile")
    program = relationship("Program", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    submissions = relationship("Submission", back_populates="student")
    poll_responses = relationship("PollResponse", back_populates="student")


class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), index=True)
    semester_number = Column(Integer)

    program = relationship("Program", back_populates="semesters")
    semester_courses = relationship("SemesterCourse", back_populates="semester")
    classes = relationship("Class", back_populates="semester")


class CourseType(Base):
    __tablename__ = "course_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True) # Core, Major, Minor, Elective, Project

    courses = relationship("Course", back_populates="course_type")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    course_type_id = Column(Integer, ForeignKey("course_types.id"), index=True)

    course_type = relationship("CourseType", back_populates="courses")
    semester_courses = relationship("SemesterCourse", back_populates="course")
    classes = relationship("Class", back_populates="course")


class SemesterCourse(Base):
    """Mapping table for Curriculum Builder."""
    __tablename__ = "semester_courses"
    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)

    semester = relationship("Semester", back_populates="semester_courses")
    course = relationship("Course", back_populates="semester_courses")

    __table_args__ = (UniqueConstraint("semester_id", "course_id", name="uq_semester_course"),)


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), index=True)
    
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Normalized
    instructor_name = Column(String, nullable=True) # As requested
    
    section = Column(String, nullable=True)
    schedule = Column(String, nullable=True) # e.g. Mon 10:00 - 12:00
    academic_year = Column(String, nullable=True) # e.g. 2023-24
    
    name = Column(String, index=True, nullable=True) # Legacy support / instance name
    description = Column(String, nullable=True)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Legacy
    date = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    course = relationship("Course", back_populates="classes")
    semester = relationship("Semester", back_populates="classes")
    instructor = relationship("User", back_populates="managed_classes", foreign_keys=[instructor_id])
    
    @property
    def course_name(self):
        return self.course.name if self.course else self.name

    @property
    def program_name(self):
        return self.semester.program.name if self.semester and self.semester.program else None

    @property
    def semester_number(self):
        return self.semester.semester_number if self.semester else None
    
    attendances = relationship("Attendance", back_populates="class_")
    feedbacks = relationship("Feedback", back_populates="class_")
    enrollments = relationship("Enrollment", back_populates="class_")
    announcements = relationship("Announcement", back_populates="class_")
    study_materials = relationship("StudyMaterial", back_populates="class_")
    exams = relationship("Exam", back_populates="class_")
    class_faculties = relationship("ClassFaculty", back_populates="class_")
    attendance_sessions = relationship("AttendanceSession", back_populates="class_")
    assignments = relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    date = Column(Date, nullable=False)
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("class_id", "date", name="uq_attendance_session"),)

    class_ = relationship("Class", back_populates="attendance_sessions")
    marked_by = relationship("User")
    details = relationship("AttendanceDetail", back_populates="session", cascade="all, delete-orphan")


class AttendanceDetail(Base):
    __tablename__ = "attendance_details"
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="present")

    __table_args__ = (UniqueConstraint("attendance_id", "student_id", name="uq_att_detail"),)

    session = relationship("AttendanceSession", back_populates="details")
    student = relationship("User", back_populates="attendance_details")


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True)
    title = Column(String)
    message = Column(String, nullable=True)
    type = Column(String, default="normal") # normal / poll
    created_by_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=func.now())

    class_ = relationship("Class", back_populates="announcements")
    created_by = relationship("User")
    poll = relationship("Poll", back_populates="announcement", uselist=False, cascade="all, delete-orphan")


class Poll(Base):
    __tablename__ = "polls"
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"), unique=True, index=True)
    question = Column(String)

    announcement = relationship("Announcement", back_populates="poll")
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")
    responses = relationship("PollResponse", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    __tablename__ = "poll_options"
    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True)
    option_text = Column(String)

    poll = relationship("Poll", back_populates="options")


class PollResponse(Base):
    __tablename__ = "poll_responses"
    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    selected_option_id = Column(Integer, ForeignKey("poll_options.id"))
    comment = Column(String, nullable=True)

    poll = relationship("Poll", back_populates="responses")
    student = relationship("Student", back_populates="poll_responses")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True)
    title = Column(String)
    description = Column(String)
    deadline = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

    class_ = relationship("Class", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    file_url = Column(String)
    submitted_at = Column(DateTime, default=func.now())

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")

    __table_args__ = (UniqueConstraint("assignment_id", "student_id", name="uq_student_submission"),)


class StudyMaterial(Base):
    __tablename__ = "study_materials"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    title = Column(String)
    file_path = Column(String)
    file_url = Column(String, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=func.now())
    class_ = relationship("Class", back_populates="study_materials")


class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    title = Column(String)
    date = Column(DateTime)
    duration = Column(Integer, nullable=True)
    total_marks = Column(Integer, nullable=True)
    class_ = relationship("Class", back_populates="exams")


class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    is_present = Column(Boolean, default=False)
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=func.now(), onupdate=func.now())
    student = relationship("User", back_populates="attendances", foreign_keys=[student_id])
    marked_by = relationship("User", back_populates="attendances_marked", foreign_keys=[marked_by_id])
    class_ = relationship("Class", back_populates="attendances")


class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    faculty_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    rating = Column(Integer)
    comments = Column(String)
    suggestions = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now())
    student = relationship("User", back_populates="student_feedbacks", foreign_keys=[student_id])
    faculty = relationship("User", back_populates="faculty_feedbacks", foreign_keys=[faculty_id])
    class_ = relationship("Class", back_populates="feedbacks")
