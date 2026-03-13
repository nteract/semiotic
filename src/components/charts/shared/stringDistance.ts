/**
 * String distance utilities for typo detection and field suggestions.
 * Shared by validateProps and validateChartData.
 */

/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[] = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/**
 * Find the closest match from candidates by Levenshtein distance.
 * Returns the match if distance <= maxDist, otherwise null/undefined.
 */
export function closestMatch(
  input: string,
  candidates: string[],
  maxDist = 3
): string | undefined {
  let best: string | undefined
  let bestDist = maxDist + 1
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase())
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return bestDist <= maxDist ? best : undefined
}
