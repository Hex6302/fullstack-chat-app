# Vercel Configuration

## Important Notes

1. **Replace YOUR-BACKEND-URL**: In `vercel.json`, replace `YOUR-BACKEND-URL` with your actual Render backend URL.
   - Example: If your backend is at `https://chat-app-backend.onrender.com`
   - Then change the destination to: `https://chat-app-backend.onrender.com/api/$1`

2. **API Proxy (Optional)**: The rewrite rule in `vercel.json` is optional if you set the `VITE_API_URL` environment variable in Vercel dashboard.
   - If you set `VITE_API_URL`, the frontend will use that for API calls
   - The proxy rewrite is useful if you want to avoid CORS issues, but it's not required

3. **Environment Variables**: Make sure to set these in Vercel dashboard:
   - `VITE_API_URL=https://your-backend-url.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-backend-url.onrender.com`

## Deployment Steps

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Set environment variables
4. Deploy!

For more details, see [DEPLOYMENT.md](../DEPLOYMENT.md)





