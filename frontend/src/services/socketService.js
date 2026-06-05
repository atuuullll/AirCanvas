import io from 'socket.io-client';

const SOCKET_SERVER = 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || SOCKET_SERVER;

class SocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.userName = null;
  }

  connect(roomId, userName) {
    this.socket = io(SOCKET_URL);
    this.roomId = roomId;
    this.userName = userName;

    this.socket.emit('join-room', roomId, userName);
  }

  // Draw event
  sendDraw(x1, y1, x2, y2, color, thickness) {
    this.socket.emit('draw', {
      roomId: this.roomId,
      x1, y1, x2, y2,
      color,
      thickness
    });
  }

  // Erase event
  sendErase(x1, y1, x2, y2) {
    this.socket.emit('erase', {
      roomId: this.roomId,
      x1, y1, x2, y2
    });
  }

  // Clear canvas
  sendClear() {
    this.socket.emit('clear-canvas', this.roomId);
  }

  // Listen for remote draw
  onRemoteDraw(callback) {
    this.socket.on('remote-draw', callback);
  }

  // Listen for remote erase
  onRemoteErase(callback) {
    this.socket.on('remote-erase', callback);
  }

  // Listen for canvas clear
  onCanvasClear(callback) {
    this.socket.on('canvas-cleared', callback);
  }

  // Listen for user joined
  onUserJoined(callback) {
    this.socket.on('user-joined', callback);
  }

  // Load existing canvas
  onLoadCanvas(callback) {
    this.socket.on('load-canvas', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

const socketService = new SocketService();

let socket = null;

/**
 * Initialize Socket.io connection
 * @returns {Socket}
 */
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

/**
 * Get active socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Start sharing - Owner initiates canvas broadcast
 * @param {string} roomId
 * @param {string} userName
 * @returns {Promise}
 */
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

/**
 * Join share - Viewer joins active sharing session
 * @param {string} shareId
 * @param {string} userName
 * @returns {Promise}
 */
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

/**
 * Send canvas data to viewers
 * @param {string} roomId
 * @param {Object} canvasData
 */
export const sendCanvasData = (roomId, canvasData) => {
  if (!socket) return;
  socket.emit('canvas-data', { roomId, canvasData });
};

/**
 * Send hand tracking data (landmarks + gesture)
 * @param {string} roomId
 * @param {Array} landmarks
 * @param {string} gesture
 */
export const sendHandTracking = (roomId, landmarks, gesture) => {
  if (!socket) return;
  socket.emit('hand-tracking', { roomId, landmarks, gesture });
};

/**
 * Stop sharing - Owner stops broadcasting
 * @param {string} roomId
 */
export const stopSharing = (roomId) => {
  if (!socket) return;
  socket.emit('stop-sharing', { roomId });
};

/**
 * Listen for canvas updates
 * @param {Function} callback
 */
export const onCanvasUpdate = (callback) => {
  if (!socket) return;
  socket.on('canvas-update', callback);
};

/**
 * Listen for hand tracking updates
 * @param {Function} callback
 */
export const onHandTrackingUpdate = (callback) => {
  if (!socket) return;
  socket.on('hand-tracking-update', callback);
};

/**
 * Listen for viewer joined events
 * @param {Function} callback
 */
export const onViewerJoined = (callback) => {
  if (!socket) return;
  socket.on('viewer-joined', callback);
};

/**
 * Listen for sharing ended events
 * @param {Function} callback
 */
export const onSharingEnded = (callback) => {
  if (!socket) return;
  socket.on('sharing-stopped', callback);
};

/**
 * Remove event listener
 * @param {string} eventName
 * @param {Function} callback
 */
export const offSocketEvent = (eventName, callback) => {
  if (!socket) return;
  socket.off(eventName, callback);
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default socketService;
