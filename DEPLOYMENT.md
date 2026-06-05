# Production Deployment Guide

## Quick Public Sharing (Local Testing with ngrok)

### 1. Install ngrok

**Mac/Linux:**
```bash
brew install ngrok
```

**Windows:**
Download from https://ngrok.com/download

### 2. Create ngrok Account & Get Token

1. Go to https://ngrok.com and sign up
2. Get your auth token from https://dashboard.ngrok.com/auth
3. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

### 3. Start ngrok Tunnel

```bash
ngrok http 3000
```

This gives you a public URL like: `https://abc123.ngrok.io`

### 4. Update Web App Configuration

Create/update `.env.local` in the `web` folder:

```
VITE_SOCKET_URL=https://abc123.ngrok.io
```

### 5. Restart the App

```bash
cd web
npm run dev
```

Now when you share the link, anyone anywhere can open it!

---

## Permanent Cloud Deployment

### Option 1: Deploy to Render (Recommended)

**Free tier supports always-on services**

1. **Prepare the app:**
   ```bash
   # Nothing to do, it's ready!
   ```

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add canvas sharing"
   git push origin main
   ```

3. **Deploy Backend:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Set runtime to Node
   - Set start command: `npm --prefix server start`
   - Add env var: `NODE_ENV=production`
   - Deploy!

4. **Configure Frontend:**
   - Get your Render URL (e.g., `https://aircanvas-api.onrender.com`)
   - Create `.env.production` in `web`:
     ```
     VITE_SOCKET_URL=https://aircanvas-api.onrender.com
     ```
   - Deploy frontend to Netlify/Vercel (see below)

5. **Deploy Web App to Netlify:**
   - Go to https://netlify.com
   - Connect your GitHub repo
   - Build command: `cd web && npm run build`
   - Publish directory: `web/dist`
   - Add env var: `VITE_SOCKET_URL=https://aircanvas-api.onrender.com`
   - Deploy!

### Option 2: Deploy to Railway

1. **Push to GitHub**
2. Go to https://railway.app
3. Create new project → GitHub repo
4. Select the repo
5. Add env vars:
   - `NODE_ENV=production`
   - `PORT=3000`
6. Set start command: `npm --prefix server start`
7. Railway generates a public URL automatically

### Option 3: Deploy to Heroku

1. **Install Heroku CLI**
2. **Login:** `heroku login`
3. **Create app:** `heroku create aircanvas-server`
4. **Add Procfile:**
   ```
   web: npm --prefix server start
   ```
5. **Deploy:** `git push heroku main`

---

## Environment Variables (Production)

### Backend (.env in `server/` folder)

```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://your-frontend-url.netlify.app
ALLOWED_ORIGINS=https://your-frontend-url.netlify.app
```

### Frontend (.env.production in `web/` folder)

```env
VITE_SOCKET_URL=https://your-backend-url.onrender.com
```

---

## Update Backend for Production

The backend already supports this! The `/api/create-room` endpoint generates share links using `process.env.CLIENT_URL`.

To customize:

1. Set `CLIENT_URL` environment variable on your hosting service
2. Backend automatically generates proper public share links

---

## Testing the Setup

1. **Start both servers:**
   ```bash
   # Terminal 1
   cd server && npm start
   
   # Terminal 2 (or use ngrok in different terminal)
   ngrok http 3000
   
   # Terminal 3
   cd web && npm run dev
   ```

2. **Get your ngrok URL** from the ngrok terminal output

3. **Update .env.local:**
   ```
   VITE_SOCKET_URL=https://your-ngrok-url.ngrok.io
   ```

4. **Test locally:**
   - Open http://localhost:5173
   - Click Share button
   - Copy the link
   - Open it in a different browser/device on the same network
   - Should see real-time canvas sync!

5. **Share globally:**
   - The ngrok URL is public
   - Anyone can open the share link from anywhere
   - Works on phones, tablets, other computers

---

## Production Checklist

- [ ] Backend deployed to cloud
- [ ] Frontend deployed to cloud  
- [ ] Environment variables set correctly
- [ ] CORS configured for production URLs
- [ ] SSL/TLS enabled (automatic with ngrok, Render, Netlify, Vercel)
- [ ] Test share link on different devices
- [ ] Monitor server logs for errors

---

## Troubleshooting

**"Share link not working on another device"**
- Check VITE_SOCKET_URL is set to public backend URL
- Make sure backend is deployed and running
- Check CORS settings

**"ngrok tunnel expires"**
- Free ngrok tunnels restart every 8 hours
- Use paid ngrok for stable URLs, or deploy to cloud

**"Connection refused"**
- Check backend is running
- Verify firewall allows outbound WebSocket connections
- Try deploying to cloud service

**"CORS error"**
- Ensure `CLIENT_URL` env var is set on backend
- Check frontend URL matches ALLOWED_ORIGINS

---

## Next Steps

1. Try ngrok for local testing first
2. Once working, deploy to Render/Railway for production
3. Share the public URL with others
4. Anyone can now open your canvas via the share link!
