import os
import google.generativeai as genai

def generate_report_with_ai(prompt_instruction, content):
    """
    Generates a structured medical/academic report using Google Gemini API.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return "Gemini API Key is required. Please set GEMINI_API_KEY in your .env file."

    # Configure Gemini API
    genai.configure(api_key=api_key)

    try:
        # Using gemini-2.5-flash as indicated by the 'available models' list
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Build prompt
        full_prompt = f"""
System Instruction:
You are an academic report generator assistant.

User Instruction:
{prompt_instruction}

Content to process:
{content}
"""

        response = model.generate_content(full_prompt)

        if response and response.text:
            return response.text
        elif response:
             return f"Gemini returned an empty response. Status: {str(response)}"
        else:
            return "Gemini returned an empty response."

    except Exception as e:
        return f"Error with Gemini generation: {str(e)}"