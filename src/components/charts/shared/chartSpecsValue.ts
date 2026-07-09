import type { ChartSpec } from "./chartSpecCore"

export const VALUE_CHART_SPECS: Record<string, ChartSpec> = {
  BigNumber: {
    name: "BigNumber",
    category: "value",
    description: "Focal-value display: one number, optionally with comparison / target / threshold zones (mapped to semantic theme roles) / four layout modes (tile / presentation / inline / thumbnail). Ships with NO chart-family dependency — embed your own Semiotic chart via two slots: `trendSlot` for wide / rectangular charts (LineChart, AreaChart) under the value, and `chartSlot` for square charts (DonutChart, PieChart, Scatterplot, Treemap) beside the value. The slot context exposes the resolved threshold colour + sentiment + push buffer so embedded charts can theme-link. Forward-looking POC for a future SingleValueFrame.",
    // `value` is intentionally NOT in `required` — null / undefined route
    // the card into its documented empty state. Marking required would
    // make validateProps reject legitimate optional-data usages like
    // `<BigNumber value={data?.revenue} />`.
    required: [],
    dataShape: "none",
    dataAccessors: [],
    // BigNumber is a plain React component and doesn't consume the
    // chart-frame prop bag (margin, title, showLegend/Grid, colorBy,
    // tooltip, annotations, axisExtent, frameProps). Listing the few
    // common-bag props it DOES use (width / height / className / onClick)
    // explicitly here keeps the AI schema honest.
    propBags: [],
    ownProps: {
      width: { type: ["number", "string"], default: 280, description: "Reserved width in pixels (or any CSS length). Mode-keyed defaults: 280 (tile) / 540 (presentation) / unset (inline / thumbnail)." },
      height: { type: ["number", "string"], default: 184, description: "Reserved height in pixels (or any CSS length). Mode-keyed defaults: 184 (tile) / 320 (presentation) / unset (inline / thumbnail)." },
      className: { type: "string", description: "Composed with the BEM root class on the outer container." },
      value: { type: "number", description: "The focal number this card exists to display" },
      label: { type: "string", description: "Top-line descriptor rendered above the value" },
      caption: { type: "string", description: "Secondary descriptor, smaller, below the label" },
      format: { type: ["string", "function"], enum: ["number", "currency", "percent", "compact", "duration"] as const, default: "number", description: "Number-format shortcut or custom (value) => string" },
      locale: { type: "string", default: "en-US", description: "BCP-47 locale for Intl.NumberFormat" },
      currency: { type: "string", default: "USD", description: "ISO 4217 code for format: \"currency\"" },
      precision: { type: "number", description: "maximumFractionDigits passed to Intl.NumberFormat" },
      prefix: { type: "string", description: "Prepend to formatted value" },
      suffix: { type: "string", description: "Append to formatted value" },
      unit: { type: "string", description: "Unit label rendered after the value as small text (e.g. \"USD\", \"req/s\")" },
      comparison: { type: "object", description: "Comparison value: { value, label?, format?, direction? }. Drives the delta when explicit delta is not set." },
      target: { type: "object", description: "Target value: { value, label?, format?, direction? }. Renders \"X% of target\" next to the comparison row." },
      delta: { type: "number", description: "Explicit delta override; bypasses comparison-derived subtraction" },
      deltaFormat: { type: ["string", "function"], enum: ["number", "currency", "percent", "compact", "duration"] as const, description: "Format the delta; defaults to format" },
      showDeltaPercent: { type: "boolean", default: true, description: "Render percent change next to absolute delta when a comparison is present" },
      direction: { type: "string", enum: ["higher-is-better", "lower-is-better", "neutral"] as const, default: "higher-is-better", description: "Default direction used to infer sentiment from the sign of the delta" },
      sentiment: { type: "string", enum: ["auto", "positive", "negative", "neutral"] as const, default: "auto", description: "Force sentiment; \"auto\" infers from direction + delta sign" },
      thresholds: { type: "array", description: "Threshold zones: [{ at, level, color?, label? }] ordered ascending by `at`. Resolved by highest `at` ≤ value. `level` maps to a semantic CSS variable (--semiotic-{success|warning|danger|info})." },
      chartSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Square chart to render beside the value — e.g. a DonutChart / PieChart / Scatterplot / Treemap. ReactNode or (ctx) => ReactNode; the function form receives the resolved level / color / sentiment / pushBuffer." },
      chartSize: { type: "number", description: "Pixel size reserved for chartSlot (rendered as a square). Mode-keyed defaults: 44 (tile) / 80 (presentation) — sparkline scale; pass a larger value for a hero anchor." },
      windowSize: { type: "number", default: 60, description: "Cap on the trend buffer when fed via push API" },
      mode: { type: "string", enum: ["tile", "presentation", "inline", "thumbnail"] as const, default: "tile", description: "Layout mode — chrome envelope around the value" },
      align: { type: "string", enum: ["start", "center", "end"] as const, description: "Horizontal alignment within the card" },
      padding: { type: ["number", "object"], description: "Inner padding: number for uniform, or { top, right, bottom, left }" },
      emphasis: { type: "string", enum: ["primary", "secondary"] as const, description: "Visual emphasis hint; \"primary\" spans two ChartGrid columns" },
      color: { type: "string", description: "Override the value text colour. CSS variables work." },
      background: { type: "string", description: "Card background. CSS variables work." },
      borderColor: { type: "string" },
      borderRadius: { type: ["number", "string"] },
      animate: { type: ["boolean", "object"], description: "Tween between value changes. true = 300ms ease-out + intro. Object: { duration?, easing?: \"linear\"|\"ease-out\", intro? }" },
      stalenessThreshold: { type: "number", description: "Mark stale (dimmed) when no push occurs for this many ms" },
      staleLabel: { type: "string", default: "stale" },
      headerSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Replace the entire header (label + caption) slot" },
      valueSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Replace the focal value slot" },
      deltaSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Replace the delta / comparison / target row" },
      trendSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Wide / rectangular chart embedded beneath the value — e.g. a LineChart / AreaChart in mode=\"sparkline\". ReactNode or (ctx) => ReactNode; the function form receives the resolved level / color / sentiment / pushBuffer." },
      footerSlot: { type: ["string", "number", "array", "object", "function"], omitFromSchema: true, description: "Free-form footer below the trend" },
      onClick: { type: "function", omitFromSchema: true },
      onObservation: { type: "function", omitFromSchema: true },
    },
    capabilities: {
      renderModes: ["svg"],
      supportsLegend: false,
      supportsSelection: false,
      supportsLinkedHover: false,
      // Push API exposes push/pushMany/clear/getValue/getData; updates
      // the focal value and feeds the auto-trend buffer.
      supportsPush: true,
      // BigNumber renders cleanly through react-dom/server (plain DOM +
      // SVG sparkline, no canvas) — but `renderChart` in
      // `semiotic/server` routes everything through Stream Frame
      // serverChartConfigs.ts, which doesn't apply to a non-frame HOC.
      // Set false + tag "hoc-ssr-only" so the registry accurately
      // describes the runtime: SSR-safe in a normal React tree, but
      // not exposed via the MCP `renderChart` path.
      supportsSSR: false,
      colorModel: "threshold",
      layoutMode: "synthetic",
      specialFeatures: [
        "threshold-zones", "value-only", "comparison", "target",
        "staleness", "intl-format", "chart-slot", "trend-slot",
        "hoc-ssr-only",
      ],
    },
  },
}
