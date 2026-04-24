from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ─── Auth ────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ─── Users ───────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    username: str
    role: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True


# ─── University Management ───────────────────────────────────────────────

class ProgramBase(BaseModel):
    name: str
    duration_years: int
    total_semesters: int

class ProgramCreate(ProgramBase):
    pass

class Program(ProgramBase):
    id: int
    class Config:
        from_attributes = True

class SemesterBase(BaseModel):
    program_id: int
    semester_number: int

class SemesterCreate(SemesterBase):
    pass

class Semester(SemesterBase):
    id: int
    class Config:
        from_attributes = True


class StudentBase(BaseModel):
    name: str
    email: str
    program_id: int
    current_semester: int


class StudentCreate(StudentBase):
    user_id: int


class Student(StudentBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class CourseTypeBase(BaseModel):
    name: str

class CourseTypeCreate(CourseTypeBase):
    pass

class CourseType(CourseTypeBase):
    id: int
    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    name: str
    course_type_id: int

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    class Config:
        from_attributes = True

class SemesterCourseBase(BaseModel):
    semester_id: int
    course_id: int

class SemesterCourseCreate(SemesterCourseBase):
    pass

class SemesterCourse(SemesterCourseBase):
    id: int
    class Config:
        from_attributes = True

# For curriculum view
class CourseWithInfo(Course):
    course_type_name: Optional[str] = None

class SemesterWithDetails(Semester):
    courses: List[CourseWithInfo] = []
    classes: List["ClassWithCount"] = []

class ProgramStructure(Program):
    semesters: List[SemesterWithDetails] = []


# ─── Classes ─────────────────────────────────────────────────────────────────

class ClassBase(BaseModel):
    course_id: Optional[int] = None
    semester_id: Optional[int] = None
    instructor_name: Optional[str] = None
    course_name: Optional[str] = None
    program_name: Optional[str] = None
    semester_number: Optional[int] = None
    section: Optional[str] = None
    schedule: Optional[str] = None
    academic_year: Optional[str] = None
    description: Optional[str] = None

class ClassCreate(ClassBase):
    instructor_id: Optional[int] = None # Preferred link to User
    faculty_id: Optional[int] = None    # Legacy support
    name: Optional[str] = None         # Instance name (optional now)

class Class(ClassBase):
    id: int
    instructor_id: Optional[int] = None
    date: datetime
    class Config:
        from_attributes = True

class ClassWithCount(Class):
    student_count: int = 0

# Resolve forward references now that ClassWithCount is defined
SemesterWithDetails.model_rebuild()
ProgramStructure.model_rebuild()

class ClassWithStatus(Class):
    feedback_submitted: bool
    name: Optional[str] = None

class ClassFacultyAssign(BaseModel):
    class_id: int
    faculty_id: int


# ─── Enrollments ─────────────────────────────────────────────────────────────

class EnrollmentBase(BaseModel):
    student_id: int
    class_id: int

class Enrollment(EnrollmentBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# ─── Attendance (session-based) ──────────────────────────────────────────

class AttendanceDetailItem(BaseModel):
    student_id: int
    status: str = "present"

class AttendanceSubmit(BaseModel):
    class_id: int
    date: str
    records: List[AttendanceDetailItem]

class AttendanceDetailOut(BaseModel):
    id: int
    attendance_id: int
    student_id: int
    status: str
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    class Config:
        from_attributes = True

class AttendanceSessionOut(BaseModel):
    id: int
    class_id: int
    date: date
    created_at: datetime
    updated_at: datetime
    details: List[AttendanceDetailOut] = []
    class Config:
        from_attributes = True

class StudentAttendanceInfo(BaseModel):
    student_id: int
    username: str
    full_name: Optional[str]
    is_present: bool
    attendance_id: Optional[int]


# ─── Announcements ───────────────────────────────────────────────────────────

class AnnouncementBase(BaseModel):
    title: str
    content: str

class AnnouncementCreate(AnnouncementBase):
    class_id: int
    type: str = "normal" # normal / poll
    poll: Optional["PollCreate"] = None

class AnnouncementPost(BaseModel):
    class_id: int
    message: str

class PollOptionBase(BaseModel):
    option_text: str

class PollOptionCreate(PollOptionBase):
    pass

class PollOption(PollOptionBase):
    id: int
    class Config:
        from_attributes = True

class PollBase(BaseModel):
    question: str

class PollCreate(PollBase):
    options: List[PollOptionCreate]

class Poll(PollBase):
    id: int
    question: str
    options: List[PollOption]
    class Config:
        from_attributes = True

class Announcement(AnnouncementBase):
    id: int
    class_id: int
    type: str
    timestamp: datetime
    poll: Optional[Poll] = None
    class Config:
        from_attributes = True

class PollResponseCreate(BaseModel):
    poll_id: int
    selected_option_id: int
    comment: Optional[str] = None

class PollResponse(BaseModel):
    id: int
    poll_id: int
    student_id: int
    selected_option_id: int
    comment: Optional[str] = None
    class Config:
        from_attributes = True


class AssignmentBase(BaseModel):
    title: str
    description: str
    deadline: datetime

class AssignmentCreate(AssignmentBase):
    class_id: int

class Assignment(AssignmentBase):
    id: int
    class_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    file_url: str

class SubmissionCreate(SubmissionBase):
    assignment_id: int
    student_id: int

class Submission(SubmissionBase):
    id: int
    assignment_id: int
    student_id: int
    submitted_at: datetime
    class Config:
        from_attributes = True


# ─── Study Materials ─────────────────────────────────────────────────────────

class StudyMaterialBase(BaseModel):
    title: str

class StudyMaterialCreate(StudyMaterialBase):
    class_id: int

class StudyMaterial(StudyMaterialBase):
    id: int
    class_id: int
    file_path: str
    file_url: Optional[str] = None
    uploaded_by: Optional[int] = None
    timestamp: datetime
    class Config:
        from_attributes = True


# ─── Exams ───────────────────────────────────────────────────────────────────

class ExamBase(BaseModel):
    title: str
    date: datetime
    duration: Optional[int] = None
    total_marks: Optional[int] = None

class ExamCreate(ExamBase):
    class_id: int

class Exam(ExamBase):
    id: int
    class_id: int
    class Config:
        from_attributes = True


# ─── Feedback ────────────────────────────────────────────────────────────────

class FeedbackBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: str
    suggestions: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    class_id: int

class Feedback(FeedbackBase):
    id: int
    student_id: int
    faculty_id: int
    class_id: int
    timestamp: datetime
    class Config:
        from_attributes = True
