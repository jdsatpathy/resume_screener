"""
Local test harness for lambda_function.py
Run with: python test_lambda.py
"""
import sys
import json
import base64
import mimetypes

# ── helper to build a multipart/form-data body ────────────────────────────────
def build_multipart(fields: dict, files: dict):
    """
    fields: {"field_name": "text value"}
    files:  {"field_name": "path/to/file.pdf"}
    Returns (body_bytes, content_type_header)
    """
    boundary = "----TestBoundary1234567890"
    parts = []

    for name, value in fields.items():
        parts.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"\r\n'
            f'\r\n'
            f'{value}\r\n'
        )

    for name, filepath in files.items():
        mime = mimetypes.guess_type(filepath)[0] or "application/octet-stream"
        filename = filepath.split("/")[-1]
        with open(filepath, "rb") as f:
            file_content = f.read()
        header = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            f'Content-Type: {mime}\r\n'
            f'\r\n'
        ).encode("utf-8")
        parts_bytes = header + file_content + b"\r\n"
        parts.append(parts_bytes)

    body = b""
    for p in parts:
        body += p.encode("utf-8") if isinstance(p, str) else p
    body += f"--{boundary}--\r\n".encode("utf-8")

    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type


# ── configure your test files here ────────────────────────────────────────────
JD_FILE       = "test_files/job_description.txt"   # edit path as needed
RESUME_FILES  = ["test_files/resume_1.txt"]        # edit paths as needed
INSTRUCTIONS  = "Prefer candidates with Python experience."

# ── build a mock API Gateway event ───────────────────────────────────────────
def make_event(jd_file, resume_files, instructions):
    boundary = "----TestBoundary1234567890"
    fields = {"special_instructions": instructions}

    # Build body with job description
    files_map = {"job_description": jd_file}
    # For multiple resumes we need to add each one separately
    # Simplified: test with one resume at a time or modify below

    body, content_type = build_multipart(fields, files_map)

    # Add resumes
    for rf in resume_files:
        _, ct_extra = build_multipart({}, {"resumes": rf})
        extra_body, _ = build_multipart({}, {"resumes": rf})
        # Merge: strip trailing boundary from body, prepend the resume part
        body = body.rstrip(b"\r\n") + b"\r\n"
        # Re-build properly with all files
        break  # simple single-resume for test; below is the cleaner approach

    # Cleaner approach: build full multipart in one pass
    all_files = {"job_description": jd_file}
    for i, rf in enumerate(resume_files):
        # multipart allows duplicate field names; we simulate by appending raw parts
        pass

    body, content_type = build_multipart(fields, {"job_description": jd_file})
    # Add resume parts manually
    boundary_str = "----TestBoundary1234567890"
    for rf in resume_files:
        mime = mimetypes.guess_type(rf)[0] or "application/octet-stream"
        filename = rf.split("/")[-1]
        with open(rf, "rb") as f:
            fc = f.read()
        part = (
            f'--{boundary_str}\r\n'
            f'Content-Disposition: form-data; name="resumes"; filename="{filename}"\r\n'
            f'Content-Type: {mime}\r\n\r\n'
        ).encode("utf-8") + fc + b"\r\n"
        # Insert before closing boundary
        body = body[: body.rfind(f"--{boundary_str}--".encode())] + part + f"--{boundary_str}--\r\n".encode()

    return {
        "httpMethod": "POST",
        "headers": {
            "Content-Type": content_type,
            "origin": "http://localhost"
        },
        "body": base64.b64encode(body).decode("utf-8"),
        "isBase64Encoded": True
    }


def main():
    # ── import and call the lambda handler ────────────────────────────────────
    try:
        from lambda_function import lambda_handler
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("  Make sure you are in the project root and dependencies are installed.")
        sys.exit(1)

    print("=== Testing: OPTIONS preflight ===")
    options_event = {
        "httpMethod": "OPTIONS",
        "headers": {"origin": "http://localhost"},
        "body": None,
        "isBase64Encoded": False
    }
    result = lambda_handler(options_event, {})
    print(f"Status: {result['statusCode']}")
    print(f"Headers: {json.dumps(result.get('headers', {}), indent=2)}")
    print()

    print("=== Testing: POST /screen ===")
    try:
        event = make_event(JD_FILE, RESUME_FILES, INSTRUCTIONS)
    except FileNotFoundError as e:
        print(f"⚠️  Test file not found: {e}")
        print("  Create test_files/job_description.txt and test_files/resume_1.txt first.")
        sys.exit(1)

    result = lambda_handler(event, {})
    print(f"Status: {result['statusCode']}")
    body = json.loads(result.get("body", "{}"))
    print(json.dumps(body, indent=2))


if __name__ == "__main__":
    main()
