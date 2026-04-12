# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application and essential files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 3000

# Use ENTRYPOINT for standard production container orchestration
ENTRYPOINT ["./entrypoint.sh"]
