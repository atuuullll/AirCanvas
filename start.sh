#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AirCanvas - Starting Sharing Infrastructure${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd server
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Server dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install server dependencies${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📦 Installing web dependencies...${NC}"
cd ../web
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install web dependencies${NC}"
    exit 1
fi

cd ..

echo -e "\n${BLUE}Starting servers...${NC}\n"

# Start backend server
echo -e "${YELLOW}Starting Backend Server on port 3000...${NC}"
cd server
npm start &
SERVER_PID=$!
echo -e "${GREEN}✓ Server PID: $SERVER_PID${NC}"

# Wait a bit for server to start
sleep 2

# Start frontend server
echo -e "\n${YELLOW}Starting Web App on port 5173+...${NC}"
cd ../web
npm run dev &
WEB_PID=$!
echo -e "${GREEN}✓ Web App PID: $WEB_PID${NC}"

echo -e "\n${GREEN}✅ AirCanvas is running!${NC}\n"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Backend:  ${YELLOW}http://localhost:3000${NC}"
echo -e "Web App:  ${YELLOW}http://localhost:5173${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📋 How to use:${NC}"
echo "1. Click the 🔗 Share button to start sharing your canvas"
echo "2. Copy the share link and send it to others"
echo "3. Others can open the link to view your canvas in real-time\n"

echo -e "${YELLOW}⚠️  To stop: Press Ctrl+C${NC}\n"

# Keep the script running
wait
