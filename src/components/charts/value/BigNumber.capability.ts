import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * BigNumber capability descriptor.
 *
 * `fits()` accepts datasets that resolve to a single focal value:
 *   - exactly one row with a numeric field, or
 *   - any dataset where a `total` / `value` aggregation makes sense
 *     and the suggestion engine has already declared the scale `tiny`.
 *
 * At tiny scale BigNumber is the catalog's "honest" answer: when you
 * have one number, a chart is the wrong abstraction — show the number.
 */
export const BigNumberCapability: ChartCapability = {
  component: "BigNumber",
  family: "value",
  importPath: "semiotic/value",
  // Familiarity 5 (every dashboard user has seen one), accuracy 5 (the
  // number is the data, no encoding distortion), precision 5 (exact
  // figure right there in the value text).
  rubric: { familiarity: 5, accuracy: 5, precision: 5 },

  fits: (profile) => {
    // Need at least one numeric field to display.
    if (!profile.primary.y && !profile.primary.size && profile.candidates.y.length === 0) {
      return "needs a numeric value to display"
    }
    // BigNumber is genuinely a single-value display. We allow a slightly
    // larger row count so streaming-ish datasets (e.g. a recent history
    // for a sparkline) still qualify — the buildProps step picks the
    // latest row for the focal value.
    if (profile.rowCount > 50) {
      return "BigNumber shows a single focal value — pass scalar data, or use a chart family for >50 rows"
    }
    return null
  },

  intentScores: {
    // Trend isn't BigNumber's primary intent, but a `trendSlot` chart
    // can carry a small trend signal — only when the data actually has
    // a temporal axis (time field or x-named/monotonic index). A
    // categorical product catalog has no inherent ordering, so
    // claiming trend coverage there would mislead the dashboard
    // suggester into picking a value tile for a question that needs a
    // line / area chart on a different dataset.
    "trend": (p) => {
      if (!(p.hasTimeAxis || p.xProvenance === "named" || p.monotonicX)) return 0
      return p.rowCount <= 8 ? 3 : 1
    },

    // Comparing a single value to a target or prior period is exactly
    // what BigNumber + comparison + target props are for.
    "compare-categories": 1,
    "rank": 1,
    // 5 at rowCount === 1 (parity with GaugeChart) so BigNumber's
    // higher rubric + scaleFit boost tips it over Gauge as the default
    // single-value answer. Gauges remain ranked when bounded scale is
    // declared or the user explicitly asks for one.
    "part-to-whole": (p) => (p.rowCount === 1 ? 5 : 1),
    "change-detection": (p) => {
      if (!(p.hasTimeAxis || p.xProvenance === "named" || p.monotonicX)) return 0
      return p.rowCount <= 8 ? 4 : 1
    },
  },

  caveats: (profile) => {
    const out: string[] = []
    if (profile.rowCount > 1) {
      out.push("BigNumber renders the latest row's value as the focal number; earlier rows feed an optional sparkline")
    }
    return out
  },

  buildProps: (profile) => {
    const yField =
      profile.primary.y ??
      profile.primary.size ??
      profile.candidates.y[0]?.field
    if (!yField) return { value: 0 }

    const rows = profile.data
    const latest = rows.length > 0 ? rows[rows.length - 1] : null
    const value = latest ? Number(latest[yField]) : 0

    const props: Record<string, unknown> = {
      value: Number.isFinite(value) ? value : 0,
      label: yField,
    }
    // When two or more rows are present, the prior row's value becomes
    // a comparison so the auto-generated card carries a delta + ARIA
    // sentence out of the box.
    if (rows.length >= 2) {
      const prior = Number(rows[rows.length - 2][yField])
      if (Number.isFinite(prior)) {
        props.comparison = { value: prior, label: "vs previous" }
      }
    }
    // BigNumber ships no chart of its own — `trendSlot` / `chartSlot`
    // are React composition surfaces, not serializable props. The
    // suggestion engine can't fill those; consumers add a chart node
    // themselves after spreading the generated `props`.
    return props
  },

  // Prefer BigNumber for tiny, unbounded single-value displays. Gauges remain
  // available when a declared min/max gives the arc an honest scale.
  scaleFit: (_profile, effective) => {
    if (effective.rowBand === "tiny") {
      return { delta: 0.8, reason: "single-value displays beat charts when there is one number to show" }
    }
    if (effective.rowBand === "small") {
      return { delta: 0.2, reason: "the latest value with a trend spark is often more legible than a chart at small scale" }
    }
    return null
  },
}
