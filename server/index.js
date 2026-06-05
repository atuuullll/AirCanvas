import 'dotenv/config.js';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

// Socket.io configuration with CORS
const io = new SocketIO(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active rooms and their metadata
const rooms = new Map();

// CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    env: NODE_ENV,
    clientUrl: CLIENT_URL,
  });
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

  // Generate public share link using CLIENT_URL
  const shareLink = `${CLIENT_URL}?share=${shareId}`;
  
  console.log(`[Room] Created: ${roomId}, Share: ${shareId}, Link: ${shareLink}`);
  
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
    isActive: room.owner !== null,
  });
});

// WebSocket Events
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

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
    console.log(`[Share] Owner started in room ${roomId}`);
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

    const viewer = {
      socketId: socket.id,
      userName: userName || 'Viewer',
    };

    room.viewers.add(viewer);
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

    console.log(`[Share] Viewer ${userName} joined room ${room.roomId} (total: ${room.viewers.size})`);
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

  // Hand landmarks update from owner
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
      console.log(`[Share] Stopped room ${roomId}`);
      room.owner = null;
      room.latestCanvasData = null;
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);

    // Clean up room data
    for (const [roomId, room] of rooms) {
      if (room.owner?.socketId === socket.id) {
        io.to(roomId).emit('sharing-stopped', { message: 'Host disconnected' });
        room.owner = null;
      }

      room.viewers.forEach((viewer) => {
        if (viewer.socketId === socket.id) {
          room.viewers.delete(viewer);
          console.log(`[Share] Viewer left room ${roomId} (total: ${room.viewers.size})`);
        }
      });

      // Clean up empty rooms after 1 hour
      if (room.owner === null && room.viewers.size === 0) {
        setTimeout(() => {
          if (room.owner === null && room.viewers.size === 0) {
            rooms.delete(roomId);
            console.log(`[Room] Cleaned up empty room ${roomId}`);
          }
        }, 3600000);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 AirCanvas Sharing Server Ready  ║
╚════════════════════════════════════════╝
  
  🌐 Server: http://localhost:${PORT}
  🌍 Environment: ${NODE_ENV}
  🎯 Client URL: ${CLIENT_URL}
  
  📡 WebSocket ready for connections
  ✅ CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}
  `);
});

