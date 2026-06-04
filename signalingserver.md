# Signaling Server Setup & Google Cloud Run Deployment Guide

This document contains the complete Node.js WebSocket signaling server code and step-by-step instructions to deploy it to **Google Cloud Run**.

---

## 1. Server Code (`server.js`)

Create a directory outside your Flutter project (e.g., `icall-server/`) and create a file named `server.js` with the following content:

```javascript
const WebSocket = require('ws');

// Use port from environment variable (required by Cloud Run) or default to 8080
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Track active connections: Map<clientId, WebSocket>
const clients = new Map();

console.log(`Signaling server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let registeredId = null;

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
    if (registeredId) {
      clients.delete(registeredId);
      console.log(`User disconnected: ${registeredId}`);
    }
  });
});
```

---

## 2. Dockerfile & Package Files

To run the server on Google Cloud Run, it must be containerized.

### `package.json`
```json
{
  "name": "icall-signaling-server",
  "version": "1.0.0",
  "description": "Signaling server for WebRTC Flutter calling app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ws": "^8.16.0"
  }
}
```

### `Dockerfile`
```dockerfile
# Use lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy server source code
COPY server.js .

# Expose port (Cloud Run sets PORT env variable automatically)
EXPOSE 8080

# Start server
CMD ["npm", "start"]
```

---

## 3. Deploying to Google Cloud Run

Follow these steps to deploy using the Google Cloud CLI (`gcloud`).

### Step 1: Initialize gcloud (if not already done)
```bash
gcloud init
```

### Step 2: Build and Push Container using Cloud Build
Run this command from inside your server directory `icall-server/`. Replace `YOUR_PROJECT_ID` with your Google Cloud Project ID:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/icall-signaling-server
```

### Step 3: Deploy to Cloud Run
Deploy the container. Ensure you enable WebSockets by ensuring session affinity (optional but recommended) and setting the timeout appropriately.
```bash
gcloud run deploy icall-signaling-server \
  --image gcr.io/YOUR_PROJECT_ID/icall-signaling-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout=3600
```

> [!IMPORTANT]
> **Cloud Run WebSocket Requirements:**
> 1. Cloud Run supports WebSockets by default. However, Cloud Run automatically terminates connections that are idle. To prevent this, the client/server must send periodic **ping/pong keep-alive messages** (e.g., every 30 seconds), which we will build into the Flutter client.
> 2. **Scaling Considerations**: Cloud Run will scale instances up/down. In a multi-instance scaling setup, Peer A might connect to Instance 1, and Peer B might connect to Instance 2, preventing them from signaling each other.
>    * **Solution for Dev/POC**: Set the maximum instances to `1` so there is only ever one server container instance: `--max-instances=1`.
>    * **Solution for Production Scaling**: Integrate Redis Pub/Sub so that multiple container instances can share signaling messages.
