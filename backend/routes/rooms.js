/**
 * Routes for Room API
 * HTTP endpoints for room management
 */

import express from 'express';

export function setupRoomRoutes(app, roomController) {
  const router = express.Router();

  /**
   * Health check
   */
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'Server is running',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Create a new sharing room
   */
  router.post('/create-room', (req, res) => {
    try {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const roomData = roomController.createRoom(clientUrl);
      res.json(roomData);
    } catch (error) {
      console.error('[Error] Failed to create room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  /**
   * Get room by shareId
   */
  router.get('/room/:shareId', (req, res) => {
    try {
      const { shareId } = req.params;
      const room = roomController.findRoomByShareId(shareId);

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      res.json({
        roomId: room.roomId,
        shareId: room.shareId,
        isActive: room.owner !== null,
        ownerName: room.owner?.userName || null,
        viewerCount: room.viewers.size,
      });
    } catch (error) {
      console.error('[Error] Failed to fetch room:', error);
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  });

  /**
   * Get all rooms (for admin/debugging)
   */
  router.get('/rooms', (req, res) => {
    try {
      const rooms = roomController.getAllRooms();
      res.json({ rooms });
    } catch (error) {
      console.error('[Error] Failed to fetch rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  /**
   * Get server statistics
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = roomController.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error('[Error] Failed to fetch stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.use('/api', router);
}
