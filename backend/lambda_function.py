import os
import json
import base64
import logging
from pathlib import Path
from requests_toolbelt.multipart import decoder
from backend.resume_screener import extract_text, rank_candidates

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    AWS Lambda handler for resume screening.
    Expected to be triggered by API Gateway with multi-part form data.
    """

    # Handle CORS preflight (OPTIONS) request from browser
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS" \
       or event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": get_cors_headers(event),
            "body": ""
        }

    try:
        # Check if the body is base64 encoded
        is_base64 = event.get("isBase64Encoded", False)
        body = event.get("body", "")
        
        if is_base64:
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8')

        content_type = event.get("headers", {}).get("Content-Type") or event.get("headers", {}).get("content-type")
        if not content_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing Content-Type header"})
            }

        # Parse multipart form data
        multipart_data = decoder.MultipartDecoder(body, content_type)
        
        jd_text = ""
        resumes = []
        special_instructions = ""
        
        # Temporary directory for file processing
        tmp_dir = Path("/tmp")
        
        for part in multipart_data.parts:
            content_disposition = part.headers.get(b'Content-Disposition', b'').decode()
            
            if 'name="job_description"' in content_disposition:
                filename = "jd_tmp"
                # Try to extract filename if present
                if 'filename="' in content_disposition:
                    filename = content_disposition.split('filename="')[1].split('"')[0]
                
                ext = Path(filename).suffix or ".txt"
                path = tmp_dir / f"jd{ext}"
                with open(path, "wb") as f:
                    f.write(part.content)
                
                jd_text = extract_text(str(path))
                
            elif 'name="resumes"' in content_disposition:
                filename = "resume_tmp"
                if 'filename="' in content_disposition:
                    filename = content_disposition.split('filename="')[1].split('"')[0]
                
                ext = Path(filename).suffix or ".pdf"
                path = tmp_dir / f"resume_{len(resumes)}{ext}"
                with open(path, "wb") as f:
                    f.write(part.content)
                
                text = extract_text(str(path))
                if text.strip():
                    candidate_name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
                    resumes.append({
                        "name": candidate_name,
                        "filename": filename,
                        "text": text
                    })
                    
            elif 'name="special_instructions"' in content_disposition:
                special_instructions = part.content.decode('utf-8').strip()

        if not jd_text:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(event),
                "body": json.dumps({"error": "Job description is missing or could not be processed."})
            }
            
        if not resumes:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(event),
                "body": json.dumps({"error": "No valid resumes processed."})
            }

        # Rank candidates
        logger.info(f"Screening {len(resumes)} candidates...")
        results = rank_candidates(jd_text, resumes, special_instructions)

        return {
            "statusCode": 200,
            "headers": get_cors_headers(event),
            "body": json.dumps({
                "success": True,
                "results": results,
                "total_candidates": len(resumes)
            })
        }

    except Exception as e:
        logger.error(f"Lambda error: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": get_cors_headers(event),
            "body": json.dumps({"error": f"Internal server error: {str(e)}"})
        }


def get_cors_headers(event=None):
    allowed_origins = [
        "https://staging.d2wqewtzqgr2hk.amplifyapp.com",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ]

    origin = ""
    if event:
        origin = (event.get("headers") or {}).get("origin") \
               or (event.get("headers") or {}).get("Origin") \
               or ""

    # Allow any amplifyapp.com subdomain dynamically
    import re
    if re.match(r"https://[\w\-]+\.amplifyapp\.com", origin):
        allowed_origin = origin
    elif origin in allowed_origins:
        allowed_origin = origin
    else:
        allowed_origin = allowed_origins[0]  # fallback to Amplify staging URL

    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "false"
    }
