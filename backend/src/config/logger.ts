import winston from "winston";
import { config } from "./index";

const logFormat =
  config.logging.format === "json"
    ? winston.format.json()
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : "";
          return `${timestamp} [${level}]: ${message}${extra}`;
        })
      );

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [new winston.transports.Console()],
});

export type Logger = typeof logger;
