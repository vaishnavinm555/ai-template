import os
import re
import html
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT

def create_pdf_report(content_text, filename, title="AI Generated Academic Document"):
    """
    Converts plain text or markdown-style text into a clean PDF document.
    """
    output_path = os.path.join("output", filename)
    if not os.path.exists("output"):
        os.makedirs("output")

    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_LEFT
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor='#007bff'
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=10
    )

    elements = []
    
    # Title - escaping special chars
    safe_title = html.escape(title)
    elements.append(Paragraph(safe_title, title_style))
    elements.append(Spacer(1, 12))

    # Process content
    lines = content_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            elements.append(Spacer(1, 12))
            continue
            
        # 1. Escape basic HTML chars since ReportLab Paragraphs use XML
        line = html.escape(line)
        
        # 2. Convert Markdown bold **text** to <b>text</b> correctly
        line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)

        # Detect headers (simplistic markdown detection)
        if line.startswith('###'):
            elements.append(Paragraph(line.replace('###', '').strip(), section_style))
        elif line.startswith('##'):
            elements.append(Paragraph(line.replace('##', '').strip(), section_style))
        elif line.startswith('#'):
            elements.append(Paragraph(line.replace('#', '').strip(), section_style))
        elif line.startswith('&lt;b&gt;') and line.endswith('&lt;/b&gt;'):
             # Handle already bolded lines if they are meant to be sections
             elements.append(Paragraph(line, section_style))
        else:
            elements.append(Paragraph(line, body_style))

    doc.build(elements)
    return output_path
