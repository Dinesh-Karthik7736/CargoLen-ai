import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./db.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const server = createServer(app);

async function start() {
  await connectDatabase();
  server.listen(port, () => {
    console.log(`CargoLens API listening on port ${port}`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down gracefully.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("CargoLens API failed to start:", error.message);
  process.exit(1);
});
