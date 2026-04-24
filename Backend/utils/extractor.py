import fitz  # PyMuPDF
from docx import Document
import pandas as pd


def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file using PyMuPDF."""
    text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    return text

def extract_text_from_docx(docx_path):
    """Extracts text from a DOCX file using python-docx."""
    text = ""
    try:
        doc = Document(docx_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
    return text

def extract_text_from_csv(csv_path):
    """Extracts and formats data from a CSV file."""
    try:
        df = pd.read_csv(csv_path)
        # Summarize for AI: show column names and a few rows
        summary = f"CSV Data Summary:\n- Columns: {', '.join(df.columns)}\n- Total Rows: {len(df)}\n- Content Sample:\n{df.head(20).to_string(index=False)}"
        return summary
    except Exception as e:
        print(f"Error extracting CSV: {e}")
        return ""

def extract_text_from_excel(excel_path):
    """Extracts and formats data from an Excel file."""
    try:
        # Load all sheets
        xl = pd.ExcelFile(excel_path)
        full_summary = []
        for sheet_name in xl.sheet_names:
            df = pd.read_excel(excel_path, sheet_name=sheet_name)
            summary = f"Sheet: {sheet_name}\n- Columns: {', '.join(df.columns)}\n- Total Rows: {len(df)}\n- Content Sample:\n{df.head(20).to_string(index=False)}"
            full_summary.append(summary)
        return "\n\n".join(full_summary)
    except Exception as e:
        print(f"Error extracting Excel: {e}")
        return ""
