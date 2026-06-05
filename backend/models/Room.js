/**
 * Room Model - Represents a canvas sharing room
 * Stores metadata about active sharing sessions
 */

export class Room {
  constructor(roomId, shareId) {
    this.roomId = roomId;
    this.shareId = shareId;
    this.createdAt = Date.now();
    this.owner = null;
    this.viewers = new Set();
    this.latestCanvasData = null;
    this.handTrackingData = null;
  }

  // Get room status
  getStatus() {
    return {
      roomId: this.roomId,
      shareId: this.shareId,
      isActive: this.owner !== null,
      ownerName: this.owner?.userName || null,
      viewerCount: this.viewers.size,
      createdAt: this.createdAt,
      age: Date.now() - this.createdAt,
    };
  }

  // Set owner (sharer)
  setOwner(socketId, userName) {
    this.owner = {
      socketId,
      userName: userName || 'Anonymous',
    };
  }

  // Add viewer
  addViewer(socketId, userName) {
    const viewer = {
      socketId,
      userName: userName || 'Viewer',
    };
    this.viewers.add(viewer);
    return viewer;
  }

  // Remove viewer
  removeViewer(socketId) {
    const viewer = Array.from(this.viewers).find(v => v.socketId === socketId);
    if (viewer) {
      this.viewers.delete(viewer);
      return true;
    }
    return false;
  }

  // Check if user is owner
  isOwner(socketId) {
    return this.owner?.socketId === socketId;
  }

  // Check if user is viewer
  isViewer(socketId) {
    return Array.from(this.viewers).some(v => v.socketId === socketId);
  }

  // Update canvas data
  updateCanvasData(canvasData) {
    this.latestCanvasData = canvasData;
  }

  // Update hand tracking data
  updateHandTracking(landmarks, gesture) {
    this.handTrackingData = {
      landmarks,
      gesture,
      timestamp: Date.now(),
    };
  }

  // Check if room is empty
  isEmpty() {
    return this.owner === null && this.viewers.size === 0;
  }

  // Clean up room
  cleanup() {
    this.owner = null;
    this.viewers.clear();
    this.latestCanvasData = null;
    this.handTrackingData = null;
  }
}
