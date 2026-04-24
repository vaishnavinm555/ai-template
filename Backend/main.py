from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os, shutil, json, uuid
from typing import Optional, List
from sqlalchemy.orm import Session
import models, schemas, auth_utils, database
from database import engine, get_db
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from auth_utils import SECRET_KEY, ALGORITHM, verify_password, get_password_hash, create_access_token
from utils.extractor import extract_text_from_pdf, extract_text_from_docx, extract_text_from_csv, extract_text_from_excel
from utils.generator import generate_report_with_ai
from utils.pdf_exporter import create_pdf_report
from utils.docx_exporter import create_docx_report
from dotenv import load_dotenv
from dependencies import get_current_user, get_current_active_user
import faculty_routes, university_routes, student_routes, interaction_routes

# Initialize database
models.Base.metadata.create_all(bind=engine)

# Load environment variables from .env file (if it exists)
load_dotenv()

app = FastAPI(title="AI Report Generator API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
TEMPLATES_DIR = "templates"
OUTPUT_DIR = "output"

for directory in [UPLOAD_DIR, TEMPLATES_DIR, OUTPUT_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# ── Routers ────────────────────────────────────────────────────
app.include_router(faculty_routes.router)
app.include_router(university_routes.router)
app.include_router(student_routes.router)
app.include_router(interaction_routes.router)

@app.get("/")
async def root():
    return {"message": "AI Academic Report Generator API is running!"}

# --- Authentication Endpoints ---

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        department=user.department,
        year=user.year
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    import time
    start_time = time.time()
    
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    db_lookup_time = time.time() - start_time
    
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username")
        
    verify_start = time.time()
    is_valid = verify_password(form_data.password, user.hashed_password)
    verify_time = time.time() - verify_start
    
    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    total_time = time.time() - start_time
    
    print(f"--- Login Performance ---")
    print(f"DB Lookup: {db_lookup_time:.4f}s")
    print(f"Password Verify: {verify_time:.4f}s")
    print(f"Total Login: {total_time:.4f}s")
    print(f"-------------------------")
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role, 
        "username": user.username,
        "full_name": user.full_name
    }

# --- Feedback Endpoints ---


@app.get("/student/classes", response_model=List[schemas.ClassWithStatus])
def get_attended_classes(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this.")
    
    classes = db.query(models.Class).join(models.Attendance).filter(
        models.Attendance.student_id == current_user.id,
        models.Attendance.is_present == True
    ).all()
    
    result = []
    for c in classes:
        feedback_exists = db.query(models.Feedback).filter(
            models.Feedback.student_id == current_user.id,
            models.Feedback.class_id == c.id
        ).first() is not None
        
        # Convert SQLAlchemy model to dict and add status
        class_dict = schemas.Class.from_orm(c).__dict__
        class_dict["feedback_submitted"] = feedback_exists
        result.append(class_dict)
        
    return result

@app.post("/feedback", response_model=schemas.Feedback)
def submit_feedback(
    feedback: schemas.FeedbackCreate, 
    current_user: models.User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit feedback.")
    
    class_obj = db.query(models.Class).filter(models.Class.id == feedback.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Deadline check: 48 hours after class date
    from datetime import datetime, timedelta
    if datetime.now() > (class_obj.date + timedelta(hours=48)):
        raise HTTPException(status_code=400, detail="Feedback submission deadline has passed (48 hours).")

    # Verify attendance
    attendance = db.query(models.Attendance).filter(
        models.Attendance.student_id == current_user.id,
        models.Attendance.class_id == feedback.class_id,
        models.Attendance.is_present == True
    ).first()
    
    if not attendance:
        raise HTTPException(status_code=403, detail="You can only give feedback for classes you attended.")
    
    # Prevent duplicate
    existing = db.query(models.Feedback).filter(
        models.Feedback.student_id == current_user.id,
        models.Feedback.class_id == feedback.class_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this class.")
    
    class_obj = db.query(models.Class).filter(models.Class.id == feedback.class_id).first()
    
    new_feedback = models.Feedback(
        student_id=current_user.id,
        faculty_id=class_obj.faculty_id,
        class_id=feedback.class_id,
        rating=feedback.rating,
        comments=feedback.comments,
        suggestions=feedback.suggestions
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback

@app.get("/faculty/feedback", response_model=List[dict])
def get_faculty_feedback(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Anonymous view for faculty (only comments and ratings)
    query = db.query(models.Feedback).filter(models.Feedback.faculty_id == current_user.id)
    feedbacks = query.all()
    
    result = []
    for f in feedbacks:
        result.append({
            "rating": f.rating,
            "comments": f.comments,
            "suggestions": f.suggestions,
            "class_name": f.class_.name,
            "timestamp": f.timestamp
        })
    return result

@app.get("/admin/feedback", response_model=List[dict])
def get_admin_feedback(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Detailed view for admin
    feedbacks = db.query(models.Feedback).all()
    
    result = []
    for f in feedbacks:
        result.append({
            "id": f.id,
            "student_username": f.student.username,
            "rating": f.rating,
            "comments": f.comments,
            "suggestions": f.suggestions,
            "class_name": f.class_.name,
            "timestamp": f.timestamp,
            "faculty_id": f.faculty_id
        })
    return result

@app.post("/generate")
async def generate_report(
    file: Optional[UploadFile] = File(None),
    template: str = Form(...),
    topic: str = Form(...),
    extraData: Optional[str] = Form(None)
):
    try:
        text_content = ""
        filename = "None"
        
        parsed_extra_data = {}
        if extraData:
            try:
                parsed_extra_data = json.loads(extraData)
            except:
                pass

        # 1. Handle File if provided
        if file and file.filename:
            filename = file.filename
            file_path = os.path.join(UPLOAD_DIR, filename)
            
            allowed_extensions = [".pdf", ".docx", ".csv", ".xlsx", ".xls"]
            if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
                raise HTTPException(status_code=400, detail=f"Only {', '.join(allowed_extensions)} files are allowed.")
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            if filename.lower().endswith(".pdf"):
                text_content = extract_text_from_pdf(file_path)
            elif filename.lower().endswith(".docx"):
                text_content = extract_text_from_docx(file_path)
            elif filename.lower().endswith(".csv"):
                text_content = extract_text_from_csv(file_path)
            elif filename.lower().endswith((".xlsx", ".xls")):
                text_content = extract_text_from_excel(file_path)
                
            if not text_content:
                text_content = "Could not extract substantial text from file."

        # 2. Get Template structure
        template_file = os.path.join(TEMPLATES_DIR, f"{template}.json")
        if not os.path.exists(template_file):
            raise HTTPException(status_code=404, detail="Template not found")
            
        with open(template_file, "r", encoding="utf-8") as f:
            template_data = json.load(f)

        # 3. Build AI Prompt
        extra_details_str = ""
        if parsed_extra_data:
            duration = parsed_extra_data.get("courseDuration", "")
            extra_details_str = "\n".join([f"- {k}: {v}" for k, v in parsed_extra_data.items() if v])
            
            # Explicit instruction for time planning if duration is mentioned
            if duration:
                extra_details_str += f"\n\nCRITICAL INSTRUCTION: Since the duration is '{duration}', provide a CLEAR and DETAILED chronological breakdown. "
                if "month" in duration.lower() or "4 week" in duration.lower():
                    extra_details_str += "Break this down specifically into Week 1, Week 2, Week 3, and Week 4, with day-by-day or module-by-module goals."
                else:
                    extra_details_str += "Provide a logical session-by-session schedule covering the entire duration."

            # FEEDBACK INTEGRATION
            class_id = parsed_extra_data.get("class_id")
            if class_id:
                db = next(get_db())
                feedbacks = db.query(models.Feedback).filter(models.Feedback.class_id == class_id).all()
                if feedbacks:
                    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks)
                    feedback_summaries = "\n".join([f"- {f.comments}" for f in feedbacks])
                    extra_details_str += f"\n\nFEEDBACK INSIGHTS (Aggregated from Students):\n"
                    extra_details_str += f"Average Rating: {avg_rating:.1f}/5\n"
                    extra_details_str += f"Student Comments:\n{feedback_summaries}\n"
                    extra_details_str += f"\nCRITICAL INSTRUCTION: Analyze these common feedback points and include a 'Student Feedback & Improvement' section in the report."

        if template == "data_summary":
            sections = template_data.get('sections', [])
            ai_prompt = (
                f"ACT AS A PROFESSIONAL DATA ANALYST. Generate a concise and insightful {template_data.get('template_name')} "
                f"for the following request: '{topic}'. \n\n"
                f"DOCUMENT STRUCTURE RULES:\n"
                f"- Use these sections to organize your findings: {sections}\n"
                f"- Include relevant icons (📊 for data, 💡 for insights, etc.).\n"
                f"- Use tables to compare or summarize raw data points where helpful.\n"
                f"- Use horizontal dividers (---) between major sections.\n\n"
                f"CORE ANALYTICAL TASK:\n"
                f"- Focus on identifying patterns, anomalies, and key takeaways from the provided data.\n"
                f"- {extra_details_str if extra_details_str else 'Provide a balanced summary of the key information.'}\n\n"
                f"REFERENCE DATA:\n"
                f"{text_content if text_content else 'No data provided. Please provide observations based on general principles if appropriate.'}"
            )
        elif text_content:
            sections = template_data.get('sections', [])
            ai_prompt = (
                f"ACT AS A PROFESSIONAL DOCUMENT ENGINE. Generate a visually polished {template_data.get('template_name')} "
                f"specifically for '{topic}'. \n\n"
                f"DOCUMENT STRUCTURE RULES:\n"
                f"- Follow these exact sections: {sections}\n"
                f"- Include professional icons (📘, 🎯, 📊, etc.) as seen in our style guide.\n"
                f"- Use tables for schedules and timelines.\n"
                f"- Use horizontal dividers (---) between major sections.\n\n"
                f"USER DETAILS TO INCORPORATE:\n{extra_details_str}\n\n"
                f"REFERENCE MATERIAL:\nUse the provided document text as the factual source of truth."
            )
        else:
            sections = template_data.get('sections', [])
            ai_prompt = (
                f"ACT AS A PROFESSIONAL DOCUMENT ENGINE. Generate a high-quality, comprehensive {template_data.get('template_name')} "
                f"on the topic: '{topic}'. \n\n"
                f"DOCUMENT STRUCTURE RULES:\n"
                f"- Follow these exact sections: {sections}\n"
                f"- Include professional icons (📘, 🎯, 📊, etc.) as requested.\n"
                f"- Use tables for all schedules and implementation plans.\n"
                f"- Use horizontal dividers (---) between major sections.\n\n"
                f"USER SPECIFICATIONS:\n{extra_details_str}\n\n"
                f"TASK: Generate detailed, pedagogical, and professional content from scratch."
            )
        
        # 4. Call AI Generator
        print(f"DEBUG: Generating report for template: {template}")
        report_text = generate_report_with_ai(ai_prompt, text_content if text_content else "No reference document provided.")
        
        if report_text.startswith("Error with Gemini generation:"):
            print(f"AI Error: {report_text}")
            raise HTTPException(status_code=500, detail=report_text)
            
        # Ensure we don't crash on print with emojis on Windows
        try:
            print(f"DEBUG: Report text generated (first 100 chars): {report_text[:100]}")
        except UnicodeEncodeError:
            print(f"DEBUG: Report text generated (contains special characters, first 100 chars hidden)")
        
        # 5. Export Files
        report_id = uuid.uuid4().hex
        
        # PDF
        pdf_filename = f"report_{report_id}.pdf"
        create_pdf_report(report_text, pdf_filename, title="")

        # DOCX
        docx_filename = f"report_{report_id}.docx"
        create_docx_report(report_text, docx_filename, title="")
        
        # TXT
        txt_filename = f"report_{report_id}.txt"
        with open(os.path.join(OUTPUT_DIR, txt_filename), "w", encoding="utf-8") as f:
            f.write(report_text)

        return {
            "report": report_text, 
            "pdf_url": f"/download/{pdf_filename}",
            "docx_url": f"/download/{docx_filename}",
            "txt_url": f"/download/{txt_filename}",
            "filename": filename,
            "templateUsed": template_data.get("template_name")
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename)
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)