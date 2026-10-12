/**
 * Redaction for provider error bodies before they reach thrown errors or logs.
 *
 * Error bodies can echo the bearer token back (LiteLLM's auth errors do), so
 * the configured key is removed verbatim, whatever its format, and any
 * remaining `sk-` style key (including masked forms like `sk-...-dev`) is
 * removed as well.
 */
export const REDACTED_API_KEY = "[REDACTED_API_KEY]"

export function sanitizedApiError(value, apiKey) {
  let text = String(value)
  const key = typeof apiKey === "string" ? apiKey.trim() : ""
  if (key) text = text.split(key).join(REDACTED_API_KEY)
  return text.replace(/sk-[A-Za-z0-9_*.-]+/g, REDACTED_API_KEY)
}
