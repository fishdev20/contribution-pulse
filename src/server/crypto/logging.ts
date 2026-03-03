const TOKEN_PATTERNS = [/glpat-[A-Za-z0-9_-]{20,}/g, /[A-Za-z0-9]{30,}\.[A-Za-z0-9]{10,}\.[A-Za-z0-9_-]{10,}/g];

type SerializableError = {
  name: string;
  message: string;
  stack?: string;
};

function toSerializableError(value: unknown): SerializableError | undefined {
  if (!(value instanceof Error)) return undefined;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
  };
}

export function sanitizeLog(input: unknown): string {
  const asString =
    typeof input === "string"
      ? input
      : JSON.stringify(input, (_key, value) => {
          const asError = toSerializableError(value);
          if (asError) return asError;
          if (typeof value === "bigint") return value.toString();
          return value;
        });
  return TOKEN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, "[REDACTED_TOKEN]"), asString);
}

export function safeLog(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  const text = meta ? `${message} ${sanitizeLog(meta)}` : message;
  // eslint-disable-next-line no-console
  console[level](text);
}
