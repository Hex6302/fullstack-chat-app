# Quick Start Guide - Free Hosting Setup

This is a simplified guide to get your chat app deployed for free in under 30 minutes.

## 🚀 Quick Deployment Steps

### 1. MongoDB Atlas (5 minutes)

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free M0 cluster
3. Create database user: Username `chatapp`, generate password
4. Network Access: Click "Allow Access from Anywhere" (0.0.0.0/0)
5. Get connection string: Database → Connect → Connect your application
6. Copy the connection string and replace `<password>` and `<dbname>`

### 2. Cloudinary (2 minutes)

1. Sign up at [Cloudinary](https://cloudinary.com/users/register/free)
2. Go to Dashboard
3. Copy: Cloud Name, API Key, API Secret

### 3. Render Backend (10 minutes)

1. Sign up at [Render.com](https://render.com/)
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Name**: `chat-app-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=generate-random-32-char-string
   JWT_REFRESH_SECRET=generate-different-random-32-char-string
   COOKIE_SECURE=true
   COOKIE_SAME_SITE=none
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
6. Deploy and copy your backend URL (e.g., `https://chat-app-backend.onrender.com`)

### 4. Vercel Frontend (5 minutes)

1. Sign up at [Vercel.com](https://vercel.com/)
2. New Project → Import GitHub repo
3. Settings:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```
5. Deploy and copy your frontend URL

### 5. Update Backend CORS (2 minutes)

1. Go back to Render dashboard
2. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://your-frontend.vercel.app
   ```
3. Redeploy backend

### 6. Test (5 minutes)

1. Visit your frontend URL
2. Sign up a new user
3. Test messaging
4. Upload a profile picture

## ✅ Done!

Your app is now live and free!

## 🔧 Optional: Redis (Upstash)

If you want Redis for better performance:

1. Sign up at [Upstash](https://upstash.com/)
2. Create Redis database
3. Copy: Endpoint, Port, Password
4. Add to Render environment variables:
   ```
   REDIS_HOST=your_endpoint.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password
   ```

## 📝 Notes

- Render free tier spins down after 15 min inactivity (first request may be slow)
- MongoDB Atlas free tier: 512MB storage
- Cloudinary free tier: 25GB storage, 25GB bandwidth/month
- All services have generous free tiers perfect for development

## 🆘 Troubleshooting

**CORS Errors?**
- Make sure `ALLOWED_ORIGINS` includes your exact frontend URL (with `https://`)
- Check that `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`

**Database Connection Failed?**
- Verify MongoDB connection string has correct password
- Check MongoDB Atlas IP whitelist includes 0.0.0.0/0

**Socket.IO Not Connecting?**
- Verify `VITE_SOCKET_URL` matches your backend URL
- Check browser console for errors

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)





