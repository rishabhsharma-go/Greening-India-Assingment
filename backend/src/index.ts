import "dotenv/config";

import crypto from "node:crypto";
import http from "http";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { makeRouter } from "./routes/index.js";

// Express app setup.
//
// - Loads security headers (helmet)
// - Parses JSON bodies
// - Attaches request-scoped logging (pino-http)
// - Mounts the API router
const app = express();
//remove x-powered-by header
app.disable("x-powered-by");
//set security headers
app.use(helmet());
//parse json bodies
app.use(express.json({ limit: "1mb" }));
//log requests
app.use(
  pinoHttp({
    logger,
    genReqId: (req: http.IncomingMessage) =>
      req.headers["x-request-id"]?.toString() || crypto.randomUUID(),
  }),
);

// Mount all API routes (health/auth/projects/tasks) and the error handler.
app.use(makeRouter());

const server = http.createServer(app);

server.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "api started");
});

// Graceful shutdown for local dev and container environments.
const shutdown = (signal: string) => {
  logger.info({ signal }, "shutdown signal received");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "error during server close");
      process.exit(1);
    }
    logger.info("graceful shutdown complete");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT")); // user pressed ctrl+c
process.on("SIGTERM", () => shutdown("SIGTERM")); // docker stop
