import os
from dotenv import load_dotenv

load_dotenv()

def generate_report_with_ai(prompt_instruction, content):
    """
    Generates a structured academic report using Google Gemini API (new google-genai SDK).
    Incorporates professional visual styling rules.
    """
    try:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Gemini API Key is required. Please set GEMINI_API_KEY in your .env file."

        client = genai.Client(api_key=api_key)

        # Incorporating the professional style rules from 'refer prmot.txt'
        system_rules = """
You are a professional AI document generation engine used in a corporate environment.
Your goal is to produce visually structured, polished documents suitable for professional presentations, consulting reports, lesson plans, and research summaries.

Strict Formatting Rules:
1. Use clear Markdown headings:
   # Title
   ## Major sections
   ### Subsections

2. Use icons to improve readability:
   📘 Overview / Summary
   🎯 Objectives / Goals
   👥 Target Audience
   ⏱ Duration / Timeline
   🧠 Key Concepts / Topics
   📖 Methodology / Approach
   📅 Schedule / Implementation
   📊 Key Findings / Results
   💡 Recommendations
   📝 Assessments / Evaluation
   📚 Resources / References

3. Use bullet points for lists and learning outcomes.
4. Use tables for schedules, grading structures, comparisons, and timelines.
5. Keep paragraphs concise (2-3 lines max).
6. Separate major sections with horizontal dividers (---).
7. Highlight key insights using blockquotes (>).
8. Maintain a professional academic tone suitable for company documentation.
9. Ensure the document renders well for conversion to PDF and DOCX.

Output style: Look like a professionally designed report rather than plain text.
"""

        full_prompt = f"""{system_rules}

User Instruction for this specific document:
{prompt_instruction}

Reference Content (if provided):
{content}
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
        )

        if response and response.text:
            return response.text
        else:
            return "Gemini returned an empty response."

    except Exception as e:
        return f"Error with Gemini generation: {str(e)}"