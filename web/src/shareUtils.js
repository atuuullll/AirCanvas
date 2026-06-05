import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const startSharing = (roomId, userName) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    socket.emit('start-sharing', { roomId, userName });
    socket.once('sharing-started', resolve);
    socket.once('error', reject);
  });
};

export const joinShare = (shareId, userName) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    socket.emit('join-share', { shareId, userName });
    socket.once('joined-share', resolve);
    socket.once('error', reject);
  });
};

export const sendCanvasData = (roomId, canvasData) => {
  if (!socket) return;
  socket.emit('canvas-data', { roomId, canvasData });
};

export const sendHandTracking = (roomId, landmarks, gesture) => {
  if (!socket) return;
  socket.emit('hand-tracking', { roomId, landmarks, gesture });
};

export const stopSharing = (roomId) => {
  if (!socket) return;
  socket.emit('stop-sharing', { roomId });
};

export const onCanvasUpdate = (callback) => {
  if (!socket) return;
  socket.on('canvas-update', callback);
};

export const onHandTrackingUpdate = (callback) => {
  if (!socket) return;
  socket.on('hand-tracking-update', callback);
};

export const onViewerJoined = (callback) => {
  if (!socket) return;
  socket.on('viewer-joined', callback);
};

export const onSharingEnded = (callback) => {
  if (!socket) return;
  socket.on('sharing-stopped', callback);
};
