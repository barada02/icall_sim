const WebSocket = require('ws');

// Use port from environment variable (required by Cloud Run) or default to 8080
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Track active connections: Map<clientId, WebSocket>
const clients = new Map();

console.log(`Signaling server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let registeredId = null;

  // Send keep-alive ping every 30 seconds to prevent Cloud Run idle timeout
  const keepAliveInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register':
          // Register the user's unique ID
          registeredId = data.senderId;
          clients.set(registeredId, ws);
          console.log(`User registered: ${registeredId}`);
          ws.send(JSON.stringify({ type: 'registered', status: 'success' }));
          break;

        case 'call':
        case 'answer':
        case 'ice-candidate':
        case 'hangup':
          // Route the call signaling message to the target user
          const targetId = data.targetId;
          const targetClient = clients.get(targetId);
          
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            console.log(`Routing message [${data.type}] from ${registeredId} to ${targetId}`);
            targetClient.send(JSON.stringify(data));
          } else {
            console.log(`Failed to route [${data.type}] - Target ${targetId} not found or offline`);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: `User ${targetId} is offline or unavailable.` 
            }));
          }
          break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    clearInterval(keepAliveInterval);
    if (registeredId) {
      clients.delete(registeredId);
      console.log(`User disconnected: ${registeredId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});
