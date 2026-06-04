# iCall Signaling Server

Node.js WebSocket signaling server for WebRTC-based Flutter calling app.

## Local Testing

```bash
npm install
npm start
```

Server will run on `ws://localhost:8080`

## Deployment to Google Cloud Run (via Console UI)

### 1. Prepare for Deployment

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"
```

### 2. Deploy via Cloud Console UI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Run**
3. Click **Create Service**
4. Choose **Deploy one revision from an existing image** → **Container registry**
5. Select your project and the image `icall-signaling-server`
6. Configure:
   - **Service name**: `icall-signaling-server`
   - **Region**: `us-central1` (or your preferred region)
   - **Authentication**: Allow unauthenticated invocations
   - **Memory**: 256 MB (default is fine)
   - **CPU**: 1 (default is fine)
   - **Timeout**: 3600 seconds
7. Click **Create**

### 3. Get Your WebSocket URL

After deployment, copy the service URL (e.g., `https://icall-signaling-server-xxxxx.a.run.app`).

Convert to WebSocket URL: `wss://icall-signaling-server-xxxxx.a.run.app`

Use this URL in your Flutter client.

## Message Protocol

### Register
```json
{
  "type": "register",
  "senderId": "user123"
}
```

### Call
```json
{
  "type": "call",
  "senderId": "user123",
  "targetId": "user456",
  "offer": { /* WebRTC offer */ }
}
```

### Answer
```json
{
  "type": "answer",
  "senderId": "user456",
  "targetId": "user123",
  "answer": { /* WebRTC answer */ }
}
```

### ICE Candidate
```json
{
  "type": "ice-candidate",
  "senderId": "user123",
  "targetId": "user456",
  "candidate": { /* ICE candidate */ }
}
```

### Hangup
```json
{
  "type": "hangup",
  "senderId": "user123",
  "targetId": "user456"
}
```
