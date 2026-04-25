# AWS Deployment Guide

This guide explains how to deploy the Resume Screener application to AWS using the modern serverless stack: **Amplify** for the frontend and **Lambda** for the backend.

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
3. Set the **Runtime** to Python 3.12.
4. Set the **Handler** to `lambda_function.lambda_handler`.
5. **Important**: Increase the timeout (e.g., 60s) and memory (e.g., 512MB) since AI calls take time.
6. Add your environment variables (`OPENAI_API_KEY`, etc.) in the Lambda configuration.

### 3. Set Up API Gateway
1. Create an **API Gateway** (HTTP API is recommended for cost and speed).
2. Create a `POST /screen` route and link it to your Lambda function.
3. **Important**: Configure CORS in the API Gateway console:
   - **Access-Control-Allow-Origin**: `*` (or your specific domain).
   - **Access-Control-Allow-Headers**: `Content-Type`.
   - **Access-Control-Allow-Methods**: `POST, OPTIONS`.
4. Deploy the API and copy the **Invoke URL**.

---

## Phase 2: Frontend Deployment

You have two primary options for hosting the static frontend (`public/` directory).

### Option A: AWS Amplify (Recommended)
AWS Amplify provides a full CI/CD pipeline and handles SSL/CDN automatically.

1. **Connect Repository**: Go to the **AWS Amplify** console and click "Create new app".
2. **Connect Source**: Connect your GitHub/GitLab/Bitbucket repository.
3. **Configure Build Settings**:
   - **App Root**: `/`
   - **Base Directory**: `public/`
4. **Deploy**: Every time you push to `main`, Amplify will automatically rebuild and host your site.

### Option B: AWS S3 (Legacy/Manual)
If you prefer simple static hosting without CI/CD:

1. **Configure API URL**: In `public/index.html`, set `window.API_BASE_URL` to your API Gateway Invoke URL.
2. **Create Bucket**: Create/Select an S3 bucket (e.g., `resume-screener-web`).
3. **Upload Files**: Upload the contents of the `public/` folder (`index.html` and `static/`).
4. **Enable Hosting**: In **Properties**, enable "Static website hosting".
5. **Permissions**: Disable "Block all public access" and apply a Public Read policy:
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [{
           "Sid": "PublicRead",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
       }]
   }
   ```

---

## 🧪 Quick Test Locally
To test the static frontend production build locally:
```bash
# Serve the public folder
npx serve public
```
This will simulate how the site behaves when hosted statically.
