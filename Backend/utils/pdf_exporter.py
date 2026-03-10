import os
import re
import html
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors

def create_pdf_report(content_text, filename, title="AI Generated Academic Document"):
    """
    Converts plain text or markdown-style text into a clean PDF document.
    Handles headings, tables, bolding, and icons.
    """
    output_path = os.path.join("output", filename)
    if not os.path.exists("output"):
        os.makedirs("output")

    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            rightMargin=50, leftMargin=50,
                            topMargin=50, bottomMargin=50)

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=22,
        spaceAfter=20,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#1a5f7a')
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#2d89ef'),
        leading=16
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    quote_style = ParagraphStyle(
        'QuoteStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        leftIndent=20,
        rightIndent=20,
        fontName='Helvetica-Oblique',
        textColor=colors.grey,
        spaceBefore=10,
        spaceAfter=10
    )

    elements = []
    
    # Title
    safe_title = html.escape(title)
    elements.append(Paragraph(safe_title, title_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1a5f7a'), spaceAfter=20))

    # Process content line by line with simple table state machine
    lines = content_text.split('\n')
    table_data = []
    is_table = False

    for line in lines:
        stripped_line = line.strip()
        
        # Table detection
        if stripped_line.startswith('|') and stripped_line.endswith('|'):
            # Skip separator line like |---|---|
            if re.match(r'^\|[\s\-\:\!\|]+\|$', stripped_line):
                continue
            
            cells = [cell.strip() for cell in stripped_line.split('|') if cell.strip() or (cell == '' and stripped_line.count('|') > 1)]
            if cells:
                table_data.append(cells)
                is_table = True
            continue
        else:
            if is_table:
                # Flush table
                if table_data:
                    t = Table(table_data, hAlign='LEFT')
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f2f2f2')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#333333')),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ]))
                    elements.append(t)
                    elements.append(Spacer(1, 15))
                    table_data = []
                is_table = False

        if not stripped_line:
            elements.append(Spacer(1, 8))
            continue

        # Horizontal Divider
        if stripped_line == '---' or stripped_line == '***':
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceBefore=10, spaceAfter=10))
            continue

        # Blockquote
        if stripped_line.startswith('>'):
            content = stripped_line.lstrip('> ').strip()
            elements.append(Paragraph(html.escape(content), quote_style))
            continue

        # Headings
        if stripped_line.startswith('# '):
            elements.append(Paragraph(html.escape(stripped_line[2:]), title_style))
        elif stripped_line.startswith('## '):
            elements.append(Paragraph(html.escape(stripped_line[3:]), section_style))
        elif stripped_line.startswith('### '):
            elements.append(Paragraph(html.escape(stripped_line[4:]), section_style))
        else:
            # Basic Markdown Bold/Italic
            processed_line = html.escape(stripped_line)
            processed_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', processed_line)
            processed_line = re.sub(r'\*(.*?)\*', r'<i>\1</i>', processed_line)
            elements.append(Paragraph(processed_line, body_style))

    # Catch last table if file ends with one
    if is_table and table_data:
        t = Table(table_data, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f2f2f2')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(t)

    doc.build(elements)
    return output_path
