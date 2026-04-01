import { appEnv } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

declare global {
  interface Window {
    __WHISPERSTAT_LOGS__?: Array<Record<string, unknown>>;
  }
}

const shouldLog = (level: LogLevel) => {
  if (level === "warn" || level === "error") {
    return true;
  }

  return appEnv.environment !== "production" || appEnv.debugLogs;
};

export const appLog = (level: LogLevel, event: string, context: LogContext = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    scope: "whisperstat-client",
    env: appEnv.environment,
    level,
    event,
    context
  };

  if (typeof window !== "undefined") {
    window.__WHISPERSTAT_LOGS__ = window.__WHISPERSTAT_LOGS__ ?? [];
    window.__WHISPERSTAT_LOGS__.push(entry);
  }

  if (!shouldLog(level)) {
    return;
  }

  const consoleMethod =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;

  consoleMethod(entry);
};

export const logAsync = async <T>(
  event: string,
  work: () => Promise<T>,
  context: LogContext = {}
) => {
  const start = performance.now();
  appLog("info", `${event}.started`, context);

  try {
    const result = await work();
    appLog("info", `${event}.succeeded`, {
      ...context,
      durationMs: Math.round(performance.now() - start)
    });
    return result;
  } catch (error) {
    appLog("error", `${event}.failed`, {
      ...context,
      durationMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
