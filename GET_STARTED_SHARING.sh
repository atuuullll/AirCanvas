#!/bin/bash

# ========================================
# 🌍 AirCanvas Public Sharing - Quick Start
# ========================================

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  🌍 Public Canvas Sharing Setup       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "⚠️  ngrok not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ngrok
    else
        echo "📥 Please install ngrok from: https://ngrok.com"
        echo "   Then run this script again."
        exit 1
    fi
fi

echo "✅ ngrok is installed"
echo ""
echo "📋 Steps:"
echo ""
echo "1️⃣  Starting ngrok tunnel on port 3000..."
echo "   (keep this terminal open)"
echo ""

# Start ngrok
NGROK_URL=$(ngrok http 3000 --log stdout 2>&1 | grep -oP '(https://[a-z0-9-]+\.ngrok[^/]*)')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to start ngrok tunnel"
    echo "   Make sure you've authenticated: ngrok config add-authtoken <token>"
    exit 1
fi

echo "2️⃣  Your public URL: $NGROK_URL"
echo ""
echo "3️⃣  Update your web app config:"
echo "   Create or edit: web/.env.local"
echo ""
echo "   Add this line:"
echo "   VITE_SOCKET_URL=$NGROK_URL"
echo ""
echo "4️⃣  Restart your web app (in another terminal):"
echo "   cd web && npm run dev"
echo ""
echo "5️⃣  Click Share button and send the link to your friends!"
echo ""
echo "═══════════════════════════════════════"
echo "🎉 Public sharing is ready!"
echo "═══════════════════════════════════════"
echo ""

# Keep terminal open
tail -f /dev/null
