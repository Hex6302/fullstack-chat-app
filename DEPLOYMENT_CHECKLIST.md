# Deployment Checklist

Use this checklist to ensure everything is set up correctly for free hosting.

## Pre-Deployment

- [ ] Code pushed to GitHub repository
- [ ] All environment variables documented in `.env.example` files
- [ ] No sensitive data committed to Git (check `.gitignore`)

## MongoDB Atlas Setup

- [ ] Account created at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Free M0 cluster created
- [ ] Database user created (username and password saved)
- [ ] IP whitelist configured (0.0.0.0/0 for development)
- [ ] Connection string copied and password replaced
- [ ] Database name chosen (e.g., `chat-app`)

## Cloudinary Setup

- [ ] Account created at [Cloudinary](https://cloudinary.com/)
- [ ] Cloud Name copied
- [ ] API Key copied
- [ ] API Secret copied

## Upstash Redis Setup (Optional)

- [ ] Account created at [Upstash](https://upstash.com/)
- [ ] Redis database created
- [ ] Endpoint copied
- [ ] Port noted (usually 6379)
- [ ] Password copied

## Render Backend Deployment

- [ ] Account created at [Render.com](https://render.com/)
- [ ] GitHub repository connected
- [ ] Web service created with correct settings:
  - [ ] Name: `chat-app-backend`
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `node src/index.js`
  - [ ] Plan: Free
- [ ] Environment variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `MONGODB_URI` (with actual connection string)
  - [ ] `JWT_SECRET` (secure random string, 32+ characters)
  - [ ] `JWT_REFRESH_SECRET` (different secure random string)
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `JWT_REFRESH_EXPIRES_IN=30d`
  - [ ] `COOKIE_SECURE=true`
  - [ ] `COOKIE_SAME_SITE=none`
  - [ ] `ALLOWED_ORIGINS` (placeholder for now)
  - [ ] `CLOUDINARY_CLOUD_NAME`
  - [ ] `CLOUDINARY_API_KEY`
  - [ ] `CLOUDINARY_API_SECRET`
  - [ ] `REDIS_HOST` (if using Redis)
  - [ ] `REDIS_PORT` (if using Redis)
  - [ ] `REDIS_PASSWORD` (if using Redis)
- [ ] Backend deployed successfully
- [ ] Backend URL copied (e.g., `https://chat-app-backend.onrender.com`)
- [ ] Health check endpoint working: `https://your-backend-url.onrender.com/api/health`

## Vercel Frontend Deployment

- [ ] Account created at [Vercel.com](https://vercel.com/)
- [ ] GitHub repository connected
- [ ] Project created with correct settings:
  - [ ] Framework: Vite
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Environment variables set:
  - [ ] `VITE_API_URL=https://your-backend-url.onrender.com/api`
  - [ ] `VITE_SOCKET_URL=https://your-backend-url.onrender.com`
- [ ] Frontend deployed successfully
- [ ] Frontend URL copied (e.g., `https://your-app.vercel.app`)

## Netlify Frontend Deployment (Alternative)

- [ ] Account created at [Netlify.com](https://www.netlify.com/)
- [ ] GitHub repository connected
- [ ] Site created with correct settings:
  - [ ] Base directory: `frontend`
  - [ ] Build command: `npm install && npm run build`
  - [ ] Publish directory: `frontend/dist`
- [ ] Environment variables set:
  - [ ] `VITE_API_URL=https://your-backend-url.onrender.com/api`
  - [ ] `VITE_SOCKET_URL=https://your-backend-url.onrender.com`
- [ ] `netlify.toml` updated with backend URL (if using proxy)
- [ ] Frontend deployed successfully
- [ ] Frontend URL copied (e.g., `https://your-app.netlify.app`)

## Post-Deployment Configuration

- [ ] Backend `ALLOWED_ORIGINS` updated with frontend URL
- [ ] Backend `COOKIE_DOMAIN` updated with frontend domain
- [ ] Backend redeployed after CORS update
- [ ] Frontend configuration files updated (if needed):
  - [ ] `frontend/vercel.json` (if using Vercel)
  - [ ] `frontend/netlify.toml` (if using Netlify)

## Testing

- [ ] Frontend loads without errors
- [ ] User can sign up
- [ ] User can log in
- [ ] Profile picture upload works
- [ ] Messages can be sent
- [ ] Messages are received in real-time
- [ ] Socket.IO connection works (check browser console)
- [ ] No CORS errors in browser console
- [ ] Cookies are set correctly (check browser DevTools)
- [ ] Logout works
- [ ] Multiple users can chat simultaneously

## Security Checklist

- [ ] All environment variables set (no defaults in production)
- [ ] JWT secrets are strong and unique
- [ ] MongoDB password is strong
- [ ] CORS only allows your frontend domain
- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] Cookies set with `Secure` flag in production
- [ ] No sensitive data in frontend code
- [ ] API keys not exposed in client-side code

## Monitoring

- [ ] Render dashboard shows backend is running
- [ ] Vercel/Netlify dashboard shows frontend is deployed
- [ ] MongoDB Atlas shows database is active
- [ ] Cloudinary dashboard shows uploads working
- [ ] Error logs checked (if any)

## Optional Enhancements

- [ ] Custom domain configured
- [ ] SSL certificate verified (automatic with Vercel/Netlify)
- [ ] Analytics set up (optional)
- [ ] Error tracking set up (optional)
- [ ] Backup strategy in place

## Troubleshooting

If something doesn't work:

1. [ ] Check browser console for errors
2. [ ] Check Render logs for backend errors
3. [ ] Verify all environment variables are set correctly
4. [ ] Test backend health endpoint
5. [ ] Verify MongoDB connection
6. [ ] Check CORS settings match frontend URL
7. [ ] Verify Socket.IO connection in browser Network tab
8. [ ] Clear browser cache and cookies
9. [ ] Check that services are not spun down (Render free tier)

## Success Criteria

- [ ] App is accessible via public URL
- [ ] Users can create accounts
- [ ] Real-time messaging works
- [ ] File uploads work
- [ ] No critical errors in logs
- [ ] Performance is acceptable

---

**Congratulations!** 🎉 Your app is now live and free!

If you encounter any issues, refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting steps.





