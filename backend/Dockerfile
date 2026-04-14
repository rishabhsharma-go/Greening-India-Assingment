# Build Stage
FROM golang:1.22 AS builder
WORKDIR /app

# Copy and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# CRITICAL: CGO_ENABLED=0 makes the binary self-contained
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final Stage
FROM alpine:latest
WORKDIR /app

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client bash

# Copy the static binary from the builder
COPY --from=builder /app/main .

# Copy migrations and scripts
COPY migrations ./migrations/
COPY migrate.sh ./

# Ensure the binary has execution permissions
RUN chmod +x ./main ./migrate.sh

EXPOSE 8080

# Run migrations then start server
CMD ["sh", "-c", "./migrate.sh && ./main"]