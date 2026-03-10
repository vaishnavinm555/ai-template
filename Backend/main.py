from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
import json
import uuid
from typing import Optional
from dotenv import load_dotenv
from utils.extractor import extract_text_from_pdf, extract_text_from_docx
from utils.generator import generate_report_with_ai
from utils.pdf_exporter import create_pdf_report
from utils.docx_exporter import create_docx_report

# Load environment variables from .env file (if it exists)
load_dotenv()

app = FastAPI(title="AI Report Generator API")

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

@app.get("/")
async def root():
    return {"message": "AI Academic Report Generator API is running!"}

@app.post("/generate")
async def generate_report(
    file: Optional[UploadFile] = File(None),
    template: str = Form(...),
    topic: str = Form(...),
    extraData: Optional[str] = Form(None)
):
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
        
        if not (filename.endswith(".pdf") or filename.endswith(".docx")):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed.")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if filename.endswith(".pdf"):
            text_content = extract_text_from_pdf(file_path)
        elif filename.endswith(".docx"):
            text_content = extract_text_from_docx(file_path)
            
        if not text_content:
            text_content = "Could not extract substantial text from file."

    # 2. Get Template structure
    template_file = os.path.join(TEMPLATES_DIR, f"{template}.json")
    if not os.path.exists(template_file):
        raise HTTPException(status_code=404, detail="Template not found")
        
    with open(template_file, "r") as f:
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

    if text_content:
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
        
    print(f"DEBUG: Report text generated (first 100 chars): {report_text[:100]}")
    
    # 5. Export Files
    report_id = uuid.uuid4().hex
    
    # PDF
    pdf_filename = f"report_{report_id}.pdf"
    create_pdf_report(report_text, pdf_filename, title=f"{template_data.get('template_name')}: {topic}")

    # DOCX
    docx_filename = f"report_{report_id}.docx"
    create_docx_report(report_text, docx_filename, title=f"{template_data.get('template_name')}: {topic}")
    
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

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename)
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)