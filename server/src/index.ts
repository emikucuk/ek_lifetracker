import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Server } from "node:http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { categoryRepository } from "./repositories/CategoryRepository.js";
import { entriesRouter } from "./routes/entries.js";
import { categoriesRouter } from "./routes/categories.js";
import { voiceRouter } from "./routes/voice.js";
import { parseHintsRouter } from "./routes/parseHints.js";
import { backupRouter } from "./routes/backup.js";
import { settingsRouter } from "./routes/settings.js";
import { parseRouter } from "./routes/parse.js";
import { settingsService } from "./services/SettingsService.js";
import { autoBackupService } from "./services/AutoBackupService.js";
import { emailReminderScheduler } from "./services/EmailReminderScheduler.js";
import { emailRouter } from "./routes/email.js";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.clientOrigin) return true;
  if (origin === "http://127.0.0.1:5181") return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".ts.net")) return true;
  } catch {
    return false;
  }
  return false;
}

const app = express();
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const ollama = await settingsService.pingOllama();
  res.json({
    ok: dbOk,
    service: "ek-lifetracker",
    db: dbOk ? "up" : "down",
    ollama: {
      ok: ollama.ok,
      model: ollama.model,
      hasModel: ollama.hasModel ?? false,
      models: ollama.models?.slice(0, 8) ?? [],
      error: ollama.error,
    },
  });
});

app.use("/api/entries", entriesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/parse-hints", parseHintsRouter);
app.use("/api/parse", parseRouter);
app.use("/api/backup", backupRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/email", emailRouter);
app.use("/api/voice", voiceRouter);
app.use(errorHandler);

const server: Server = app.listen(env.port, "0.0.0.0", async () => {
  try {
    await categoryRepository.ensureSystemCategories();
    logger.info("System categories ready");
  } catch (error) {
    logger.error("Failed to seed categories", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  autoBackupService.startScheduler();
  emailReminderScheduler.start();
  logger.info(`EK LifeTracker listening on http://0.0.0.0:${env.port}`);
});

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down...`);
  emailReminderScheduler.stop();
  autoBackupService.stopScheduler();
  try {
    await autoBackupService.run("shutdown", { force: true });
  } catch (error) {
    logger.error("Shutdown backup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
// Windows console close / nodemon-ish
process.on("SIGHUP", () => void shutdown("SIGHUP"));
