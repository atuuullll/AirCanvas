# 🚀 Quick Start: Public Canvas Sharing with ngrok

Get your AirCanvas sharing publicly accessible in 5 minutes!

## Step 1: Install ngrok (1 minute)

### On Mac:
```bash
brew install ngrok
```

### On Windows:
Download from: https://ngrok.com/download

### On Linux:
```bash
wget https://bin.equinox.io/c/4VmDzA7iaHg/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
sudo mv ngrok /usr/local/bin/
```

## Step 2: Create ngrok Account (2 minutes)

1. Go to https://ngrok.com
2. Click "Sign Up" (free account)
3. Verify your email
4. Go to https://dashboard.ngrok.com/auth
5. Copy your **auth token**

## Step 3: Authenticate ngrok (30 seconds)

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

## Step 4: Start ngrok Tunnel (while servers are running)

Open a new terminal and run:

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com
Version                       3.3.5
Region                        us (United States)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok-free.com -> http://localhost:3000
```

**Copy the HTTPS URL** (like `https://abc123xyz.ngrok-free.com`)

## Step 5: Configure the Web App

Create a `.env.local` file in the `web/` folder:

```env
VITE_SOCKET_URL=https://abc123xyz.ngrok-free.com
```

Replace `abc123xyz.ngrok-free.com` with your ngrok URL.

## Step 6: Start Everything

**Terminal 1 - Backend Server:**
```bash
cd server
npm install
npm start
```

**Terminal 2 - ngrok Tunnel:**
```bash
ngrok http 3000
```

**Terminal 3 - Web App:**
```bash
cd web
npm install
npm run dev
```

## Step 7: Share Your Canvas!

1. Open: http://localhost:5173 (or the URL shown by Vite)
2. Click the 🔗 **Share** button
3. Copy the share link (it now uses your public ngrok URL!)
4. Send it to anyone, anywhere
5. They can open it on their phone, tablet, or computer

## 🎉 That's It!

Your canvas is now publicly shareable! Anyone with the link can see your drawing in real-time.

---

## ⚠️ Important Notes

### ngrok Free Tier Limitations:
- Session expires every 8 hours
- URL changes each time you restart ngrok
- Good for testing, not production

### To Share the Link Again After ngrok Restarts:
1. Run `ngrok http 3000` again
2. Copy the new URL
3. Update `.env.local` with the new URL
4. Refresh the browser
5. Generate a new share link

---

## 🔐 Upgrade to Production

Once you're happy with the sharing, deploy to the cloud:

- **Backend**: Deploy to Render, Railway, or Heroku
- **Frontend**: Deploy to Netlify or Vercel
- **No more restarts needed!**

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## Troubleshooting

**"404 page not found"**
- Make sure your `VITE_SOCKET_URL` doesn't have a trailing slash
- Check that ngrok is still running (`ngrok http 3000` in terminal)

**"Connection refused"**
- Is the backend server running? (`npm start` in server folder)
- Is the ngrok tunnel active?
- Check the ngrok terminal for connection logs

**"Share link doesn't work"**
- Verify `VITE_SOCKET_URL` matches your ngrok URL
- Try refreshing the page
- Generate a new share link

**"ngrok expired/stopped"**
- Run `ngrok http 3000` again
- Update `.env.local` with new URL
- Refresh browser and create new share link

---

## Next Steps

- ✅ Test with friends on different devices
- ✅ Try sharing drawings in real-time
- ✅ Once happy, follow [DEPLOYMENT.md](DEPLOYMENT.md) to go permanent
