export type RemoteResult = { error?: { message?: string } | null };

export class OperationTimeoutError extends Error {
  constructor() {
    super("REMOTE_OPERATION_TIMEOUT");
    this.name = "OperationTimeoutError";
  }
}

export function isTransientRemoteError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "";

  return /timeout|timed out|network|fetch|connection|temporar|unavailable|econn|socket|502|503|504/i.test(message);
}

export function safeRemoteErrorMessage(
  error: unknown,
  fallback = "No pudimos completar la operación. Reintentá.",
) {
  return isTransientRemoteError(error)
    ? "La conexión está tardando más de lo esperado. Reintentá en unos segundos."
    : fallback;
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs = 12_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new OperationTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type ReadOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
};

export async function resilientRead<T extends RemoteResult>(
  operation: () => Promise<T>,
  options: ReadOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const retryDelayMs = options.retryDelayMs ?? 250;
  let lastResult: T | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await withTimeout(operation(), timeoutMs);
      lastResult = result;
      if (!result.error || !isTransientRemoteError(result.error.message)) return result;
      lastError = new Error(result.error.message || "REMOTE_READ_FAILED");
    } catch (error) {
      lastError = error;
      if (!isTransientRemoteError(error)) throw error;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  if (lastResult) return lastResult;
  throw lastError instanceof Error ? lastError : new Error("REMOTE_READ_FAILED");
}
