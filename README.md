# Resume Screener — Smart Candidate Ranking

Resume Screener is an AI-powered web application designed to help recruiters and hiring managers streamline their candidate screening process. By leveraging Large Language Models (LLMs), it automatically ranks candidates based on how well their resumes match a specific job description, factoring in special recruiter instructions.

![App Screenshot](static/images/hero-preview.png) *(Note: Ensure you have a preview image or remove this placeholder)*

## 🚀 Features

- **Multi-Format Support**: Process Job Descriptions and Resumes in PDF, DOCX, and TXT formats.
- **AI-Powered Ranking**: Uses LiteLLM to integrate with top AI providers (Gemini, Anthropic, OpenAI) for intelligent candidate assessment.
- **Match Scoring**: Get an objective 0-100 score for each candidate.
- **Detailed Insights**: View key strengths, notable gaps, and a brief overall assessment for every applicant.
- **Special Instructions**: Direct the AI to prioritize specific skills, experience levels, or culture fit criteria.
- **Premium UI**: Modern, responsive, and high-performance interface with dark mode and smooth animations.

## 🛠️ Tech Stack

- **Backend**: Python, Flask
- **AI Integration**: LiteLLM (supporting Gemini, OpenAI, Claude, etc.)
- **File Parsing**: PyPDF2, python-docx
- **Frontend**: Vanilla HTML5, CSS3 (Modern HSL system), JavaScript (ES6+)

## 📋 Prerequisites

- Python 3.9+
- An API key for an AI provider (e.g., Google Gemini, Anthropic, or OpenAI)

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd resume_screener
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your configuration:
   ```env
   # API Keys
   AI_API_KEY=your_api_key_here
   AI_MODEL_NAME=gemini/gemini-2.0-flash  # Default: gemini/gemini-2.0-flash

   # Flask Security
   FLASK_SECRET_KEY=your_random_secret_key
   ```

## 🏃 Running the Application

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. **Access the application**:
   Open your browser and navigate to `http://127.0.0.1:5000`.

## 📖 Usage Guide

1. **Upload Job Description**: Start by uploading the JD for the role you're hiring for.
2. **Upload Resumes**: Select one or multiple candidate resumes.
3. **Add Instructions (Optional)**: Provide specific criteria you want the AI to emphasize.
4. **Screen Candidates**: Click "Screen Candidates" and wait for the AI to analyze and rank the results.
5. **Review Results**: Examine the ranked list, scores, and detailed reasoning for each candidate.

---

Built with ❤️ for better hiring.
