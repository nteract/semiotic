/** Keep local diagnostic hooks out of serialized reports and failure control flow. */
export function reportRenderError(
  error: unknown,
  observer?: (error: unknown) => void
): void {
  try {
    observer?.(error)
  } catch {
    // A logging failure cannot turn a blocked chart into a thrown agent loop.
  }
}
