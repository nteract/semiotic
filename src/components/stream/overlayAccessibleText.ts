/**
 * Shared accessible `<title>` / `<desc>` text for frame SVG overlays.
 *
 * Live overlays historically copied XY fallbacks (including Geo naming maps
 * "XY Chart") and ignored `description`. Keep family-specific fallbacks here
 * so canvas aria-labels, overlay chrome, and static SVG stay aligned.
 */
export function overlayAccessibleTitle(title: unknown, fallback: string): string {
  return typeof title === "string" && title.length > 0 ? title : fallback
}

export function overlayAccessibleDescription(
  title: unknown,
  description: unknown,
  options: { familyPhrase: string; fallback: string }
): string {
  if (typeof description === "string" && description.length > 0) return description
  if (typeof title === "string" && title.length > 0) {
    return `${title} (${options.familyPhrase})`
  }
  return options.fallback
}

/** Instance-local `<title>` / `<desc>` ids so two charts on one page do not collide. */
export function overlayAccessibleIds(idPrefix: string): {
  titleId: string
  descId: string
  labelledBy: string
} {
  const sanitized = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, "_")
  const pfx = /^[A-Za-z_]/.test(sanitized) ? sanitized : `c${sanitized}`
  const titleId = `${pfx}-semiotic-title`
  const descId = `${pfx}-semiotic-desc`
  return { titleId, descId, labelledBy: `${titleId} ${descId}` }
}
