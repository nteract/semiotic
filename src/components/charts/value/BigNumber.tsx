"use client"
/**
 * BigNumber — the focal-value HOC behind `semiotic/value`.
 *
 * A plain React component (no Stream Frame underneath). This ships as a forward-looking React
 * component that already honours the contracts a `SingleValueFrame`
 * would inherit (format cascade, threshold zones via semantic theme
 * roles, comparison anchoring, sentence-form ARIA, push API + staleness).
 */
import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"

import { SafeRender } from "../shared/withChartWrapper"
import { useReducedMotion } from "../../stream/useMediaPreferences"
import {
  buildFormatter,
  decorate,
  formatDeltaPercent,
  formatSignedDelta
} from "./formatting"
import { colorForLevel, resolveThreshold } from "./thresholdSparkline"
import type {
  BigNumberHandle,
  BigNumberLevel,
  BigNumberMode,
  BigNumberProps,
  BigNumberPushInput,
  BigNumberSlot,
  BigNumberSlotContext
} from "./types"

// ── Mode-specific defaults ───────────────────────────────────────────

interface ModeDefaults {
  width: number | string | undefined
  height: number | string | undefined
  align: "start" | "center" | "end" | "inherit"
  labelSize: number
  captionSize: number
  valueSize: number
  deltaSize: number
  padding: { top: number; right: number; bottom: number; left: number }
  background: string
  border: boolean
  showHeader: boolean
  showDelta: boolean
  /** Whether to render `trendSlot` content if provided. Inline / thumbnail
   *  modes suppress the wide chart area. */
  showTrend: boolean
  /** Whether to render `chartSlot` content if provided. Inline / thumbnail
   *  modes suppress the square chart area. */
  showChart: boolean
  /** Default reserved square size (pixels) for `chartSlot`. Sized for
   *  sparkline scale by default — roughly two line-heights — so the
   *  decoration sits in the corner without competing with the focal value.
   *  Override per-card via the `chartSize` prop. */
  chartSize: number
}

const MODE_DEFAULTS: Record<BigNumberMode, ModeDefaults> = {
  tile: {
    width: 280,
    // Sized to comfortably hold header + value + delta + a 32–40 px trend
    // chart while leaving padding-bottom equal to padding-top. Bumped from
    // 160 → 184 after observing trend charts sit flush with the bottom
    // border at the previous default.
    height: 184,
    align: "start",
    labelSize: 13,
    captionSize: 11,
    valueSize: 40,
    deltaSize: 13,
    padding: { top: 14, right: 16, bottom: 14, left: 16 },
    background: "var(--semiotic-surface, transparent)",
    border: true,
    showHeader: true,
    showDelta: true,
    showTrend: true,
    showChart: true,
    chartSize: 44
  },
  presentation: {
    width: 540,
    height: 320,
    align: "center",
    labelSize: 18,
    captionSize: 14,
    valueSize: 96,
    deltaSize: 18,
    padding: { top: 32, right: 32, bottom: 32, left: 32 },
    background: "var(--semiotic-surface, transparent)",
    border: true,
    showHeader: true,
    showDelta: true,
    showTrend: true,
    showChart: true,
    chartSize: 80
  },
  inline: {
    width: undefined,
    height: undefined,
    align: "inherit",
    labelSize: 0,
    captionSize: 0,
    valueSize: 0, // inherits ambient font-size
    deltaSize: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    background: "transparent",
    border: false,
    showHeader: false,
    showDelta: true,
    showTrend: false,
    showChart: false,
    chartSize: 0
  },
  thumbnail: {
    width: 96,
    height: 56,
    align: "center",
    labelSize: 0,
    captionSize: 0,
    valueSize: 22,
    deltaSize: 0,
    padding: { top: 4, right: 6, bottom: 4, left: 6 },
    background: "transparent",
    border: false,
    showHeader: false,
    showDelta: false,
    showTrend: false,
    showChart: false,
    chartSize: 0
  }
}

// ── Slot resolver ────────────────────────────────────────────────────

function renderSlot(
  slot: BigNumberSlot | undefined,
  ctx: BigNumberSlotContext,
  fallback: React.ReactNode
): React.ReactNode {
  if (slot === undefined) return fallback
  if (typeof slot === "function") return slot(ctx)
  return slot
}

