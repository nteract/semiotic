import type { ConsumerContract } from "./types"

/** Shared by source-renderer Vitest and built-renderer Playwright tests.
 * Only intentional observables are checked; generated IDs and SVG bytes aren't.
 */
export function contractFailures(
  contract: ConsumerContract,
  evidence: object,
  document: Document
): string[] {
  const failures: string[] = []
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(`${contract.id}: ${message}`)
  }
  const equal = (actual: unknown, expected: unknown): boolean => {
    if (typeof expected === "number") {
      return typeof actual === "number" && Math.abs(actual - expected) < 1e-6
    }
    if (expected !== null && typeof expected === "object") {
      if (actual === null || typeof actual !== "object") return false
      const a = Object.entries(actual).sort()
      const b = Object.entries(expected).sort()
      return (
        a.length === b.length &&
        b.every(([key, value], i) => a[i][0] === key && equal(a[i][1], value))
      )
    }
    return actual === expected
  }
  const actual = evidence as Record<string, unknown>
  const expected = contract.expected
  for (const [key, value] of Object.entries({
    ...expected.evidence,
    markCount: Object.values(expected.evidence.markCountByType).reduce(
      (a, b) => a + b,
      0
    ),
    status: "ok",
    empty: false,
    warnings: []
  })) {
    check(
      equal(actual[key], value),
      `evidence.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`
    )
  }
  const svg = document.querySelector("svg")
  check(svg?.getAttribute("role") === "img", "SVG must have role=img")
  check(
    svg?.getAttribute("aria-label") === expected.evidence.ariaLabel,
    "SVG accessible name disagrees with the contract"
  )
  for (const rule of expected.svg) {
    const nodes = [...document.querySelectorAll(rule.selector)]
    check(
      nodes.length === rule.count,
      `${rule.selector}: expected ${rule.count} nodes, got ${nodes.length}`
    )
    if (rule.texts) {
      check(
        equal(
          nodes.map((node) => node.textContent?.trim()),
          rule.texts
        ),
        `${rule.selector}: expected text ${JSON.stringify(rule.texts)}`
      )
    }
    for (const node of nodes) {
      for (const [attr, value] of Object.entries(rule.attributes ?? {})) {
        check(
          node.getAttribute(attr) === value,
          `${rule.selector}: expected ${attr}=${value}`
        )
      }
      for (const [attr, value] of Object.entries(
        rule.attributeIncludes ?? {}
      )) {
        check(
          node.getAttribute(attr)?.includes(value) === true,
          `${rule.selector}: ${attr} must include ${value}`
        )
      }
    }
  }
  if (expected.startAngle !== undefined) {
    const path = document
      .querySelector('path[fill]:not([fill="none"])')
      ?.getAttribute("d")
    const start = path?.match(/^M([\d.e+-]+),([\d.e+-]+)/i)
    const degrees = start
      ? ((Math.atan2(Number(start[1]), -Number(start[2])) * 180) / Math.PI +
          360) %
        360
      : NaN
    check(
      Math.abs(degrees - expected.startAngle) < 0.01,
      `first wedge must start at ${expected.startAngle} degrees, got ${degrees}`
    )
  }
  if (expected.legendBelowLabel) {
    // These fixtures use translated SVG text. Check placement, not just presence.
    const y = (node: Element) => {
      let value = Number(node.getAttribute("y") ?? 0)
      for (
        let parent = node.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const translation = parent
          .getAttribute("transform")
          ?.match(/translate\(\s*[-\d.]+[,\s]+([-\d.]+)\)/)
        if (translation) value += Number(translation[1])
      }
      return value
    }
    const label = [...document.querySelectorAll("text")].find(
      (node) => node.textContent === expected.legendBelowLabel
    )
    const legend = [...document.querySelectorAll(".semiotic-legend text")]
    check(
      !!label &&
        legend.length > 0 &&
        legend.every((node) => y(node) > y(label)),
      `legend must sit below ${expected.legendBelowLabel}`
    )
  }
  return failures
}
