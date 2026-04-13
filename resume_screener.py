import os
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY")
MODEL = os.getenv("AI_MODEL_NAME", "gpt-4o-mini").replace("openai/", "")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


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


def _call_openai(prompt: str) -> str:
    """
    Call the OpenAI Chat Completions API directly via urllib.
    No SDK, no pydantic, no heavy dependencies.
    """
    if not API_KEY:
        raise ValueError(
            "OPENAI_API_KEY (or AI_API_KEY) is not set. "
            "Add it to your .env file or Lambda environment variables."
        )

    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_completion_tokens": 4096,
        "response_format": {"type": "json_object"}
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENAI_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        logger.error(f"OpenAI API HTTP error {e.code}: {error_body}")
        raise RuntimeError(f"OpenAI API error {e.code}: {error_body}") from e


def rank_candidates(
    jd_text: str,
    resumes: list,
    special_instructions: str = ""
) -> list:
    """
    Use the OpenAI API directly to rank candidates against a job description.

    Args:
        jd_text: The job description text
        resumes: List of dicts with 'name', 'filename', 'text' keys
        special_instructions: Additional recruiter instructions

    Returns:
        List of ranked candidates with scores and reasoning
    """
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

Return your response as a valid JSON object with a top-level key "candidates" containing an array in this exact format:
{{
  "candidates": [
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
}}

The "recommendation" field should be one of: "Highly Recommended", "Recommended", "Consider", "Not Recommended"

Rank them from highest to lowest score. Be objective, fair, and thorough in your analysis.
Only return the JSON object, nothing else."""

    try:
        response_text = _call_openai(prompt)

        # Clean up markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines[-1].strip() == "```" else lines
            response_text = "\n".join(lines)

        parsed = json.loads(response_text)

        # Unwrap nested keys if necessary
        if isinstance(parsed, dict):
            for key in ["candidates", "rankings", "ranked_list"]:
                if key in parsed and isinstance(parsed[key], list):
                    parsed = parsed[key]
                    break
            else:
                if not isinstance(parsed, list):
                    parsed = [parsed]

        # Validate and normalise each candidate entry
        final_ranked = []
        for i, candidate in enumerate(parsed):
            if not isinstance(candidate, dict):
                continue
            candidate["rank"] = i + 1
            candidate.setdefault("strengths", [])
            candidate.setdefault("gaps", [])
            candidate.setdefault("assessment", "No assessment provided.")
            candidate.setdefault("recommendation", "Consider")
            try:
                candidate["score"] = max(0, min(100, int(candidate.get("score", 50))))
            except (TypeError, ValueError):
                candidate["score"] = 50
            final_ranked.append(candidate)

        return final_ranked

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {e}")
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
        logger.error(f"OpenAI API error: {e}", exc_info=True)
        raise