// ── Value tween ──────────────────────────────────────────────────────

function useTweenedValue(
  target: number,
  animate: BigNumberProps["animate"],
  reducedMotion: boolean
): number {
  const [displayed, setDisplayed] = useState<number>(target)
  const rafRef = useRef<number | null>(null)
  const fromRef = useRef<number>(target)
  const startRef = useRef<number>(0)
  // Track the latest target without re-creating the RAF callback on every
  // setDisplayed re-render — the tween reads tweenTargetRef.current to
  // know where to land. A new target re-arms the animation via the
  // outer useEffect.
  const tweenTargetRef = useRef<number>(target)

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplayed(target)
      return
    }
    if (!animate || reducedMotion) {
      setDisplayed(target)
      return
    }
    const duration =
      typeof animate === "object" && animate.duration ? animate.duration : 300
    const easing: "linear" | "ease-out" =
      typeof animate === "object" && animate.easing === "linear"
        ? "linear"
        : "ease-out"

    fromRef.current = displayed
    tweenTargetRef.current = target
    startRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now()

    const ease =
      easing === "linear"
        ? (t: number) => t
        : (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = ease(t)
      const next =
        fromRef.current + (tweenTargetRef.current - fromRef.current) * eased
      setDisplayed(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        setDisplayed(tweenTargetRef.current)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // displayed intentionally excluded — including it would restart the
    // tween every animation frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, animate, reducedMotion])

  return displayed
}

// ── Staleness tracker ────────────────────────────────────────────────

function useStaleness(
  lastUpdate: number | null,
  thresholdMs: number | undefined
): boolean {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    if (!thresholdMs || lastUpdate == null) {
      setStale(false)
      return
    }
    const check = () => {
      const idle = Date.now() - lastUpdate
      setStale(idle >= thresholdMs)
    }
    check()
    const interval = setInterval(
      check,
      Math.max(250, Math.floor(thresholdMs / 4))
    )
    return () => clearInterval(interval)
  }, [lastUpdate, thresholdMs])
  return stale
}

// ── Sentiment ────────────────────────────────────────────────────────

function resolveSentiment(
  delta: number | null,
  direction: BigNumberProps["direction"],
  override: BigNumberProps["sentiment"]
): "positive" | "negative" | "neutral" {
  if (override && override !== "auto") return override
  if (delta == null || delta === 0 || !Number.isFinite(delta)) return "neutral"
  const dir = direction ?? "higher-is-better"
  if (dir === "neutral") return "neutral"
  const higherBetter = dir === "higher-is-better"
  const positive = higherBetter ? delta > 0 : delta < 0
  return positive ? "positive" : "negative"
}

function sentimentColor(
  sentiment: "positive" | "negative" | "neutral"
): string {
  if (sentiment === "positive") return "var(--semiotic-success, currentColor)"
  if (sentiment === "negative") return "var(--semiotic-danger, currentColor)"
  return "var(--semiotic-text-secondary, currentColor)"
}

function sentimentArrow(
  sentiment: "positive" | "negative" | "neutral"
): string {
  if (sentiment === "positive") return "▲"
  if (sentiment === "negative") return "▼"
  return "■"
}

// ── ARIA sentence ────────────────────────────────────────────────────

function buildAriaSentence(args: {
  label?: string
  formattedValue: string
  unit?: string
  comparisonLabel?: string
  deltaFormatted?: string | null
  deltaPercent?: string | null
  sentiment: "positive" | "negative" | "neutral"
  targetLabel?: string
  targetPercent?: string | null
  stale: boolean
  staleLabel?: string
}): string {
  const parts: string[] = []
  if (args.label) parts.push(`${args.label}:`)
  parts.push(
    args.unit ? `${args.formattedValue} ${args.unit}` : args.formattedValue
  )
  if (args.deltaFormatted) {
    const dirWord =
      args.sentiment === "positive"
        ? "up"
        : args.sentiment === "negative"
          ? "down"
          : "change"
    const pct = args.deltaPercent ? ` (${args.deltaPercent})` : ""
    const comp = args.comparisonLabel ? ` from ${args.comparisonLabel}` : ""
    parts.push(`${dirWord} ${args.deltaFormatted}${pct}${comp}`)
  }
  if (args.targetPercent && args.targetLabel) {
    parts.push(`${args.targetPercent} of ${args.targetLabel}`)
  }
  if (args.stale) parts.push(args.staleLabel ?? "stale")
  return parts.join(", ")
}

