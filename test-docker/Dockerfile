FROM node:18-alpine

WORKDIR /app

# Create a simple health check endpoint
RUN echo '{"status":"healthy","service":"test"}' > health.json

# Install a simple HTTP server
RUN npm install -g http-server

# Expose port
EXPOSE 3000

# Start simple server
CMD ["http-server", "-p", "3000", "-c-1"]