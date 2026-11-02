import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { isDatabaseReady } from "./db.js";
import { extractDocument } from "./services/geminiExtraction.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 } });
const extractionLimiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
const extractionRequest = z.object({ documentType: z.enum(["invoice", "packing_list", "bill_of_lading"]) });

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

  app.post("/api/dev/extract", (request, response, next) => {
    if (process.env.NODE_ENV === "production") return response.status(404).json({ error: "Not found." });
    return next();
  }, extractionLimiter, upload.single("file"), async (request, response, next) => {
    try {
      const input = extractionRequest.parse(request.body);
      if (!request.file) return response.status(400).json({ error: "Choose a document to extract." });

      const detected = await fileTypeFromBuffer(request.file.buffer);
      if (!detected || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
        return response.status(415).json({ error: "Upload a PDF, JPEG, PNG, or WebP document." });
      }

      const result = await extractDocument({
        bytes: request.file.buffer,
        mimeType: detected.mime,
        documentType: input.documentType
      });
      return response.json({ extraction: result });
    } catch (error) {
      if (error instanceof z.ZodError) return response.status(400).json({ error: "Choose invoice, packing list, or bill of lading." });
      if (error instanceof multer.MulterError) return response.status(413).json({ error: "The upload must be one file under 8 MB." });
      return next(error);
    }
  });

  app.use((_error, _request, response, _next) => {
    // Never include uploaded content, API keys, or provider errors in client responses or logs.
    console.error("API request failed.");
    response.status(500).json({ error: "The request could not be completed." });
  });

  return app;
}
