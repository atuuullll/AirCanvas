# AirCanvas Real-Time Canvas Sharing

AirCanvas now supports real-time canvas sharing! Share your drawing canvas with anyone via a unique link, just like Google Meet.

## Features

- 🔗 **Share with a Link**: Generate unique share links to invite viewers
- 📡 **Real-Time Sync**: Canvas updates are streamed in real-time to all viewers
- 👥 **Viewer Count**: See how many people are viewing your canvas
- 🎨 **Owner Control**: Only the owner can draw; viewers see read-only version
- 🔴 **Live Status**: Visual indicator showing connection status for viewers
- 🌐 **End-to-End**: Fully functional peer discovery through WebSocket server

## How to Use

### For Sharers (Canvas Owner)

1. Click the **🔗 Share** button in the top toolbar
2. A share modal will pop up showing your unique share link
3. Copy the link and send it to others
4. Your canvas will stream in real-time to all connected viewers
5. See how many people are viewing in the modal
6. Click **🔗 Share** again to stop sharing

### For Viewers

1. Open the share link in your browser
2. A **"Viewing Shared Canvas"** indicator appears in the top-left
3. Watch the owner's canvas update in real-time as they draw
4. Your view is read-only (you can't draw)
5. Click the **✕** to stop viewing

## Technical Architecture

### Backend (Server)

- **Framework**: Express.js
- **Real-Time Communication**: Socket.io
- **Port**: 3000
- **Features**:
  - Room management with unique IDs
  - Canvas data broadcasting
  - Hand tracking sync (optional)
  - User presence tracking

### Frontend (Web App)

- **Socket Client**: socket.io-client
- **Components**:
  - `ShareModal.jsx` - Share link display and management
  - `ViewerModal.jsx` - Viewer status indicator
  - `shareUtils.js` - Socket communication utilities

### Data Flow

```
Sharer's Canvas → redrawDrawingCanvas() → sendCanvasData()
                          ↓
                  Backend Server (Socket.io)
                          ↓
                  Viewer's Client → canvas-update event
                          ↓
                  Viewer's Canvas Display
```

## Setup Instructions

### Start the Backend Server

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3000`

### Start the Frontend

```bash
cd web
npm install
npm run dev
```

Web app runs on `http://localhost:5173` (or next available port)

### Configure (Optional)

Edit `.env.development` in the `web` folder to change the backend URL:

```
VITE_SOCKET_URL=http://localhost:3000
```

## API Endpoints

### HTTP Endpoints

- `GET /api/health` - Server health check
- `POST /api/create-room` - Create a new sharing room
- `GET /api/room/:shareId` - Get room info by share ID

### WebSocket Events

**Emitted by Sharer:**
- `start-sharing` - Initiate canvas sharing
- `canvas-data` - Send canvas updates
- `hand-tracking` - Send hand landmarks (optional)
- `stop-sharing` - End sharing session

**Emitted by Viewer:**
- `join-share` - Join a shared session

**Received by Sharer:**
- `sharing-started` - Confirm sharing started
- `viewer-joined` - New viewer connected
- `sharing-stopped` - Share ended

**Received by Viewer:**
- `canvas-update` - Canvas state update
- `joined-share` - Successfully joined share
- `hand-tracking-update` - Hand tracking data (optional)
- `sharing-stopped` - Share ended by owner

## Performance Considerations

- Canvas updates are **throttled to 10 per second** (100ms intervals) to balance real-time feel with bandwidth
- Only image data changes are sent, reducing overhead
- WebSocket binary frames minimize data transmission

## Future Enhancements

- [ ] Cursor position sharing
- [ ] Hand tracking visualization for viewers
- [ ] Multiple drawing layers sync
- [ ] Audio/Video integration
- [ ] Recording shared sessions
- [ ] Undo/Redo sync
- [ ] Persistent room sessions
- [ ] Permission levels (draw, annotate, view)

## Troubleshooting

### Connection Failed
- Ensure backend server is running on port 3000
- Check firewall settings
- Verify `VITE_SOCKET_URL` in `.env.development`

### Canvas Not Updating
- Check browser console for errors
- Verify Socket.io connection in browser DevTools
- Ensure both apps are on the same network

### Share Link Not Working
- Make sure the backend is running
- Check that the room still exists (rooms expire after 1 hour of no activity)
- Try creating a new share session

## Security Notes

- Share links are unique 8-character IDs
- Data is transmitted unencrypted over WebSocket (use HTTPS/WSS in production)
- No authentication required (consider adding for production)
- Viewers are read-only (cannot modify shared canvas)
