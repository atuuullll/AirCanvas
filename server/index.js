import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store active rooms and their metadata
const rooms = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.post('/api/create-room', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  const shareId = uuidv4().slice(0, 8);
  
  rooms.set(roomId, {
    roomId,
    shareId,
    createdAt: Date.now(),
    owner: null,
    viewers: new Set(),
    latestCanvasData: null,
  });

  const shareLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}?share=${shareId}`;
  
  res.json({
    roomId,
    shareId,
    shareLink,
  });
});

app.get('/api/room/:shareId', (req, res) => {
  const { shareId } = req.params;
  
  // Find room by shareId
  let room = null;
  for (const [_, r] of rooms) {
    if (r.shareId === shareId) {
      room = r;
      break;
    }
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    roomId: room.roomId,
    shareId: room.shareId,
  });
});

// WebSocket Events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Owner shares their canvas
  socket.on('start-sharing', (data) => {
    const { roomId, userName } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    room.owner = {
      socketId: socket.id,
      userName: userName || 'Anonymous',
    };

    socket.join(roomId);
    socket.emit('sharing-started', { shareId: room.shareId });
    console.log(`Owner started sharing in room ${roomId}`);
  });

  // Viewer joins a shared session
  socket.on('join-share', (data) => {
    const { shareId, userName } = data;
    
    let room = null;
    for (const [_, r] of rooms) {
      if (r.shareId === shareId) {
        room = r;
        break;
      }
    }

    if (!room) {
      socket.emit('error', { message: 'Share not found' });
      return;
    }

    room.viewers.add({
      socketId: socket.id,
      userName: userName || 'Viewer',
    });

    socket.join(room.roomId);
    socket.emit('joined-share', { roomId: room.roomId, ownerName: room.owner?.userName });
    
    // Send latest canvas data to new viewer
    if (room.latestCanvasData) {
      socket.emit('canvas-update', room.latestCanvasData);
    }

    // Notify owner of new viewer
    io.to(room.roomId).emit('viewer-joined', {
      viewerName: userName || 'Viewer',
      viewerCount: room.viewers.size,
    });

    console.log(`Viewer ${userName} joined room ${room.roomId}`);
  });

  // Canvas update from owner
  socket.on('canvas-data', (data) => {
    const { roomId, canvasData } = data;
    const room = rooms.get(roomId);

    if (!room || room.owner?.socketId !== socket.id) {
      return;
    }

    room.latestCanvasData = canvasData;
    socket.to(roomId).emit('canvas-update', canvasData);
  });

  // Hand landmarks update from owner (for shared cursor visualization)
  socket.on('hand-tracking', (data) => {
    const { roomId, landmarks, gesture } = data;
    const room = rooms.get(roomId);

    if (!room || room.owner?.socketId !== socket.id) {
      return;
    }

    socket.to(roomId).emit('hand-tracking-update', { landmarks, gesture });
  });

  // Stop sharing
  socket.on('stop-sharing', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);

    if (!room) return;

    io.to(roomId).emit('sharing-stopped', { message: 'The share has ended' });
    socket.leave(roomId);
    
    if (room.owner?.socketId === socket.id) {
      room.owner = null;
      room.latestCanvasData = null;
    }

    console.log(`Sharing stopped in room ${roomId}`);
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Clean up room data
    for (const [roomId, room] of rooms) {
      if (room.owner?.socketId === socket.id) {
        io.to(roomId).emit('sharing-stopped', { message: 'Host disconnected' });
        room.owner = null;
      }

      room.viewers.forEach((viewer) => {
        if (viewer.socketId === socket.id) {
          room.viewers.delete(viewer);
        }
      });

      // Clean up empty rooms after 1 hour
      if (room.owner === null && room.viewers.size === 0) {
        setTimeout(() => {
          if (room.owner === null && room.viewers.size === 0) {
            rooms.delete(roomId);
          }
        }, 3600000);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
