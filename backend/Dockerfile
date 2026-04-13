# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

# git: required by go mod for VCS-stamped modules
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# ── Dependency layer (cached until go.mod changes) ────────────────���───────────
# go mod download reads go.mod and fetches every listed module into the module
# cache, creating go.sum from scratch if it doesn't exist.
# Unlike go mod tidy, it does NOT need source files to run — so it works
# correctly even when go.sum is not committed to the repo.
COPY go.mod ./
RUN go mod download

# ── Build layer ───────────────────────────────────────────────────────────────
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w -extldflags=-static" \
    -trimpath \
    -o /bin/api \
    ./cmd/api

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# alpine gives us a shell + wget so Docker's CMD-SHELL health check works.
# It also keeps the image small (~12 MB vs ~300 MB for the full Go base image).
FROM alpine:3.20 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Migrations are embedded inside the binary via embed.FS — no volume needed.
COPY --from=builder /bin/api /api

EXPOSE 4000

ENTRYPOINT ["/api"]
