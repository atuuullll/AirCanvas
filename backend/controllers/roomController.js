/**
 * Room Controller - Business logic for room management
 * Handles creating, finding, updating, and deleting rooms
 */

import { v4 as uuidv4 } from 'uuid';
import { Room } from '../models/Room.js';

export class RoomController {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Create a new sharing room
   * @returns {Object} Room data with roomId, shareId, and shareLink
   */
  createRoom(clientUrl) {
    const roomId = uuidv4().slice(0, 8);
    const shareId = uuidv4().slice(0, 8);
    
    const room = new Room(roomId, shareId);
    this.rooms.set(roomId, room);

    // Generate public share link using clientUrl
    const shareLink = `${clientUrl}?share=${shareId}`;
    
    console.log(`[Room] Created: ${roomId}, Share: ${shareId}, Link: ${shareLink}`);
    
    return {
      roomId,
      shareId,
      shareLink,
      status: room.getStatus(),
    };
  }

  /**
   * Find room by roomId
   * @param {string} roomId
   * @returns {Room|null}
   */
  findRoomById(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Find room by shareId
   * @param {string} shareId
   * @returns {Room|null}
   */
  findRoomByShareId(shareId) {
    for (const [_, room] of this.rooms) {
      if (room.shareId === shareId) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get all active rooms
   * @returns {Array}
   */
  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => room.getStatus());
  }

  /**
   * Delete a room
   * @param {string} roomId
   * @returns {boolean}
   */
  deleteRoom(roomId) {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);
      room.cleanup();
      this.rooms.delete(roomId);
      console.log(`[Room] Deleted: ${roomId}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up empty rooms older than specified time
   * @param {number} maxAgeMs - Age in milliseconds
   */
  cleanupEmptyRooms(maxAgeMs = 3600000) {
    const now = Date.now();
    const toDelete = [];

    for (const [roomId, room] of this.rooms) {
      if (room.isEmpty() && (now - room.createdAt) > maxAgeMs) {
        toDelete.push(roomId);
      }
    }

    toDelete.forEach(roomId => this.deleteRoom(roomId));
    return toDelete.length;
  }

  /**
   * Get total rooms count
   * @returns {number}
   */
  getRoomsCount() {
    return this.rooms.size;
  }

  /**
   * Get statistics about rooms
   * @returns {Object}
   */
  getStatistics() {
    let totalViewers = 0;
    let activeRooms = 0;
    let emptyRooms = 0;

    for (const room of this.rooms.values()) {
      if (!room.isEmpty()) {
        activeRooms++;
        totalViewers += room.viewers.size;
      } else {
        emptyRooms++;
      }
    }

    return {
      totalRooms: this.rooms.size,
      activeRooms,
      emptyRooms,
      totalViewers,
    };
  }
}
