import os
import json
import logging
from pathlib import Path
from typing import Optional
from litellm import completion
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configure AI configuration
# For LiteLLM, we set model-specific keys as environment variables
# e.g. ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
# The AI_API_KEY will be mapped to the appropriate provider key if needed
api_key = os.getenv("AI_API_KEY")
model_name = os.getenv("AI_MODEL_NAME", "gemini/gemini-2.0-flash")

if api_key:
    # Set the provider-specific key for LiteLLM if it's not already set
    provider = model_name.split("/")[0] if "/" in model_name else "gemini"
    
    if provider == "gemini":
        os.environ["GEMINI_API_KEY"] = api_key
    elif provider == "anthropic":
        os.environ["ANTHROPIC_API_KEY"] = api_key
    elif provider == "openai":
        os.environ["OPENAI_API_KEY"] = api_key
else:
    logger.warning("AI_API_KEY not set. AI screening will not work.")


def extract_text(file_path: str) -> str:
    """Extract text from PDF, DOCX, or TXT files."""
    path = Path(file_path)
    ext = path.suffix.lower()

    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

        elif ext == ".pdf":
            import PyPDF2
            text_parts = []
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
            return "\n".join(text_parts)

        elif ext == ".docx":
            from docx import Document
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(paragraphs)

        else:
            logger.warning(f"Unsupported file type: {ext}")
            return ""

    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return ""


def rank_candidates(
    jd_text: str,
    resumes: list[dict],
    special_instructions: str = ""
) -> list[dict]:
    """
    Use AI (via LiteLLM) to rank candidates based on their resumes against the job description.

    Args:
        jd_text: The job description text
        resumes: List of dicts with 'name', 'filename', 'text' keys
        special_instructions: Additional recruiter instructions

    Returns:
        List of ranked candidates with scores and reasoning
    """
    if not os.getenv("AI_API_KEY") and not any(k in os.environ for k in ["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]):
        raise ValueError(
            "AI_API_KEY is not configured. Please add it to your .env file."
        )

    # Build the resume summaries for the prompt
    resume_summaries = []
    for i, resume in enumerate(resumes, 1):
        resume_summaries.append(
            f"--- CANDIDATE {i}: {resume['name']} ---\n{resume['text'][:3000]}"
        )

    resumes_text = "\n\n".join(resume_summaries)

    special_section = ""
    if special_instructions:
        special_section = f"""
SPECIAL RECRUITER INSTRUCTIONS:
{special_instructions}

Please factor these instructions heavily into your ranking.
"""

    prompt = f"""You are an expert technical recruiter and talent acquisition specialist. 
Your task is to analyze the following resumes against a job description and rank the candidates 
in order of their suitability for the role.

JOB DESCRIPTION:
{jd_text[:4000]}

{special_section}

CANDIDATE RESUMES:
{resumes_text}

Please analyze each candidate thoroughly and provide a ranked list. For each candidate, provide:
1. A match score from 0-100 (100 being a perfect match)
2. Key strengths that align with the job requirements
3. Notable gaps or concerns
4. A brief overall assessment (2-3 sentences)

Return your response as a valid JSON array (and ONLY the JSON array, no other text) in this exact format:
[
  {{
    "rank": 1,
    "name": "Candidate Name",
    "score": 92,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "gaps": ["gap 1", "gap 2"],
    "assessment": "Brief overall assessment of the candidate.",
    "recommendation": "Highly Recommended"
  }}
]

The "recommendation" field should be one of: "Highly Recommended", "Recommended", "Consider", "Not Recommended"

Rank them from highest to lowest score. Be objective, fair, and thorough in your analysis.
Only return the JSON array, nothing else."""

    try:
        model = os.getenv("AI_MODEL_NAME", "gemini/gemini-2.0-flash")
        
        response = completion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=4096,
            response_format={ "type": "json_object" } if "gpt" in model or "gemini" in model else None
        )
        
        response_text = response.choices[0].message.content.strip()

        # Clean up response - sometimes LLMs wrap in markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            response_text = "\n".join(lines)

        ranked = json.loads(response_text)

        # Handle cases where the whole object is nested under a key like "candidates" or similar
        if isinstance(ranked, dict):
            for key in ["candidates", "rankings", "ranked_list"]:
                if key in ranked and isinstance(ranked[key], list):
                    ranked = ranked[key]
                    break
            else:
                # If it's a single object instead of a list
                if not isinstance(ranked, list):
                    ranked = [ranked]

        # Validate and enrich the response
        final_ranked = []
        for i, candidate in enumerate(ranked):
            if not isinstance(candidate, dict): continue
            
            candidate["rank"] = i + 1
            candidate.setdefault("strengths", [])
            candidate.setdefault("gaps", [])
            candidate.setdefault("assessment", "No assessment provided.")
            candidate.setdefault("recommendation", "Consider")
            
            try:
                candidate["score"] = max(0, min(100, int(candidate.get("score", 50))))
            except:
                candidate["score"] = 50
                
            final_ranked.append(candidate)

        return final_ranked

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Response was: {response_text[:500]}")
        return [
            {
                "rank": i + 1,
                "name": r["name"],
                "score": 0,
                "strengths": [],
                "gaps": [],
                "assessment": "AI analysis failed to format as JSON. Please try again.",
                "recommendation": "Consider"
            }
            for i, r in enumerate(resumes)
        ]
    except Exception as e:
        logger.error(f"AI API error: {e}", exc_info=True)
        raise
