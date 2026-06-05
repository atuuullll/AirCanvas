import React, { useRef, useEffect, useState } from 'react';
import socketService from '../services/socketService';

const SharedCanvas = ({ roomId, userName }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPointRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0000FF');
  const [brushSize, setBrushSize] = useState(15);
  const [users, setUsers] = useState(1);
  const [message, setMessage] = useState('');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth - 300;
    canvas.height = window.innerHeight - 100;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Connect to room
    socketService.connect(roomId, userName);

    // Load existing canvas
    socketService.onLoadCanvas((drawings) => {
      drawings.forEach(draw => {
        drawLine(draw.x1, draw.y1, draw.x2, draw.y2, draw.color, draw.thickness);
      });
    });

    // Listen for remote draws
    socketService.onRemoteDraw(({ x1, y1, x2, y2, color, thickness }) => {
      drawLine(x1, y1, x2, y2, color, thickness);
    });

    // Listen for user joined
    socketService.onUserJoined(({ userName, totalUsers }) => {
      setUsers(totalUsers);
      setMessage(`✅ ${userName} joined (${totalUsers} total)`);
      window.setTimeout(() => setMessage(''), 3000);
    });

    // Listen for clear
    socketService.onCanvasClear(() => {
      clearCanvas();
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, userName]);

  // Draw function
  const drawLine = (x1, y1, x2, y2, drawColor, thickness) => {
    contextRef.current.strokeStyle = drawColor;
    contextRef.current.lineWidth = thickness;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x1, y1);
    contextRef.current.lineTo(x2, y2);
    contextRef.current.stroke();
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Mouse down
  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    lastPointRef.current = { x: offsetX, y: offsetY };
    setIsDrawing(true);
  };

  // Mouse move
  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const lastPoint = lastPointRef.current || { x: offsetX, y: offsetY };

    // Draw locally
    drawLine(lastPoint.x, lastPoint.y, offsetX, offsetY, color, brushSize);

    // Send to server
    socketService.sendDraw(
      lastPoint.x,
      lastPoint.y,
      offsetX,
      offsetY,
      color,
      brushSize
    );

    lastPointRef.current = { x: offsetX, y: offsetY };
  };

  // Mouse up
  const handleMouseUp = () => {
    contextRef.current.closePath();
    lastPointRef.current = null;
    setIsDrawing(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            border: '2px solid #ccc',
            cursor: 'crosshair',
            backgroundColor: '#fff'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {message && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '5px'
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{
        width: '280px',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        overflowY: 'auto',
        borderLeft: '1px solid #ddd'
      }}>
        <h2>🎨 AirCanvas Share</h2>

        {/* Room Info */}
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
          <p><strong>Room:</strong> {roomId}</p>
          <p><strong>👥 Users:</strong> {users}</p>
          <p><strong>User:</strong> {userName}</p>
        </div>

        {/* Color Picker */}
        <div style={{ marginBottom: '20px' }}>
          <label><strong>Color:</strong></label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        {/* Brush Size */}
        <div style={{ marginBottom: '20px' }}>
          <label><strong>Brush Size:</strong> {brushSize}px</label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button
            onClick={() => {
              clearCanvas();
              socketService.sendClear();
            }}
            style={{
              padding: '10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Canvas
          </button>

          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = canvasRef.current.toDataURL();
              link.download = 'drawing.png';
              link.click();
            }}
            style={{
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            💾 Save Drawing
          </button>

          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}?room=${roomId}`;
              navigator.clipboard.writeText(shareUrl);
              window.alert('Room link copied!');
            }}
            style={{
              padding: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📤 Share Room
          </button>
        </div>

        {/* Gesture Guide */}
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fff9c4',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <strong>ℹ️ Tips:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
            <li>Share the room link</li>
            <li>Real-time sync</li>
            <li>Save your work</li>
            <li>Support unlimited users</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SharedCanvas;
