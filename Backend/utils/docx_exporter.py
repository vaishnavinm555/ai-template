import os
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def create_docx_report(content_text, filename, title="AI Generated Academic Document"):
    """
    Converts plain text or markdown-style text into a professional Word (.docx) document.
    """
    output_path = os.path.join("output", filename)
    if not os.path.exists("output"):
        os.makedirs("output")

    doc = Document()

    # Title
    t = doc.add_heading(title, 0)
    t.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # Process content
    lines = content_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            doc.add_paragraph()
            continue
            
        # Detect headers
        if line.startswith('###') or (line.startswith('**') and line.endswith('**')):
            h = doc.add_heading(line.replace('###', '').replace('**', '').strip(), level=2)
        elif line.startswith('##'):
            h = doc.add_heading(line.replace('##', '').strip(), level=1)
        elif line.startswith('#'):
            h = doc.add_heading(line.replace('#', '').strip(), level=0)
        else:
            p = doc.add_paragraph()
            # Simple bolding translation for **text**
            parts = line.split('**')
            for i, part in enumerate(parts):
                run = p.add_run(part)
                if i % 2 != 0:
                    run.bold = True

    doc.save(output_path)
    return output_path
