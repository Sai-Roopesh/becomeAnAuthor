// Structured logger that writes to @tauri-apps/plugin-log in production
// and falls back to console in development/web contexts.
// Usage: const log = logger.scope('FeatureName')
//        log.warn('something went wrong', { userId, operation: 'save' })

type LogContext = Record<string, unknown>;

interface ScopedLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function isTauriContext(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatMessage(
  scope: string,
  message: string,
  context?: LogContext,
): string {
  const base = `[${scope}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    try {
      return `${base} | ${JSON.stringify(context)}`;
    } catch {
      return base;
    }
  }
  return base;
}

type TauriLogFn = (message: string) => Promise<void>;

interface TauriLogPlugin {
  debug: TauriLogFn;
  info: TauriLogFn;
  warn: TauriLogFn;
  error: TauriLogFn;
}

let tauriLog: TauriLogPlugin | null = null;
let tauriLogLoadAttempted = false;

async function getTauriLog(): Promise<TauriLogPlugin | null> {
  if (tauriLogLoadAttempted) return tauriLog;
  tauriLogLoadAttempted = true;
  try {
    // Dynamic import — module may not be installed; caught below if absent.
    const mod = await (import(
      "@tauri-apps/plugin-log" as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for dynamic plugin loading
    ) as Promise<any>);
    tauriLog = {
      debug: mod.debug as TauriLogFn,
      info: mod.info as TauriLogFn,
      warn: mod.warn as TauriLogFn,
      error: mod.error as TauriLogFn,
    };
    return tauriLog;
  } catch {
    // @tauri-apps/plugin-log not installed or not available — fall back to console
    return null;
  }
}

function makeConsoleFallback(scope: string): ScopedLogger {
  return {
    debug(message: string, context?: LogContext): void {
      console.debug(`[${scope}] ${message}`, ...(context ? [context] : []));
    },
    info(message: string, context?: LogContext): void {
      console.info(`[${scope}] ${message}`, ...(context ? [context] : []));
    },
    warn(message: string, context?: LogContext): void {
      console.warn(`[${scope}] ${message}`, ...(context ? [context] : []));
    },
    error(message: string, context?: LogContext): void {
      console.error(`[${scope}] ${message}`, ...(context ? [context] : []));
    },
  };
}

function makeScopedLogger(name: string): ScopedLogger {
  const consoleFallback = makeConsoleFallback(name);

  const dispatch = (
    level: "debug" | "info" | "warn" | "error",
    consoleFn: (message: string, context?: LogContext) => void,
    message: string,
    context?: LogContext,
  ): void => {
    if (!isTauriContext()) {
      consoleFn(message, context);
      return;
    }

    const formatted = formatMessage(name, message, context);

    void getTauriLog().then((plugin) => {
      if (!plugin) {
        consoleFn(message, context);
        return;
      }
      void plugin[level](formatted).catch(() => {
        consoleFn(message, context);
      });
    });
  };

  return {
    debug(message: string, context?: LogContext): void {
      dispatch(
        "debug",
        consoleFallback.debug.bind(consoleFallback),
        message,
        context,
      );
    },
    info(message: string, context?: LogContext): void {
      dispatch(
        "info",
        consoleFallback.info.bind(consoleFallback),
        message,
        context,
      );
    },
    warn(message: string, context?: LogContext): void {
      dispatch(
        "warn",
        consoleFallback.warn.bind(consoleFallback),
        message,
        context,
      );
    },
    error(message: string, context?: LogContext): void {
      dispatch(
        "error",
        consoleFallback.error.bind(consoleFallback),
        message,
        context,
      );
    },
  };
}

export const logger = {
  scope: (name: string): ScopedLogger => makeScopedLogger(name),
};
