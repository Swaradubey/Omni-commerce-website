# Production Deployment Environment Variables

## Vercel (Frontend)
Set these environment variables in your Vercel project settings:

```env
# The URL of your backend on Render (or other host)
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api

# Optional: if you want to use a specific retail verse client context by default
# VITE_DEFAULT_CLIENT_ID=your_client_id
```

## Render (Backend)
Set these environment variables in your Render service settings:

```env
# The URL of your frontend on Vercel
CLIENT_ORIGIN=https://your-frontend-url.vercel.app,http://localhost:5173

# Standard configuration
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secure_random_jwt_secret

# Optional: Shiprocket credentials for tracking
# SHIPROCKET_EMAIL=your_email
# SHIPROCKET_PASSWORD=your_password
```

## Troubleshooting
- **CORS Errors**: Ensure `CLIENT_ORIGIN` on the backend matches the exact URL of your frontend (no trailing slash).
- **Blank Dashboard**: Check if `VITE_API_BASE_URL` is correctly set and includes `/api` at the end (the system handles both, but `/api` is recommended).
- **Authentication**: The token is stored in `eco_shop_token` in localStorage. Ensure your browser is not blocking third-party storage if accessing via an iframe.