// ── Component ────────────────────────────────────────────────────────

const BigNumberInner = (
  props: BigNumberProps,
  ref: React.ForwardedRef<BigNumberHandle>
) => {
  const {
    value: propValue,
    label,
    caption,
    format,
    locale,
    currency,
    precision,
    prefix,
    suffix,
    unit,
    comparison,
    target,
    delta: explicitDelta,
    deltaFormat,
    showDeltaPercent,
    direction,
    sentiment: sentimentProp,
    thresholds,
    windowSize = 60,
    mode = "tile",
    align: alignProp,
    width: widthProp,
    height: heightProp,
    padding: paddingProp,
    emphasis,
    color: colorProp,
    background: backgroundProp,
    borderColor,
    borderRadius,
    className,
    style: styleProp,
    animate,
    stalenessThreshold,
    staleLabel,
    headerSlot,
    valueSlot,
    deltaSlot,
    trendSlot,
    chartSlot,
    chartSize: chartSizeProp,
    footerSlot,
    onClick,
    onObservation,
    chartId,
    description,
    summary,
    loading,
    loadingContent,
    emptyContent
  } = props

  // Fall back to "tile" defaults when `mode` is anything other than one of
  // BigNumber's four known modes — e.g. when a generic `ChartMode`
  // ("primary"/"context"/"sparkline") bleeds in from BaseChartProps via a
  // suggestion engine that spreads runnable props.
  const defaults = MODE_DEFAULTS[mode] ?? MODE_DEFAULTS.tile
  const align = alignProp ?? defaults.align
  const width = widthProp ?? defaults.width
  const height = heightProp ?? defaults.height
  const reducedMotion = useReducedMotion()

  // ── Push API + buffer ────────────────────────────────────────────
  //
  // Streaming state lives in refs so the imperative handle stays
  // reference-stable across re-renders (consumers commonly cache the
  // handle in a parent ref and expect getValue()/getData() to see
  // post-push state without re-grabbing the handle). React state
  // alongside drives the visible re-render.
  const [pushBuffer, setPushBuffer] = useState<BigNumberPushInput[]>([])
  const [pushedValue, setPushedValue] = useState<number | null>(null)
  const [pushedComparison, setPushedComparison] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  const pushBufferRef = useRef<BigNumberPushInput[]>([])
  const pushedValueRef = useRef<number | null>(null)
  const propValueRef = useRef<number | null | undefined>(propValue)
  useEffect(() => {
    propValueRef.current = propValue
  }, [propValue])
  const windowSizeRef = useRef<number>(windowSize)
  useEffect(() => {
    windowSizeRef.current = windowSize
  }, [windowSize])

  // Normalize a single push input into a BigNumberPushInput with a
  // numeric timestamp. Pulled out so `ingestBatch` can avoid a per-item
  // setState fan-out on `pushMany([...])`.
  const normalisePushInput = useCallback(
    (input: number | BigNumberPushInput): BigNumberPushInput => {
      const raw: BigNumberPushInput =
        typeof input === "number"
          ? { value: input, time: Date.now() }
          : { time: Date.now(), ...input }
      // Normalize `time`: number (ms) or Date — both must produce
      // identical staleness behavior. Without this, a Date silently
      // fell back to wall-clock `Date.now()`.
      const t =
        typeof raw.time === "number"
          ? raw.time
          : raw.time instanceof Date
            ? raw.time.getTime()
            : Date.now()
      return { ...raw, time: t }
    },
    []
  )

  /** Append one or many inputs through a single state-update pass. */
  const ingestBatch = useCallback(
    (inputs: ReadonlyArray<number | BigNumberPushInput>) => {
      if (inputs.length === 0) return
      const win = windowSizeRef.current
      const normalised = inputs.map(normalisePushInput)
      const prev = pushBufferRef.current
      // Concat + drop from the head until we're within window. Skipping
      // intermediate slices means a pushMany of N keeps O(N) work, not
      // O(N²).
      let next = prev.concat(normalised)
      if (next.length > win) next = next.slice(next.length - win)
      pushBufferRef.current = next
      const last = normalised[normalised.length - 1]
      pushedValueRef.current = last.value
      setPushBuffer(next)
      setPushedValue(last.value)
      // Latest comparison wins.
      for (let i = normalised.length - 1; i >= 0; i--) {
        const c = normalised[i].comparison
        if (c != null) {
          setPushedComparison(c)
          break
        }
      }
      setLastUpdate(last.time as number)
    },
    [normalisePushInput]
  )

  const ingest = useCallback(
    (input: number | BigNumberPushInput) => ingestBatch([input]),
    [ingestBatch]
  )

  useImperativeHandle(
    ref,
    () => ({
      push: (input) => ingest(input),
      // Single state-update pass for the whole batch.
      pushMany: (inputs) => ingestBatch(inputs),
      clear: () => {
        pushBufferRef.current = []
        pushedValueRef.current = null
        setPushBuffer([])
        setPushedValue(null)
        setPushedComparison(null)
        setLastUpdate(null)
      },
      getValue: () =>
        pushedValueRef.current ??
        (Number.isFinite(propValueRef.current)
          ? (propValueRef.current as number)
          : null),
      // Defensive copy — consumers receive a frozen snapshot of the
      // ring buffer, not the live ref, so they can't mutate component
      // state by writing back into the array.
      getData: () => pushBufferRef.current.slice()
    }),
    [ingest, ingestBatch]
  )

  // Effective value — pushed value wins once any push has landed.
  const effectiveValue = pushedValue ?? propValue
  // Treat anything non-finite as empty so Infinity / -Infinity / NaN
  // don't silently render as `0` via the downstream displayedValue
  // fallback.
  const isEmpty =
    effectiveValue == null ||
    typeof effectiveValue !== "number" ||
    !Number.isFinite(effectiveValue)

  // ── Formatting context ───────────────────────────────────────────
  const formatter = useMemo(
    () =>
      buildFormatter(format ?? "number", {
        locale,
        currency,
        precision
      }),
    [format, locale, currency, precision]
  )

  const deltaFormatter = useMemo(
    () =>
      buildFormatter(deltaFormat ?? format ?? "number", {
        locale,
        currency,
        precision: deltaFormat == null && format == null ? 0 : precision
      }),
    [deltaFormat, format, locale, currency, precision]
  )

  // ── Animation ────────────────────────────────────────────────────
  const animateOpt = animate ?? false
  const introEnabled =
    typeof animateOpt === "object" && animateOpt.intro === false
      ? false
      : Boolean(animateOpt)
  const initialValueRef = useRef<number>(
    introEnabled ? 0 : Number.isFinite(propValue) ? (propValue as number) : 0
  )
  const tweened = useTweenedValue(
    Number.isFinite(effectiveValue)
      ? (effectiveValue as number)
      : initialValueRef.current,
    animateOpt,
    reducedMotion
  )
  const displayedValue = animateOpt
    ? tweened
    : Number.isFinite(effectiveValue)
      ? (effectiveValue as number)
      : 0

  // ── Threshold + colour ───────────────────────────────────────────
  const matchedThreshold = useMemo(
    () =>
      resolveThreshold(
        Number.isFinite(effectiveValue) ? (effectiveValue as number) : NaN,
        thresholds
      ),
    [effectiveValue, thresholds]
  )
  const level: BigNumberLevel = matchedThreshold
    ? matchedThreshold.level
    : "neutral"
  const resolvedColor =
    colorProp ?? colorForLevel(level, matchedThreshold?.color)

  // ── Delta ────────────────────────────────────────────────────────
  const comparisonValue = pushedComparison ?? comparison?.value ?? null
  const computedDelta =
    explicitDelta != null
      ? explicitDelta
      : comparisonValue != null && Number.isFinite(effectiveValue)
        ? (effectiveValue as number) - comparisonValue
        : null
  const sentiment = resolveSentiment(
    computedDelta,
    comparison?.direction ?? target?.direction ?? direction,
    sentimentProp
  )
  const deltaFormatted =
    computedDelta != null && Number.isFinite(computedDelta)
      ? formatSignedDelta(computedDelta, deltaFormatter)
      : null
  const deltaPercent =
    comparisonValue != null &&
    Number.isFinite(effectiveValue) &&
    (showDeltaPercent ?? true)
      ? formatDeltaPercent(comparisonValue, effectiveValue as number, locale)
      : null

  // ── Target ───────────────────────────────────────────────────────
  const targetPercent = useMemo(() => {
    if (!target || !Number.isFinite(effectiveValue) || !target.value)
      return null
    const ratio = (effectiveValue as number) / target.value
    const nf = new Intl.NumberFormat(locale ?? "en-US", {
      style: "percent",
      maximumFractionDigits: 0
    })
    return nf.format(ratio)
  }, [target, effectiveValue, locale])
  const targetFormatter = useMemo(
    () =>
      buildFormatter(target?.format ?? format ?? "number", {
        locale,
        currency,
        precision
      }),
    [target?.format, format, locale, currency, precision]
  )
  const comparisonFormatter = useMemo(
    () =>
      buildFormatter(comparison?.format ?? format ?? "number", {
        locale,
        currency,
        precision
      }),
    [comparison?.format, format, locale, currency, precision]
  )

  // ── Staleness ────────────────────────────────────────────────────
  const stale = useStaleness(lastUpdate, stalenessThreshold)

  // (No value-update observation event is emitted — the ChartObservation
  // union currently only covers hover/click/brush/selection. Click is wired
  // below via handleClick; a future `"value-update"` variant on the union
  // would let live-KPI consumers subscribe without a slot override.)

  // ── Pre-rendered strings ─────────────────────────────────────────
  const formattedValue = Number.isFinite(displayedValue)
    ? decorate(formatter(displayedValue), prefix, suffix)
    : ""

  // ── Slot context (for callable slots) ────────────────────────────
  const slotCtx: BigNumberSlotContext = {
    value: isEmpty ? null : (effectiveValue as number),
    formattedValue,
    level,
    color: resolvedColor,
    delta: computedDelta,
    deltaFormatted,
    deltaPercent,
    sentiment,
    isStale: stale,
    pushBuffer
  }

  // ── ARIA sentence ────────────────────────────────────────────────
  const ariaSentence =
    description ??
    buildAriaSentence({
      label,
      formattedValue: Number.isFinite(effectiveValue)
        ? decorate(formatter(effectiveValue as number), prefix, suffix)
        : "",
      unit,
      comparisonLabel: comparison?.label,
      deltaFormatted,
      deltaPercent,
      sentiment,
      targetLabel: target?.label,
      targetPercent,
      stale,
      staleLabel
    })

  // ── Layout primitives ────────────────────────────────────────────
  const padding =
    typeof paddingProp === "number"
      ? {
          top: paddingProp,
          right: paddingProp,
          bottom: paddingProp,
          left: paddingProp
        }
      : { ...defaults.padding, ...(paddingProp ?? {}) }

  const flexAlign =
    align === "end"
      ? "flex-end"
      : align === "center"
        ? "center"
        : align === "start"
          ? "flex-start"
          : "inherit"

  const containerStyle: React.CSSProperties = {
    // `relative` so a top-right-anchored `chartSlot` can absolute-position
    // against the card.
    position: "relative",
    boxSizing: "border-box",
    width,
    height,
    padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
    background: backgroundProp ?? defaults.background,
    border: defaults.border
      ? `1px solid ${borderColor ?? "var(--semiotic-border, #e2e2e2)"}`
      : undefined,
    borderRadius:
      typeof borderRadius === "number"
        ? `${borderRadius}px`
        : (borderRadius ?? "var(--semiotic-border-radius, 8px)"),
    display: mode === "inline" ? "inline-flex" : "flex",
    flexDirection: "column",
    alignItems:
      flexAlign === "inherit"
        ? undefined
        : (flexAlign as React.CSSProperties["alignItems"]),
    textAlign: align as React.CSSProperties["textAlign"],
    fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
    color: "var(--semiotic-text, #111)",
    opacity: stale ? 0.55 : 1,
    transition: "opacity 240ms ease-out",
    gridColumn: emphasis === "primary" ? "span 2" : undefined,
    cursor: onClick ? "pointer" : undefined,
    ...styleProp
  }

  // ── Click handler ────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const datum = {
        value: isEmpty ? Number.NaN : (effectiveValue as number),
        level,
        delta: computedDelta
      }
      if (onClick) onClick(datum, { x, y })
      if (onObservation) {
        onObservation({
          type: "click",
          datum,
          x,
          y,
          chartType: "BigNumber",
          chartId,
          timestamp: Date.now()
        })
      }
    },
    [
      onClick,
      onObservation,
      chartId,
      isEmpty,
      effectiveValue,
      level,
      computedDelta
    ]
  )

  // ── Element tag — `span` in inline mode so the card can sit inside a
  // `<p>` without HTML-validity hydration errors. `<span>` accepts
  // `display: inline-flex` styling without layout difference. All
  // potentially-nested elements that follow (value, delta, footer
  // wrappers) reuse the same tag.
  const Block = mode === "inline" ? "span" : "div"

  // ── Semantic class composition ───────────────────────────────────
  // BEM-ish names so consumers can target individual parts (or whole-card
  // states like sentiment / level / stale) from a stylesheet without
  // relying on inline-style overrides.
  const rootClassName = [
    "semiotic-bignumber",
    `semiotic-bignumber--mode-${mode}`,
    `semiotic-bignumber--level-${level}`,
    `semiotic-bignumber--sentiment-${sentiment}`,
    stale ? "semiotic-bignumber--stale" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")
  const sentimentSuffix =
    sentiment === "positive"
      ? "up"
      : sentiment === "negative"
        ? "down"
        : "flat"

  // ── Loading + empty ──────────────────────────────────────────────
  if (loading) {
    const w = typeof width === "number" ? width : 280
    const h = typeof height === "number" ? height : 160
    return (
      <Block
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`${rootClassName} semiotic-bignumber--loading`}
        style={{ ...containerStyle, opacity: 1 }}
      >
        {loadingContent ?? (
          <DefaultLoadingShimmer width={w} height={h} mode={mode} />
        )}
      </Block>
    )
  }

  if (isEmpty) {
    if (emptyContent === false) return null
    return (
      <Block
        role="status"
        aria-label={label ? `${label}: no value` : "no value"}
        className={`${rootClassName} semiotic-bignumber--empty`}
        style={{
          ...containerStyle,
          color: "var(--semiotic-text-secondary, #999)",
          fontSize: 13,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {emptyContent ?? "—"}
      </Block>
    )
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeRender
      componentName="BigNumber"
      width={typeof width === "number" ? width : 280}
      height={typeof height === "number" ? height : 160}
    >
      <Block
        role="group"
        aria-label={ariaSentence}
        data-chart="BigNumber"
        data-mode={mode}
        data-level={level}
        data-stale={stale ? "true" : undefined}
        data-sentiment={sentiment}
        className={rootClassName}
        style={containerStyle}
        onClick={onClick || onObservation ? handleClick : undefined}
      >
        {/* Header (label + caption) */}
        {defaults.showHeader && (label || caption || headerSlot) ? (
          <div
            className="semiotic-bignumber__header"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              marginBottom: 6,
              // Reserve room on the right so a top-right chartSlot doesn't
              // overdraw the label / caption. Width hint = default chart
              // size + small gutter.
              paddingRight:
                defaults.showChart && chartSlot != null
                  ? (chartSizeProp ?? defaults.chartSize) + 8
                  : 0
            }}
          >
            {renderSlot(
              headerSlot,
              slotCtx,
              <>
                {label ? (
                  <span
                    className="semiotic-bignumber__label"
                    style={{
                      fontSize: defaults.labelSize,
                      color: "var(--semiotic-text-secondary, #6b7280)",
                      fontWeight: 500,
                      letterSpacing: 0.2
                    }}
                  >
                    {label}
                  </span>
                ) : null}
                {caption ? (
                  <span
                    className="semiotic-bignumber__caption"
                    style={{
                      fontSize: defaults.captionSize,
                      color: "var(--semiotic-text-secondary, #9ca3af)"
                    }}
                  >
                    {caption}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {/* Value */}
        {renderSlot(
          valueSlot,
          slotCtx,
          <Block
            className={`semiotic-bignumber__value semiotic-bignumber__value--${level}`}
            style={{
              display: mode === "inline" ? "inline-flex" : "flex",
              alignItems: "baseline",
              gap: 6,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              color: resolvedColor,
              fontSize: defaults.valueSize || undefined,
              lineHeight: 1.05
            }}
          >
            <span className="semiotic-bignumber__value-text">
              {formattedValue}
            </span>
            {unit ? (
              <span
                className="semiotic-bignumber__unit"
                style={{
                  fontSize: defaults.valueSize
                    ? Math.max(11, Math.round(defaults.valueSize * 0.32))
                    : "0.75em",
                  color: "var(--semiotic-text-secondary, #9ca3af)",
                  fontWeight: 500
                }}
              >
                {unit}
              </span>
            ) : null}
          </Block>
        )}

        {/* Delta + comparison + target */}
        {defaults.showDelta &&
        (deltaFormatted || target || comparison) ? (
          <Block
            className={`semiotic-bignumber__delta semiotic-bignumber__delta--${sentimentSuffix}`}
            style={{
              display: mode === "inline" ? "inline-flex" : "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "baseline",
              marginTop: mode === "inline" ? 0 : 6,
              fontSize: defaults.deltaSize || undefined,
              color: "var(--semiotic-text-secondary, #6b7280)"
            }}
          >
            {renderSlot(
              deltaSlot,
              slotCtx,
              <>
                {deltaFormatted ? (
                  <span
                    className={`semiotic-bignumber__delta-row semiotic-bignumber__delta-row--${sentimentSuffix}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: sentimentColor(sentiment),
                      fontWeight: 600
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`semiotic-bignumber__arrow semiotic-bignumber__arrow--${sentimentSuffix}`}
                    >
                      {sentimentArrow(sentiment)}
                    </span>
                    <span className="semiotic-bignumber__delta-amount">
                      {deltaFormatted}
                    </span>
                    {deltaPercent ? (
                      <span
                        className="semiotic-bignumber__delta-percent"
                        style={{ fontWeight: 500 }}
                      >
                        ({deltaPercent})
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {comparison?.label ? (
                  <span className="semiotic-bignumber__comparison-label">
                    {comparison.label}
                  </span>
                ) : null}
                {target ? (
                  <span
                    className="semiotic-bignumber__target"
                    style={{
                      display: "inline-flex",
                      alignItems: "baseline",
                      gap: 4
                    }}
                  >
                    {deltaFormatted || comparison?.label ? (
                      <span
                        aria-hidden="true"
                        className="semiotic-bignumber__separator"
                      >
                        ·
                      </span>
                    ) : null}
                    <span
                      className="semiotic-bignumber__target-percent"
                      style={{
                        fontWeight: 500,
                        color: "var(--semiotic-text, #111)"
                      }}
                    >
                      {targetPercent}
                    </span>
                    <span className="semiotic-bignumber__target-value">
                      of {targetFormatter(target.value)}
                      {target.label ? ` ${target.label}` : ""}
                    </span>
                  </span>
                ) : null}
              </>
            )}
          </Block>
        ) : null}

        {/* Square chartSlot — anchored top-right of the card. Sparkline
            scale by default (line-height-ish); override with `chartSize`.
            Absolute-positioned so it overlays a corner without
            displacing the text content; the header above reserves
            right-padding to keep the label from running under it. */}
        {defaults.showChart && chartSlot != null ? (
          <div
            className="semiotic-bignumber__chart"
            style={{
              position: "absolute",
              top: padding.top,
              right: padding.right,
              width: chartSizeProp ?? defaults.chartSize,
              height: chartSizeProp ?? defaults.chartSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}
          >
            <div style={{ pointerEvents: "auto", lineHeight: 0 }}>
              {renderSlot(chartSlot, slotCtx, null)}
            </div>
          </div>
        ) : null}

        {/* Bottom region: absolute-positioned trend + footer.
            Anchored at `padding.bottom` from the card's bottom border so
            the visible gap matches the top / left / right padding
            independently of how tall the user's chart actually renders.
            The text content above stacks naturally; the bottom region
            overlays without consuming flex-flow space. Cards must be
            tall enough that the text content doesn't overlap this
            region — the default tile height is tuned accordingly. */}
        {defaults.showTrend && trendSlot != null ? (
          <div
            className="semiotic-bignumber__trend"
            style={{
              position: "absolute",
              left: padding.left,
              right: padding.right,
              bottom: padding.bottom + (footerSlot != null ? 28 : 0)
            }}
          >
            {renderSlot(trendSlot, slotCtx, null)}
          </div>
        ) : null}

        {footerSlot != null ? (
          <Block
            className="semiotic-bignumber__footer"
            style={{
              position: "absolute",
              left: padding.left,
              right: padding.right,
              bottom: padding.bottom,
              fontSize: defaults.deltaSize || undefined,
              color: "var(--semiotic-text-secondary, #9ca3af)"
            }}
          >
            {renderSlot(footerSlot, slotCtx, null)}
          </Block>
        ) : null}

        {/* Sr-only summary supplement */}
        {summary ? (
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0
            }}
          >
            {summary}
          </span>
        ) : null}

        {/* Hidden accessible representation — sr-only sentence, used by
            screen readers in addition to the aria-label on the group. */}
        <span
          aria-hidden="true"
          // Comparison value is in the visible delta + sentence; we don't
          // re-render the underlying comparison number redundantly.
          style={{ display: "none" }}
        >
          {comparisonValue != null
            ? comparisonFormatter(comparisonValue)
            : null}
        </span>
      </Block>
    </SafeRender>
  )
}

/**
 * Focal-value display — when one number is the answer, show the number.
 * Plain React (no Stream Frame); ships under `semiotic/value` as the
 * forward-looking POC for a future `SingleValueFrame`.
 *
 * Pair the focal `value` with `format`, threshold zones (mapped to
 * semantic theme roles), a comparison or target, an inline trend
 * sparkline, and a push API for live KPIs. The mode prop picks the
 * chrome envelope (tile / presentation / inline / thumbnail).
 *
 * @example
 * ```tsx
 * // Dashboard tile with thresholds, comparison, target, and sparkline.
 * <BigNumber
 *   value={1284900}
 *   label="Q3 Revenue"
 *   format="currency"
 *   precision={0}
 *   comparison={{ value: 980000, label: "vs Q2" }}
 *   target={{ value: 1500000, label: "Q3 plan" }}
 *   trend={[820000, 870000, 920000, 1010000, 1120000, 1284900]}
 *   thresholds={[
 *     { at: -Infinity, level: "danger" },
 *     { at: 1000000,   level: "warning" },
 *     { at: 1300000,   level: "success" },
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Live-KPI via push API + staleness.
 * const ref = useRef<BigNumberHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(
 *     () => ref.current?.push({ value: nextSample(), time: Date.now() }),
 *     700
 *   )
 *   return () => clearInterval(id)
 * }, [])
 *
 * <BigNumber
 *   ref={ref}
 *   value={0}
 *   label="Live Requests"
 *   suffix=" req/s"
 *   stalenessThreshold={2500}
 *   animate={{ duration: 220 }}
 * />
 * ```
 */
const ForwardedBigNumber = forwardRef(BigNumberInner) as (
  props: BigNumberProps & { ref?: React.ForwardedRef<BigNumberHandle> }
) => React.ReactElement | null

;(ForwardedBigNumber as { displayName?: string }).displayName = "BigNumber"

export const BigNumber = ForwardedBigNumber
export default BigNumber

// ── Internal: loading shimmer ────────────────────────────────────────

function DefaultLoadingShimmer(props: {
  width: number
  height: number
  mode: BigNumberMode
}) {
  const labelW = Math.floor(props.width * 0.45)
  const valueW = Math.floor(props.width * 0.6)
  const bar = (w: number, h: number) => (
    <div
      style={{
        width: w,
        height: h,
        background: "var(--semiotic-border, #e0e0e0)",
        borderRadius: 4,
        opacity: 0.55
      }}
    />
  )
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        justifyContent: "center",
        width: "100%",
        height: "100%"
      }}
    >
      {props.mode !== "thumbnail" && props.mode !== "inline"
        ? bar(labelW, 10)
        : null}
      {bar(valueW, props.mode === "presentation" ? 48 : 28)}
      {props.mode === "tile" || props.mode === "presentation"
        ? bar(Math.floor(props.width * 0.35), 8)
        : null}
    </div>
  )
}
