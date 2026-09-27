const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{8,128}$/;

function validateToken(value: string) {
  const token = value.trim();
  if (!TOKEN_PATTERN.test(token)) throw new Error("INVALID_COMPLETION_TOKEN");
  return token;
}

export function parseCompletionToken(rawValue: string) {
  const value = rawValue.trim();
  if (!value || value.length > 512 || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new Error("INVALID_COMPLETION_TOKEN");
  }

  if (!value.includes(":")) return validateToken(value);

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("INVALID_COMPLETION_TOKEN");
  }
  if (
    parsed.protocol !== "laburapp:"
    || parsed.hostname !== "complete"
    || (parsed.pathname !== "" && parsed.pathname !== "/")
    || parsed.hash
  ) {
    throw new Error("INVALID_COMPLETION_TOKEN");
  }
  return validateToken(parsed.searchParams.get("token") ?? "");
}

