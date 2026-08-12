const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export function assessStableHealth(
  health,
  publishedLatest,
  { allowStaleRemote = false } = {},
) {
  if (!health || typeof health !== "object" || Array.isArray(health)) {
    throw new Error("Stable MCP /health did not return a JSON object")
  }
  if (health.channel !== "stable") {
    throw new Error(
      `Stable MCP /health channel must be "stable" (received ${JSON.stringify(health.channel)})`,
    )
  }
  if (
    typeof health.packageVersion !== "string" ||
    !EXACT_VERSION.test(health.packageVersion)
  ) {
    throw new Error(
      `Stable MCP /health returned an invalid packageVersion ${JSON.stringify(health.packageVersion)}`,
    )
  }
  if (health.packageVersion !== publishedLatest && !allowStaleRemote) {
    throw new Error(
      `Stable MCP /health serves packageVersion ${JSON.stringify(health.packageVersion)}, ` +
        `but public npm latest is semiotic@${publishedLatest}`,
    )
  }
  return {
    packageVersion: health.packageVersion,
    stale: health.packageVersion !== publishedLatest,
  }
}
