FROM golang:1.22-bookworm AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /taskflow ./main.go

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY --from=build /taskflow /taskflow

EXPOSE 8080

CMD ["/taskflow"]
