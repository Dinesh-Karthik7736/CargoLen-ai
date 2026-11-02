import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { isDatabaseReady } from "./db.js";

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ redact: ["req.headers.authorization", "req.headers.cookie"] }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "cargolens-api" });
  });

  app.get("/api/ready", (_request, response) => {
    const ready = isDatabaseReady();
    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      database: ready ? "connected" : "disconnected"
    });
  });

  return app;
}
