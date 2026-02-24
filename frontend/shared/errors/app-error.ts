export class AppError extends Error {
  code: string;
  recoverable: boolean;
  override cause?: unknown;

  constructor(
    code: string,
    message: string,
    options?: { recoverable?: boolean; cause?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.recoverable = options?.recoverable ?? true;
    this.cause = options?.cause;
  }
}

function parseCodePrefix(
  message: string,
): { code: string; message: string } | null {
  const match = message.match(/^\[([A-Z0-9_]+)\]\s*(.+)$/);
  if (!match) return null;
  const code = match[1];
  const parsedMessage = match[2];
  if (!code || !parsedMessage) return null;
  return { code, message: parsedMessage };
}

export function toAppError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    const parsed = parseCodePrefix(error.message);
    if (parsed) {
      return new AppError(parsed.code, parsed.message, {
        recoverable: true,
        cause: error,
      });
    }
    return new AppError(fallbackCode, error.message || fallbackMessage, {
      recoverable: true,
      cause: error,
    });
  }

  if (typeof error === "string") {
    const parsed = parseCodePrefix(error);
    if (parsed) {
      return new AppError(parsed.code, parsed.message, { recoverable: true });
    }
    return new AppError(fallbackCode, error || fallbackMessage, {
      recoverable: true,
    });
  }

  return new AppError(fallbackCode, fallbackMessage, {
    recoverable: true,
    cause: error,
  });
}
