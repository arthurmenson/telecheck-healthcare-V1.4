FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install
COPY . .
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:3003/health || exit 1
CMD ["npx", "tsx", "src/server.ts"]
