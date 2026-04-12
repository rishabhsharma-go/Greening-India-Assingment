FROM golang:1.23-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates gcc musl-dev librdkafka-dev pkgconf
COPY go.mod ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -tags musl -ldflags="-s -w" -o carbon ./cmd/

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata librdkafka
WORKDIR /app
COPY --from=builder /app/carbon .
EXPOSE 8004
ENTRYPOINT ["./carbon"]
