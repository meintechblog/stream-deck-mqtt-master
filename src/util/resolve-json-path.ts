/**
 * Extract a value from a JSON payload using dot-notation path.
 * Falls back to the raw payload on any error (parse failure, missing key, null value).
 * Simple dot-notation only -- no array indexing, no wildcards (D-16).
 */
export function resolveJsonPath(payload: string, path: string): string {
  if (!path) return payload;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return payload;
  }

  const keys = path.split(".");
  let current: unknown = parsed;

  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return payload;
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (current == null) return payload;

  return String(current);
}

/**
 * Apply a display template with a single {{value}} placeholder (D-17).
 * If template is empty or falsy, returns the value unchanged.
 */
export function applyDisplayTemplate(template: string, value: string): string {
  if (!template) return value;
  return template.replace("{{value}}", value);
}
