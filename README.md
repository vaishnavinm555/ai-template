# 🎓 AI Academic & Report Management Platform

A comprehensive platform for academic institutions to manage attendance, collect student feedback, and generate professional AI-powered reports and lesson plans.

## 🚀 Key Features

-   **Multi-Role Authentication**: Secure login for Students, Faculty, and Admins.
-   **Attendance Management**: Faculty can create class sessions and mark student attendance.
-   **Feedback System**: Students provide feedback for attended classes; Faculty/Admins analyze insights.
-   **AI Report Generator**: Generate professional documents (Research Reports, Lesson Plans, Data Summaries) from text or uploaded files (PDF, DOCX, CSV, Excel).
-   **Automated Export**: Download generated reports in PDF, Word (.docx), or Plain Text formats.
-   **Admin Dashboard**: Track daily feedback trends with aggregated ratings and detailed time-stamped logs.

---

## 📁 Project Structure

### 🖥️ Frontend (React)
Located in the root and `src/` directories.

-   **`src/pages/Login.js`**: Handles user authentication and role-based session storage.
-   **`src/pages/Dashboard.js`**: The main hub. Features dynamic views based on role (Student feedback list vs. Admin daily tracking).
-   **`src/pages/home.js`**: The interface for the **AI Report Generator**. Manages file uploads and template selection.
-   **`src/pages/AttendanceMarking.js`**: interface for Faculty to mark student presence for specific classes.
-   **`src/components/UploadFile.js`**: Custom file upload component supporting PDF, DOCX, CSV, and Excel.
-   **`src/components/TemplateSelector.js`**: Dropdown to switch between Research, Lesson Plan, and Data Summary modes.

### ⚙️ Backend (FastAPI & Python)
Located in the `Backend/` directory.

-   **`main.py`**: The core API server. Handles routing, report generation logic, and file management.
-   **`models.py`**: Database schema definitions (Users, Classes, Attendance, Feedback) using SQLAlchemy.
-   **`schemas.py`**: Pydantic models for data validation and API response structures.
-   **`auth_utils.py`**: Security logic for password hashing (bcrypt) and JWT token generation.
-   **`database.py`**: SQLite database configuration and session management.
-   **`seed_db.py`**: Utility script to populate the database with initial users and sample classes.
-   **`utils/extractor.py`**: Core logic for extracting text data from multiple file formats (PDF, DOCX, CSV, XLSX).
-   **`utils/generator.py`**: Integration with **Google Gemini AI** to produce structured, styled documentation.
-   **`utils/pdf_exporter.py`**: Converts AI-generated text into a professionally styled PDF with tables and icons.
-   **`utils/docx_exporter.py`**: Generates high-quality Word documents from AI output.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
-   Node.js & npm
-   Python 3.10+
-   Google Gemini API Key

### 2. Backend Setup
```powershell
cd Backend
python -m venv .venv
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
# Create a .env file and add: GEMINI_API_KEY=your_key_here
```

### 3. Database Initialization
```powershell
..\.venv\Scripts\python.exe seed_db.py
```

### 4. Running the Application
Using the provided shortcut:
```powershell
.\run.ps1
```

---

## 🔑 Default Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Faculty** | `faculty1` | `faculty123` |
| **Student** | `student1` | `student123` |

---

## 🛠️ Tech Stack
-   **Frontend**: React, Axios, React Router.
-   **Backend**: FastAPI, SQLAlchemy (SQLite), Pydantic.
-   **AI**: Google Generative AI (Gemini).
-   **Data**: Pandas (for Excel/CSV), PyMuPDF, python-docx.
-   **Styles**: ReportLab (PDF), python-docx.
