# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod file
COPY go.mod ./

# Copy source code first (needed for go mod tidy)
COPY . .

# Download dependencies and generate go.sum
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS and postgresql-client for migrations
RUN apk --no-cache add ca-certificates postgresql-client dos2unix

# Copy binary from builder
COPY --from=builder /app/server .

# Copy migrations and seeds
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeds ./seeds

# Copy entrypoint script and fix line endings
COPY docker-entrypoint.sh .
RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 8080

# Run entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
