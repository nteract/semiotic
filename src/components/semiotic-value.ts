/**
 * semiotic/value — Focal-value visualizations.
 *
 * Charts that render *one* number rather than a coordinate space. At
 * row counts of 1–3, a chart is usually the wrong abstraction — the
 * scale-aware suggestion engine routes those datasets here.
 *
 * v1 ships `BigNumber` as a plain React component. The component is
 * deliberately chart-dependency-free: consumers compose their own
 * Semiotic chart (or any ReactNode) into the `trendSlot` (wide /
 * rectangular charts, e.g. LineChart / AreaChart in sparkline mode) or
 * `chartSlot` (square charts, e.g. DonutChart / PieChart / Scatterplot
 * / Treemap). The slot context exposes the resolved threshold colour
 * + sentiment + push buffer so embedded charts can theme-link.
 *
 * @example
 * ```tsx
 * import { BigNumber } from "semiotic/value"
 * import { LineChart }  from "semiotic/xy"
 * import { DonutChart } from "semiotic/ordinal"
 *
 * <BigNumber
 *   value={1284900}
 *   label="Q3 Revenue"
 *   format="currency"
 *   comparison={{ value: 980000, label: "vs Q2" }}
 *   target={{ value: 1500000, label: "Q3 plan" }}
 *   thresholds={[
 *     { at: -Infinity, level: "danger"  },
 *     { at: 1_000_000, level: "warning" },
 *     { at: 1_300_000, level: "success" },
 *   ]}
 *   trendSlot={(ctx) => (
 *     <LineChart
 *       data={recentMonths.map((y, x) => ({ x, y }))}
 *       xAccessor="x" yAccessor="y"
 *       mode="sparkline"
 *       width={260} height={32}
 *       color={ctx.color}
 *     />
 *   )}
 *   chartSlot={(ctx) => (
 *     <DonutChart
 *       data={revenueByRegion}
 *       categoryAccessor="region" valueAccessor="revenue"
 *       width={120} height={120}
 *     />
 *   )}
 * />
 * ```
 */

export {
  BigNumber,
  default as BigNumberDefault
} from "./charts/value/BigNumber"
export type {
  BigNumberProps,
  BigNumberHandle,
  BigNumberMode,
  BigNumberLevel,
  BigNumberDirection,
  BigNumberSentiment,
  BigNumberFormat,
  BigNumberThreshold,
  BigNumberComparison,
  BigNumberTarget,
  BigNumberPushInput,
  BigNumberSlot,
  BigNumberSlotContext
} from "./charts/value/types"

// Formatting + threshold helpers — exposed so consumers writing custom
// slots can reuse the same logic the component uses internally.
export {
  buildFormatter,
  formatSignedDelta,
  formatDeltaPercent,
  formatDuration
} from "./charts/value/formatting"

export {
  resolveThreshold,
  colorForLevel
} from "./charts/value/thresholdSparkline"
