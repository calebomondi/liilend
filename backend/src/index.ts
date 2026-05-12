import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { logger } from "./config/logger";
import apiRouter from "./routes/api";
import { indexerService } from "./services/indexer";
import { liquidationMonitor } from "./services/liquidation-monitor";
import { fxService } from "./services/fx-service";

const app = express();

/* ─── Middleware ──────────────────────────────────────────── */

app.use(helmet());
app.use(cors());
app.use(express.json());

/* ─── Request logging ─────────────────────────────────────── */

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/* ─── Routes ──────────────────────────────────────────────── */

app.use("/api", apiRouter);

/* ─── 404 handler ─────────────────────────────────────────── */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    timestamp: new Date(),
  });
});

/* ─── Global error handler ────────────────────────────────── */

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date(),
    });
  }
);

/* ─── Start ───────────────────────────────────────────────── */

async function main(): Promise<void> {
  logger.info("Starting LiiLend backend", {
    env: config.server.nodeEnv,
    port: config.server.port,
  });

  /* Warm FX cache. */
  try {
    await fxService.getRates();
    logger.info("FX cache warmed");
  } catch (err) {
    logger.warn("FX cache warm failed — will retry on first request", {
      error: err,
    });
  }

  /* Start background services. */
  try {
    await indexerService.start();
  } catch (err) {
    logger.error("Indexer failed to start", { error: err });
  }

  try {
    liquidationMonitor.start();
  } catch (err) {
    logger.error("Liquidation monitor failed to start", { error: err });
  }

  app.listen(config.server.port, config.server.host, () => {
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
  });
}

/* ─── Crash prevention ────────────────────────────────────── */

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — preventing crash", { error: err, stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection — preventing crash", { error: reason });
});

/* ─── Graceful shutdown ───────────────────────────────────── */

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received — shutting down");
  await indexerService.stop();
  liquidationMonitor.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received — shutting down");
  await indexerService.stop();
  liquidationMonitor.stop();
  process.exit(0);
});

main().catch((err) => {
  logger.error("Fatal startup error", { error: err });
  process.exit(1);
});

export default app;
