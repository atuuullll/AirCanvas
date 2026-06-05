# 🌍 Public Canvas Sharing Setup

You now have two ways to share your AirCanvas:

## Option 1: Quick Testing with ngrok (5 minutes)

Perfect for testing with friends or on different devices locally.

### Steps:

1. **Install ngrok:**
   ```bash
   brew install ngrok  # Mac
   # or download from https://ngrok.com
   ```

2. **Sign up & authenticate:**
   ```bash
   # Go to https://ngrok.com, sign up (free)
   # Get your token from https://dashboard.ngrok.com/auth
   ngrok config add-authtoken YOUR_TOKEN
   ```

3. **Start ngrok tunnel (new terminal):**
   ```bash
   ngrok http 3000
   ```
   
   Copy the HTTPS URL shown (e.g., `https://abc123.ngrok-free.com`)

4. **Update web app config:**
   
   Create `.env.local` in `web/` folder:
   ```env
   VITE_SOCKET_URL=https://abc123.ngrok-free.com
   ```

5. **Restart servers:**
   - Keep backend running (`npm start` in server/)
   - Keep ngrok running
   - Restart web app: `npm run dev` in web/

6. **Share your canvas:**
   - Click 🔗 Share button
   - Copy the link
   - Send to anyone, anywhere
   - They open it and see your canvas in real-time!

✅ **Works on:** Different devices, phones, tablets, computers
⚠️ **Note:** URL changes every 8 hours (free tier)

---

## Option 2: Permanent Production Deployment

For stable, always-available public sharing.

### Backend Deployment (Choose one):

#### A. Deploy to **Render** (Easiest)
1. Push to GitHub: `git push origin main`
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Set build command: `npm --prefix server start`
6. Get your Render URL (e.g., `https://aircanvas-api.onrender.com`)

#### B. Deploy to **Railway**
1. Go to https://railway.app
2. New Project → GitHub repo
3. Set start command: `npm --prefix server start`
4. Railway auto-generates public URL

#### C. Deploy to **Heroku**
```bash
heroku create aircanvas-server
git push heroku main
```

### Frontend Deployment:

#### Netlify (Easiest)
1. Push to GitHub
2. Go to https://netlify.com
3. Connect your GitHub repo
4. Build: `cd web && npm run build`
5. Publish: `web/dist`
6. Add env var: `VITE_SOCKET_URL=https://your-backend-url`

#### Vercel
```bash
npm install -g vercel
vercel
```

### Environment Setup:

**Backend (.env file on your hosting service):**
```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://your-frontend-netlify-url.com
ALLOWED_ORIGINS=https://your-frontend-netlify-url.com
```

**Frontend (.env.production in web/):**
```env
VITE_SOCKET_URL=https://your-backend-render-url.com
```

✅ **Permanent**, **Free tier available**, **Always works**

---

## Current Setup

| Service | URL | Status |
|---------|-----|--------|
| **Backend** | http://localhost:3000 | ✅ Running |
| **Frontend** | http://localhost:5175 | ✅ Running |

---

## How It Works

```
You (Sharer)
    ↓
Your Canvas Drawing
    ↓
🔗 Click Share Button
    ↓
Backend generates unique link
    ↓
Share link looks like:
  https://your-domain.com?share=abc123def
    ↓
Friend opens link
    ↓
Friend sees your canvas LIVE (read-only)
    ↓
All updates sync in real-time!
```

---

## Recommended: ngrok for Testing, Render for Production

1. **Test locally with ngrok first** (5 min setup)
   - No credit card needed
   - Perfect for testing
   
2. **Deploy to Render when ready** (10 min setup)
   - Free tier available
   - Permanent public URLs
   - Works 24/7

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Ensure backend is running on port 3000 |
| "Share link doesn't work" | Check `VITE_SOCKET_URL` env var is set correctly |
| "ngrok URL expired" | Run `ngrok http 3000` again, update `.env.local` |
| "CORS error" | Verify `ALLOWED_ORIGINS` and `CLIENT_URL` on backend |
| "Slow sync" | Normal - throttled to 10 updates/sec for bandwidth |

---

## Next Steps

Choose your path:

- **🚀 Fast Track:** Try ngrok now
  ```bash
  ngrok http 3000
  # Copy URL → update .env.local → restart web app → Click Share!
  ```

- **📦 Production:** Deploy to Render/Netlify
  - Follow deployment steps above
  - Permanent, always-on sharing

**That's it! Your canvas is now shareable globally!** 🎉
