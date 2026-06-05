const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Store active rooms and users
const rooms = new Map();

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id);

  // Join a drawing room
  socket.on('join-room', (roomId, userName) => {
    socket.join(roomId);
    console.log(`📍 ${userName} joined room ${roomId}`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        users: [],
        canvas: [],
        createdAt: new Date()
      });
    }

    const room = rooms.get(roomId);
    room.users.push({ id: socket.id, name: userName });

    // Notify others
    socket.to(roomId).emit('user-joined', {
      userName: userName,
      totalUsers: room.users.length
    });

    // Send existing canvas to new user
    socket.emit('load-canvas', room.canvas);
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    const { roomId, x1, y1, x2, y2, color, thickness } = data;

    // Store drawing
    if (rooms.has(roomId)) {
      rooms.get(roomId).canvas.push({
        x1, y1, x2, y2, color, thickness,
        timestamp: new Date()
      });
    }

    // Broadcast to all users in room
    socket.to(roomId).emit('remote-draw', {
      x1, y1, x2, y2, color, thickness
    });
  });

  // Handle erase
  socket.on('erase', (data) => {
    const { roomId, x1, y1, x2, y2 } = data;

    socket.to(roomId).emit('remote-erase', {
      x1, y1, x2, y2
    });
  });

  // Handle clear canvas
  socket.on('clear-canvas', (roomId) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).canvas = [];
    }

    socket.to(roomId).emit('canvas-cleared');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);

    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      room.users = room.users.filter(u => u.id !== socket.id);

      if (room.users.length === 0) {
        rooms.delete(roomId);
      }
    });
  });
});

// Routes
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json(room);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

app.get('/api/active-rooms', (req, res) => {
  const activeRooms = Array.from(rooms.values()).map(room => ({
    id: room.id,
    users: room.users.length,
    createdAt: room.createdAt
  }));
  res.json(activeRooms);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
