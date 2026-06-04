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
