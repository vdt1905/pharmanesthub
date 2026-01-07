# Deployment Guide for Vercel

## 1. Prerequisites
- [Vercel CLI](https://vercel.com/docs/cli) installed or Vercel account.
- GitHub repository with your code pushed.

## 2. Environment Variables
You need to set up the following environment variables in your Vercel project settings.

### Backend Project
- `FIREBASE_SERVICE_ACCOUNT`: Copy the **entire content** of `backend/config/serviceAccountKey.json` and paste it as the value. Remove any newlines if copying manually, but Vercel handles multiline values well in the UI.
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name
- `CLOUDINARY_API_KEY`: Your Cloudinary API Key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret

### Frontend Project
- `VITE_API_BASE_URL`: The URL of your deployed backend. 
    - *Tip:* Deploy the backend first to get the URL, then deploy the frontend with this variable set.

## 3. Deploying

### Option A: Import via Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. **Backend Deployment**:
   - Select the repository.
   - In "Root Directory", click "Edit" and select `backend`.
   - Add the Backend Environment Variables.
   - Click **Deploy**.
   - Copy the deployment URL (e.g., `https://your-backend.vercel.app`).
5. **Frontend Deployment**:
   - Import the repository **again**.
   - In "Root Directory", click "Edit" and select `frontend`.
   - Add `VITE_API_BASE_URL` with the value from the backend deployment.
   - Click **Deploy**.

### Option B: Vercel CLI
1. **Backend**:
   ```bash
   cd backend
   vercel
   ```
   Follow prompts. Set env vars in web UI or via `vercel env add`.

2. **Frontend**:
   ```bash
   cd frontend
   vercel
   ```
   Follow prompts. Set `VITE_API_BASE_URL`.

## 4. Verification
- Open the frontend URL.
- Try logging in.
- Verify that PDF lists load and you can upload/view documents.
