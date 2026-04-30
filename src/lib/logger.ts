import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "solar-dashboard" },
  redact: {
    paths: [
      "password",
      "pwd",
      "token",
      "Token",
      "tokenCipher",
      "SEMS_PASSWORD",
      "DASHBOARD_PASSWORD_HASH",
      "SESSION_ENCRYPTION_KEY",
      "NEXTAUTH_SECRET",
      "*.password",
      "*.pwd",
      "*.token",
    ],
    remove: true,
  },
});
