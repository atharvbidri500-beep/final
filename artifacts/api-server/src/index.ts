import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  /* ── Keep-alive self-ping every 4 minutes ──────────────────────────────
     Prevents Replit from putting the server to sleep when disconnected.
     Uses Node's built-in http so there are no extra dependencies.        */
  const http = require("http");
  const PING_INTERVAL_MS = 4 * 60 * 1000;

  setInterval(() => {
    const req = http.get(`http://localhost:${port}/api/health`, (res: any) => {
      res.resume();
    });
    req.on("error", () => {});
    req.setTimeout(5000, () => { req.destroy(); });
  }, PING_INTERVAL_MS);

  logger.info("Keep-alive self-ping enabled (every 4 minutes)");
});
