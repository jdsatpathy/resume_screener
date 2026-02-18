import os
import json
import uuid
import logging
from pathlib import Path
from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from resume_screener import extract_text, rank_candidates

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "resume-screener-secret-2024")

# Configuration
UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max

app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_session_upload_dir() -> Path:
    """Create a unique upload directory per session."""
    session_id = session.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
        session["session_id"] = session_id
    upload_dir = UPLOAD_FOLDER / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/screen", methods=["POST"])
def screen():
    try:
        upload_dir = get_session_upload_dir()

        # --- Job Description ---
        jd_file = request.files.get("job_description")
        if not jd_file or jd_file.filename == "":
            return jsonify({"error": "Please upload a Job Description file."}), 400
        if not allowed_file(jd_file.filename):
            return jsonify({"error": "Job Description must be a PDF, DOCX, or TXT file."}), 400

        jd_filename = secure_filename(jd_file.filename)
        jd_path = upload_dir / f"jd_{jd_filename}"
        jd_file.save(jd_path)
        jd_text = extract_text(str(jd_path))

        if not jd_text.strip():
            return jsonify({"error": "Could not extract text from the Job Description file."}), 400

        # --- Resumes ---
        resume_files = request.files.getlist("resumes")
        if not resume_files or all(f.filename == "" for f in resume_files):
            return jsonify({"error": "Please upload at least one resume."}), 400

        resumes = []
        for resume_file in resume_files:
            if resume_file.filename == "":
                continue
            if not allowed_file(resume_file.filename):
                logger.warning(f"Skipping unsupported file: {resume_file.filename}")
                continue
            filename = secure_filename(resume_file.filename)
            resume_path = upload_dir / f"resume_{filename}"
            resume_file.save(resume_path)
            text = extract_text(str(resume_path))
            if text.strip():
                # Use original filename (without extension) as candidate name
                candidate_name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
                resumes.append({
                    "name": candidate_name,
                    "filename": filename,
                    "text": text
                })

        if not resumes:
            return jsonify({"error": "No valid resumes could be processed. Please upload PDF, DOCX, or TXT files."}), 400

        # --- Special Instructions ---
        special_instructions = request.form.get("special_instructions", "").strip()

        # --- AI Ranking ---
        logger.info(f"Screening {len(resumes)} candidates against job description...")
        ranked_results = rank_candidates(jd_text, resumes, special_instructions)

        # Clean up uploaded files
        try:
            import shutil
            shutil.rmtree(upload_dir)
            session.pop("session_id", None)
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")

        return jsonify({
            "success": True,
            "results": ranked_results,
            "total_candidates": len(resumes)
        })

    except Exception as e:
        logger.error(f"Screening error: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred during screening: {str(e)}"}), 500


if __name__ == "__main__":
    UPLOAD_FOLDER.mkdir(exist_ok=True)
    app.run(debug=True, host="0.0.0.0", port=5000)
