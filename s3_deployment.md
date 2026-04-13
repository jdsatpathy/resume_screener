# S3 and Lambda Deployment Guide

This guide explains how to deploy the Resume Screener frontend to AWS S3 and the backend logic to AWS Lambda.

## Phase 1: AWS Lambda Backend

The backend logic is consolidated in `lambda_function.py` and `resume_screener.py`.

### 1. Prepare Deployment Package
Lambda requires all dependencies to be included in the deployment package, specifically compiled for an Amazon Linux environment.

1. Ensure Docker is running.
2. Run the `make` command to auto-generate the deployment zip:
   ```bash
   make package
   ```
3. This creates a `lambda_deploy.zip` in your root directory containing all code and cross-compiled dependencies.

### 2. Create Lambda Function
1. Go to **AWS Lambda** console -> **Create function**.
2. Upload the `lambda_deploy.zip`.
3. Set the **Runtime** to Python 3.x.
4. Set the **Handler** to `lambda_function.lambda_handler`.
5. **Important**: Increase the timeout (e.g., 30s) and memory (e.g., 512MB) since AI calls take time.
6. Add your environment variables (`AI_API_KEY`, etc.) in the Lambda configuration.

### 3. Set Up API Gateway
1. Create an **API Gateway** (HTTP API or REST API).
2. Create a `POST /screen` route and link it to your Lambda.
3. **Enable CORS** in API Gateway to allow `https://jd-resume-scrneer-bkt.s3.amazonaws.com`.
4. Deploy the API and note the **Invoke URL**.

---

## Phase 2: S3 Frontend

### 1. Configure Frontend URL
In `public/index.html`, add your API URL *before* the script tag:
```html
<script>
    window.API_BASE_URL = 'https://YOUR_API_GATEWAY_URL';
</script>
<script src="static/js/app.js"></script>
```

### 2. Upload to S3
1. Go to **AWS S3** -> Create/Select bucket `jd-resume-scrneer-bkt`.
2. Upload all files from the `public/` folder:
   - `index.html`
   - `static/` (css, js, images)
3. In **Properties** -> **Static website hosting**, enable it.
4. In **Permissions**, disable "Block all public access" and add a bucket policy to allow public read access:
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "PublicRead",
               "Effect": "Allow",
               "Principal": "*",
               "Action": "s3:GetObject",
               "Resource": "arn:aws:s3:::jd-resume-scrneer-bkt/*"
           }
       ]
   }
   ```

---

## Testing locally with the S3 structure
You can test the static `public/` folder locally using:
```bash
cd public && npx serve
```
This will simulate how the site behaves when hosted statically.
