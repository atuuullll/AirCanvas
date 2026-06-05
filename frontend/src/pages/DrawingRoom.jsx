import React, { useEffect, useState } from 'react';
import SharedCanvas from '../components/SharedCanvas';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const DrawingRoom = () => {
  const [searchParams] = useSearchParams();
  const [roomId, setRoomId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Get room from URL or create new
    const room = searchParams.get('room') || uuidv4().slice(0, 8);
    setRoomId(room);
  }, [searchParams]);

  const handleJoin = (name) => {
    setUserName(name || `User${Math.floor(Math.random() * 9000)}`);
    setIsJoined(true);
  };

  if (!isJoined) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h1>🎨 AirCanvas Share</h1>
          <p>Room: <strong>{roomId}</strong></p>

          <input
            type="text"
            placeholder="Enter your name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleJoin(e.target.value);
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '5px',
              border: '1px solid #ccc'
            }}
          />

          <button
            onClick={(e) => {
              const name = e.target.previousElementSibling.value;
              handleJoin(name);
            }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Join Room
          </button>

          <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            Share this link with others:
            <br />
            <input
              type="text"
              readOnly
              value={`${window.location.origin}?room=${roomId}`}
              style={{
                width: '100%',
                padding: '5px',
                marginTop: '10px',
                borderRadius: '3px',
                border: '1px solid #ccc'
              }}
            />
          </p>
        </div>
      </div>
    );
  }

  return <SharedCanvas roomId={roomId} userName={userName} />;
};

export default DrawingRoom;
