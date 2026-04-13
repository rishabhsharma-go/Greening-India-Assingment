# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates

# Copy gateway module files first for better layer caching
COPY services/gateway/go.mod ./

# Copy gateway source
COPY services/gateway/ .
RUN go mod tidy

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o gateway ./cmd/

# Runtime stage
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/gateway .

# Copy migrations from repo root (build context must be repo root)
COPY migrations/ /migrations/

EXPOSE 8000
CMD ["./gateway"]
