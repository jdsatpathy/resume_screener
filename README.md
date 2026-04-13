# Resume Screener — Smart Candidate Ranking

Resume Screener is an AI-powered application that helps recruiters and hiring managers streamline candidate screening. It automatically ranks resumes against a job description using the OpenAI API, providing objective scores and detailed reasoning for each candidate.

🌐 **Live App**: [https://staging.d2wqewtzqgr2hk.amplifyapp.com](https://staging.d2wqewtzqgr2hk.amplifyapp.com)

---

## 🚀 Features

- **Multi-Format Support**: Upload Job Descriptions and Resumes in PDF, DOCX, or TXT format.
- **AI-Powered Ranking**: Calls the OpenAI API directly (no SDK overhead) for intelligent candidate assessment.
- **Match Scoring**: Objective 0–100 match score for every candidate.
- **Detailed Insights**: Key strengths, notable gaps, and a brief assessment for each applicant.
- **Special Instructions**: Guide the AI to prioritize specific skills, experience, or culture fit.
- **Export Results**: Download the full ranked report natively as a PDF (Beta) or raw TXT file.
- **Premium UI**: Responsive dark-mode interface with smooth animations.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│  AWS Amplify                           │
│  Static Frontend (public/)             │
│   index.html + CSS + JS               │
└─────────────────┬──────────────────────┘
                  │ HTTPS (API Gateway)
                  ▼
┌────────────────────────────────────────┐
│  AWS Lambda                            │
│  lambda_function.py                    │
│   └── resume_screener.py              │
│         └── OpenAI REST API (urllib)  │
└────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend Hosting | AWS Amplify |
| Backend | AWS Lambda + API Gateway |
| AI | OpenAI API (direct `urllib` calls — no SDK) |
| File Parsing | PyPDF2, python-docx |
| Frontend | Vanilla HTML5, CSS3, JavaScript ES6+ |

---

## 📋 Prerequisites

- Python 3.12+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- Docker (for building the Lambda deployment package)
- AWS CLI (optional, for deployment)

---

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd resume_screener
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Copy the example and fill in your API key:
```bash
cp .env.example .env
```

```env
# Required
OPENAI_API_KEY=sk-...

# Optional — defaults to gpt-4o-mini
AI_MODEL_NAME=gpt-4o-mini

# Flask session secret
FLASK_SECRET_KEY=your_random_secret_key
```

### 5. Start the Flask dev server
```bash
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## ☁️ AWS Deployment

See [s3_deployment.md](s3_deployment.md) for a complete step-by-step guide. The summary:

### Frontend → AWS Amplify
1. Connect this repository to **AWS Amplify** via the console.
2. Set the **base directory** to `public/`.
3. Amplify will host and serve the static site with SSL and a CDN automatically.

### Backend → AWS Lambda
Build the deployment package using Docker (ensures Linux-compatible binaries):
```bash
make package
```
This creates `lambda_deploy.zip`. Upload it to your Lambda function in the AWS console.

**Lambda environment variables to configure:**

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `AI_MODEL_NAME` | `gpt-4o-mini` (or any OpenAI model) |

**Important**: After uploading, update `public/index.html` to point `window.API_BASE_URL` at your API Gateway endpoint:
```html
<script>
    window.API_BASE_URL = 'https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com';
</script>
```

---

## 🧪 Testing

### Test Lambda locally (no AWS needed)
```bash
python test_lambda.py
```

### Test API Gateway with curl
```bash
# OPTIONS preflight
curl -X OPTIONS https://YOUR_API_GATEWAY_URL/screen \
  -H "Origin: https://YOUR_AMPLIFY_URL" -v

# POST with real files
curl -X POST https://YOUR_API_GATEWAY_URL/screen \
  -F "job_description=@test_files/job_description.txt" \
  -F "resumes=@test_files/resume_1.txt" \
  -F "special_instructions=Prefer Python engineers with AWS experience" -v
```

### Check Lambda logs
Go to **AWS CloudWatch → Log groups → `/aws/lambda/<function-name>`** to inspect execution logs.

---

## 📁 Project Structure

```
resume_screener/
├── public/                  # Static frontend (deployed to Amplify)
│   ├── index.html
│   └── static/
│       ├── css/style.css
│       ├── js/app.js
│       └── images/
├── templates/               # Jinja2 templates (used by local Flask server)
│   └── index.html
├── static/                  # Assets served by Flask locally
├── test_files/              # Sample files for local testing
├── app.py                   # Flask application (local dev)
├── lambda_function.py       # AWS Lambda entry point
├── resume_screener.py       # Core AI ranking logic (direct OpenAI calls)
├── Makefile                 # Build automation (make package)
├── requirements.txt         # Python dependencies
├── s3_deployment.md         # Full AWS deployment guide
└── .env.example             # Environment variable template
```

---

## 📖 Usage Guide

1. **Upload Job Description** — Upload the JD for the open role (PDF, DOCX, or TXT).
2. **Upload Resumes** — Add one or more candidate resumes.
3. **Add Instructions** *(optional)* — Specify any preferences (e.g. "5+ years Python, startup experience").
4. **Screen Candidates** — Click the button and let the AI rank and score everyone.
5. **Review & Export** — Browse the ranked results and download a report.

---

Built with ❤️ for better hiring.
