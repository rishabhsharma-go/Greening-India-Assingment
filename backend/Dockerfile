# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Use production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and migrations
COPY --from=builder /app/dist ./dist

# Create a non-root user and set ownership
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup && \
    chown -R nodeuser:nodegroup /app

USER nodeuser

EXPOSE 4000

# The start script already handles migrations and seeding
CMD ["npm", "start"]
