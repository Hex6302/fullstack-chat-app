# Free Hosting Deployment Guide

This guide will help you deploy your fullstack chat application completely free using:
- **Backend**: Render.com (Free Tier)
- **Frontend**: Vercel or Netlify (Free Tier)
- **Database**: MongoDB Atlas (Free Tier - M0)
- **Redis**: Upstash (Free Tier) - Optional
- **File Storage**: Cloudinary (Free Tier)

## Prerequisites

1. GitHub account (to host your code)
2. Render.com account
3. Vercel or Netlify account
4. MongoDB Atlas account
5. Cloudinary account
6. Upstash account (optional, for Redis)

---

## Step 1: Set Up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new cluster (select the FREE M0 tier)
4. Choose a cloud provider and region (choose one closest to your users)
5. Create a database user:
   - Go to "Database Access" → "Add New Database User"
   - Username: `chatapp_user`
   - Password: Generate a secure password (save it!)
   - Database User Privileges: "Atlas admin"
6. Whitelist IP addresses:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
7. Get your connection string:
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `chat-app` (or your preferred database name)
   - Example: `mongodb+srv://chatapp_user:yourpassword@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority`

---

## Step 2: Set Up Cloudinary (Free Tier)

1. Go to [Cloudinary](https://cloudinary.com/users/register/free)
2. Sign up for a free account
3. Go to your Dashboard
4. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

---

## Step 3: Set Up Upstash Redis (Optional - Free Tier)

1. Go to [Upstash](https://upstash.com/)
2. Sign up for a free account
3. Create a new Redis database:
   - Click "Create Database"
   - Name: `chat-app-redis`
   - Type: Regional (choose a region close to your backend)
   - Click "Create"
4. Copy your Redis connection details:
   - Endpoint (host)
   - Port
   - Password

---

## Step 4: Deploy Backend to Render.com

### 4.1 Prepare Your Repository

1. Push your code to GitHub (if not already done)
2. Make sure your `backend` folder has a `package.json` with a `start` script

### 4.2 Create Render Web Service

1. Go to [Render.com](https://render.com/) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `chat-app-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your main branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free

### 4.3 Set Environment Variables in Render

Click "Environment" tab and add these variables:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-different-from-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_DOMAIN=your-frontend-domain.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://your-frontend-domain.netlify.app
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
REDIS_HOST=your_upstash_redis_endpoint
REDIS_PORT=your_upstash_redis_port
REDIS_PASSWORD=your_upstash_redis_password
```

**Important Notes:**
- Replace `your-frontend-domain.vercel.app` with your actual frontend URL (you'll get this after deploying the frontend)
- If not using Redis, you can omit the REDIS_* variables (the app will work without Redis)
- Generate a strong JWT_SECRET (use a random string generator)

### 4.4 Deploy

1. Click "Create Web Service"
2. Wait for the deployment to complete
3. Copy your backend URL (e.g., `https://chat-app-backend.onrender.com`)

---

## Step 5: Deploy Frontend to Vercel (Recommended)

### 5.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 5.2 Deploy via Vercel Dashboard

1. Go to [Vercel](https://vercel.com/) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 5.3 Set Environment Variables

Add these environment variables in Vercel:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_SOCKET_URL=https://your-backend-url.onrender.com
```

Replace `your-backend-url.onrender.com` with your actual Render backend URL.

### 5.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy your frontend URL (e.g., `https://your-app.vercel.app`)

### 5.5 Update Backend CORS Settings

1. Go back to Render dashboard
2. Update the `ALLOWED_ORIGINS` environment variable to include your Vercel URL:
   ```
   https://your-app.vercel.app,https://your-app.vercel.app
   ```
3. Redeploy the backend

---

## Step 6: Deploy Frontend to Netlify (Alternative)

### 6.1 Deploy via Netlify Dashboard

1. Go to [Netlify](https://www.netlify.com/) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/dist`

### 6.2 Set Environment Variables

Go to "Site settings" → "Environment variables" and add:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_SOCKET_URL=https://your-backend-url.onrender.com
```

### 6.3 Update netlify.toml

Edit `frontend/netlify.toml` and replace `your-backend-url.onrender.com` with your actual backend URL.

### 6.4 Deploy

1. Click "Deploy site"
2. Wait for deployment
3. Copy your Netlify URL (e.g., `https://your-app.netlify.app`)

### 6.5 Update Backend CORS

Update `ALLOWED_ORIGINS` in Render to include your Netlify URL.

---

## Step 7: Update Frontend Configuration

After deploying, update these files with your actual backend URL:

1. **For Vercel**: Update `frontend/vercel.json` (replace `your-backend-url.onrender.com`)
2. **For Netlify**: Update `frontend/netlify.toml` (replace `your-backend-url.onrender.com`)

---

## Step 8: Test Your Deployment

1. Visit your frontend URL
2. Try signing up a new user
3. Test sending messages
4. Check if file uploads work
5. Verify real-time messaging works

---

## Troubleshooting

### Backend Issues

1. **CORS Errors**: Make sure `ALLOWED_ORIGINS` includes your frontend URL (with `https://`)
2. **Database Connection**: Verify your MongoDB Atlas connection string is correct
3. **Environment Variables**: Double-check all environment variables are set correctly
4. **Port Issues**: Render uses port 10000 by default for free tier, but your app should use `process.env.PORT`

### Frontend Issues

1. **API Calls Failing**: Check `VITE_API_URL` is set correctly
2. **Socket.IO Not Connecting**: Verify `VITE_SOCKET_URL` matches your backend URL
3. **Build Errors**: Check that all dependencies are in `package.json`

### Common Solutions

1. **Clear browser cache** after deployment
2. **Check browser console** for errors
3. **Check Render logs** for backend errors
4. **Verify environment variables** are set correctly (case-sensitive)

---

## Free Tier Limitations

### Render.com
- Services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- 750 hours/month free (enough for 24/7 for one service)

### Vercel
- Unlimited deployments
- 100GB bandwidth/month
- No cold starts

### Netlify
- 100GB bandwidth/month
- 300 build minutes/month
- No cold starts

### MongoDB Atlas
- 512MB storage
- Shared RAM and vCPU
- Perfect for development and small apps

### Cloudinary
- 25GB storage
- 25GB bandwidth/month
- Perfect for image uploads

### Upstash Redis
- 10,000 commands/day
- 256MB max database size
- Good for caching and session management

---

## Monitoring Your App

1. **Render Dashboard**: Monitor backend logs and metrics
2. **Vercel/Netlify Dashboard**: Monitor frontend deployments
3. **MongoDB Atlas**: Monitor database usage
4. **Cloudinary Dashboard**: Monitor storage and bandwidth

---

## Next Steps

1. Set up a custom domain (optional)
2. Enable HTTPS (automatic with Vercel/Netlify)
3. Set up monitoring and alerts
4. Configure backup strategies
5. Optimize for performance

---

## Support

If you encounter any issues:
1. Check the logs in your hosting provider's dashboard
2. Verify all environment variables are set correctly
3. Ensure your MongoDB Atlas IP whitelist includes Render's IPs
4. Check that CORS settings match your frontend URL

Happy deploying! 🚀





