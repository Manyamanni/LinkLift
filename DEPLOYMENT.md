# Deployment Guide

This guide will help you deploy LinkLift to Render (Backend) and Vercel (Frontend).

## Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at https://render.com
3. **Vercel Account** - Sign up at https://vercel.com
4. **Neon PostgreSQL Database** - Sign up at https://neon.tech (or use Render's PostgreSQL)
5. **Gmail Account** - For email verification (or use another SMTP service)

---

## Part 1: Deploy Backend to Render

### Step 1: Create PostgreSQL Database

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name:** `linklift-db`
   - **Database:** `linklift`
   - **User:** `linklift_user` (or auto-generated)
   - **Region:** Choose closest to you
   - **PostgreSQL Version:** Latest
4. Click **"Create Database"**
5. Copy the **Internal Database URL** (you'll need this)

### Step 2: Deploy Backend Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the repository: `Manyamanni/LinkLift`
4. Configure:
   - **Name:** `linklift-backend`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`

### Step 3: Set Environment Variables

In Render dashboard, go to your service → **"Environment"** tab, add:

```
SECRET_KEY=<generate-a-random-secret-key>
JWT_SECRET_KEY=<generate-another-random-secret-key>
DATABASE_URL=<paste-internal-database-url-from-step-1>
ALLOWED_ORIGINS=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_DEFAULT_SENDER=noreply@linklift.com
```

**Important Notes:**
- Generate random keys: Use `python -c "import secrets; print(secrets.token_hex(32))"` for SECRET_KEY and JWT_SECRET_KEY
- **Gmail App Password:** 
  - Go to Google Account → Security → 2-Step Verification → App Passwords
  - Generate a new app password for "Mail"
  - Use this as `MAIL_PASSWORD`
- **ALLOWED_ORIGINS:** Update this after you get your Vercel URL
- **FRONTEND_URL:** Update this after you get your Vercel URL

### Step 4: Initialize Database

1. After deployment, go to your service → **"Logs"**
2. The database tables will be created automatically on first request
3. Or SSH into the service and run: `python reset_database.py` (if needed)

### Step 5: Get Backend URL

After deployment, Render will provide a URL like:
```
https://linklift-backend.onrender.com
```

**Save this URL** - you'll need it for the frontend!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Import Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `Manyamanni/LinkLift`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

### Step 2: Set Environment Variables

In Vercel project settings → **"Environment Variables"**, add:

```
VITE_API_URL=https://linklift-backend.onrender.com/api
```

**Important:** Replace `https://linklift-backend.onrender.com` with your actual Render backend URL!

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Vercel will provide a URL like: `https://linklift-xxx.vercel.app`

### Step 4: Update Backend CORS

1. Go back to Render dashboard
2. Update the `ALLOWED_ORIGINS` environment variable:
   ```
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
4. **Redeploy** the backend service (Render will auto-redeploy on env var change)

---

## Part 3: Final Configuration

### Update Email Verification Links

The backend is already configured to use `FRONTEND_URL` for email verification links. Make sure it's set correctly in Render.

### Test Deployment

1. **Frontend:** Visit your Vercel URL
2. **Backend:** Test API at `https://your-backend.onrender.com/api/cities`
3. **Signup:** Create a test account and verify email
4. **Login:** Test authentication flow

---

## Troubleshooting

### Backend Issues

- **Database Connection Error:** Check `DATABASE_URL` is correct
- **CORS Error:** Verify `ALLOWED_ORIGINS` includes your Vercel URL
- **Email Not Sending:** Check Gmail app password is correct

### Frontend Issues

- **API Calls Failing:** Verify `VITE_API_URL` is set correctly
- **404 on Routes:** Vercel rewrites should handle this (check `vercel.json`)

### Common Fixes

1. **Clear browser cache** after deployment
2. **Check Render logs** for backend errors
3. **Check Vercel build logs** for frontend errors
4. **Verify environment variables** are set correctly

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Database connected and tables created
- [ ] Frontend deployed and accessible
- [ ] Environment variables set correctly
- [ ] CORS configured for Vercel domain
- [ ] Email verification working
- [ ] Test signup/login flow
- [ ] Test ride creation and search

---

## URLs to Save

- **Backend URL:** `https://linklift-backend.onrender.com`
- **Frontend URL:** `https://linklift-xxx.vercel.app`
- **Database URL:** (Internal - stored in Render)

---

## Notes

- Render free tier spins down after 15 minutes of inactivity (first request may be slow)
- Vercel free tier is generous and fast
- Consider upgrading to paid tiers for production use
- Monitor Render logs for any issues
- Set up custom domains if needed

