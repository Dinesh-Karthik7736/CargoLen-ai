import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

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

  return app;
}
