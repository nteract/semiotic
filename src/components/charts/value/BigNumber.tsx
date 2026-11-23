"use client"
/**
 * BigNumber — the focal-value HOC behind `semiotic/value`.
 *
 * A plain React component (no Stream Frame underneath). This ships as a forward-looking React
 * component that already honours the contracts a `SingleValueFrame`
 * would inherit (format cascade, threshold zones via semantic theme
 * roles, comparison anchoring, sentence-form ARIA, push API + staleness).
 */
import { BIG_NUMBER_SIZES } from "../shared/chartSizeDefaultsValue"
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

import { useReducedMotion } from "../../stream/useMediaPreferences"
import { useWasHydratingFromSSR } from "../../stream/useHydration"
import {
  decorate,
  formatSignedDelta,
  isFormattedZero
} from "./formatting"
import { useTargetPresentation, useValueFormatter } from "./targetPresentation"
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
import { withSizedChartErrorBoundary } from "../shared/withChartErrorBoundary"

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
  expanded: boolean
  showDelta: boolean
  /** Default reserved square size (pixels) for `chartSlot`. Sized for
   *  sparkline scale by default — roughly two line-heights — so the
   *  decoration sits in the corner without competing with the focal value.
   *  Override per-card via the `chartSize` prop. */
  chartSize: number
}

function cardPadding(vertical: number, horizontal = vertical) {
  return { top: vertical, right: horizontal, bottom: vertical, left: horizontal }
}

const MODE_DEFAULTS: Record<BigNumberMode, ModeDefaults> = {
  tile: {
    ...BIG_NUMBER_SIZES.tile,
    align: "start",
    labelSize: 13,
    captionSize: 11,
    valueSize: 40,
    deltaSize: 13,
    padding: /* @__PURE__ */ cardPadding(14, 16),
    background: "var(--semiotic-surface, transparent)",
    expanded: true,
    showDelta: true,
    chartSize: 44
  },
  presentation: {
    ...BIG_NUMBER_SIZES.presentation,
    align: "center",
    labelSize: 18,
    captionSize: 14,
    valueSize: 96,
    deltaSize: 18,
    padding: /* @__PURE__ */ cardPadding(32),
    background: "var(--semiotic-surface, transparent)",
    expanded: true,
    showDelta: true,
    chartSize: 80
  },
  inline: {
    ...BIG_NUMBER_SIZES.inline,
    align: "inherit",
    labelSize: 0,
    captionSize: 0,
    valueSize: 0, // inherits ambient font-size
    deltaSize: 0,
    padding: /* @__PURE__ */ cardPadding(0),
    background: "transparent",
    expanded: false,
    showDelta: true,
    chartSize: 0
  },
  thumbnail: {
    ...BIG_NUMBER_SIZES.thumbnail,
    align: "center",
    labelSize: 0,
    captionSize: 0,
    valueSize: 22,
    deltaSize: 0,
    padding: /* @__PURE__ */ cardPadding(4, 6),
    background: "transparent",
    expanded: false,
    showDelta: false,
    chartSize: 0
  }
}

interface ValueSnapshot {
  rows: BigNumberPushInput[]
  value: number | null
  comparison: number | null
  time: number | null
}

function emptySnapshot(): ValueSnapshot {
  return { rows: [], value: null, comparison: null, time: null }
}

function normalisePushInput(input: number | BigNumberPushInput): BigNumberPushInput {
  if (typeof input === "number") return { value: input, time: Date.now() }
  const { time } = input
  return { ...input, time: typeof time === "number" ? time : time instanceof Date ? time.getTime() : Date.now() }
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
  reducedMotion: boolean,
  initialValue = target
): number {
  const [displayed, setDisplayed] = useState<number>(() => initialValue)
  const displayedRef = useRef<number>(initialValue)
  const animationEnabled = Boolean(animate)
  const configuredDuration =
    typeof animate === "object" ? animate.duration : undefined
  const duration =
    typeof configuredDuration === "number" && Number.isFinite(configuredDuration)
      ? Math.max(0, configuredDuration)
      : 300
  const easing: "linear" | "ease-out" =
    typeof animate === "object" && animate.easing === "linear"
      ? "linear"
      : "ease-out"
  useEffect(() => {
    const updateDisplayed = (next: number) => {
      displayedRef.current = next
      setDisplayed(next)
    }

    if (!Number.isFinite(target) || !animationEnabled || reducedMotion || duration === 0) {
      updateDisplayed(target)
      return
    }
    const from = displayedRef.current
    const start = typeof performance !== "undefined" ? performance.now() : Date.now()
    let request: number
    const ease =
      easing === "linear"
        ? (t: number) => t
        : (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = ease(t)
      updateDisplayed(t < 1 ? from + (target - from) * eased : target)
      if (t < 1) request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
    // The current display value lives in a ref so a tween frame can update
    // React state without restarting this effect.
  }, [animationEnabled, duration, easing, reducedMotion, target])

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

const sentimentDisplay = {
  positive: { color: "var(--semiotic-success, currentColor)", arrow: "▲", suffix: "up" },
  negative: { color: "var(--semiotic-danger, currentColor)", arrow: "▼", suffix: "down" },
  neutral: { color: "var(--semiotic-text-secondary, currentColor)", arrow: "■", suffix: "flat" }
}

// ── ARIA sentence ────────────────────────────────────────────────────

function buildAriaSentence(args: {
  label?: string
  formattedValue: string
  unit?: string
  comparisonLabel?: string
  delta?: number | null
  deltaFormatted?: string | null
  deltaPercent?: string | null
  targetText?: string | null
  thresholdLabel?: string
  stale: boolean
  staleLabel?: string
}): string {
  const parts: string[] = []
  if (args.label) parts.push(`${args.label}:`)
  parts.push(
    args.unit ? `${args.formattedValue} ${args.unit}` : args.formattedValue
  )
  if (args.deltaFormatted) {
    // Direction word follows the SIGN of the delta, not the sentiment.
    // Sentiment is a styling concern ("good" / "bad" colour) that flips
    // when `direction: "lower-is-better"` — but for a screen reader the
    // factual phrasing must remain "up" for +5 and "down" for −5
    // regardless. Avoids the previous "up −5" reading on lower-is-better
    // metrics.
    const d = args.delta
    const dirWord =
      d != null && Number.isFinite(d) && d !== 0
        ? d > 0
          ? "up"
          : "down"
        : "change"
    const pct = args.deltaPercent ? ` (${args.deltaPercent})` : ""
    const comp = args.comparisonLabel ? ` from ${args.comparisonLabel}` : ""
    parts.push(`${dirWord} ${args.deltaFormatted}${pct}${comp}`)
  }
  if (args.targetText) parts.push(args.targetText)
  if (args.thresholdLabel) parts.push(args.thresholdLabel)
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
  const summaryId = React.useId()
  const reducedMotion = useReducedMotion()
  const wasHydratingFromSSR = useWasHydratingFromSSR()

  // ── Push API + buffer ────────────────────────────────────────────
  //
  // Streaming state lives in refs so the imperative handle stays
  // reference-stable across re-renders (consumers commonly cache the
  // handle in a parent ref and expect getValue()/getData() to see
  // post-push state without re-grabbing the handle). React state
  // alongside drives the visible re-render.
  const [snapshot, setSnapshot] = useState(emptySnapshot)
  const latest = useRef(snapshot)
  const publish = useCallback((next: ValueSnapshot) => {
    latest.current = next
    setSnapshot(next)
  }, [])
  const fallbackValue = Number.isFinite(propValue) ? propValue as number : null
  const pushOptions = useRef({ fallbackValue, windowSize })
  useEffect(() => {
    pushOptions.current = { fallbackValue, windowSize }
  }, [fallbackValue, windowSize])

  const ingestBatch = useCallback(
    (inputs: ReadonlyArray<number | BigNumberPushInput>) => {
      if (inputs.length === 0) return
      const win = pushOptions.current.windowSize
      const normalised = inputs.map(normalisePushInput)
      const prev = latest.current.rows
      // Concat + drop from the head until we're within window. Skipping
      // intermediate slices means a pushMany of N keeps O(N) work, not
      // O(N²).
      let next = prev.concat(normalised)
      if (next.length > win) next = next.slice(next.length - win)
      const last = normalised[normalised.length - 1]
      publish({
        rows: next, value: last.value, time: last.time as number,
        comparison: normalised.reduce((previous, row) => row.comparison ?? previous, latest.current.comparison)
      })
    },
    [publish]
  )

  useImperativeHandle(
    ref,
    () => ({
      push: (input) => ingestBatch([input]),
      // Single state-update pass for the whole batch.
      pushMany: ingestBatch,
      clear: () => publish(emptySnapshot()),
      getValue: () => latest.current.value ?? pushOptions.current.fallbackValue,
      // Defensive copy — consumers receive a snapshot rather than the live
      // ref, so they can't mutate component state by writing into the array.
      getData: () => latest.current.rows.slice()
    }),
    [ingestBatch, publish]
  )

  // Effective value — pushed value wins once any push has landed.
  const effectiveValue = snapshot.value ?? propValue
  // Treat anything non-finite as empty so Infinity / -Infinity / NaN
  // don't silently render as `0` via the downstream displayedValue
  // fallback.
  const isEmpty = !Number.isFinite(effectiveValue)
  const numericValue = isEmpty ? NaN : effectiveValue as number

  // ── Formatting context ───────────────────────────────────────────
  const formatter = useValueFormatter(format, locale, currency, precision)
  const deltaFormatter = useValueFormatter(deltaFormat ?? format, locale, currency,
    deltaFormat == null && format == null ? 0 : precision)

  // ── Animation ────────────────────────────────────────────────────
  const animateOpt = animate ?? false
  const introEnabled = Boolean(animateOpt) && (typeof animateOpt !== "object" || animateOpt.intro !== false)
  const tweenTarget = isEmpty ? 0 : numericValue
  // Preserve the final value in SSR and on the first hydration render so the
  // client markup matches the server. Fresh CSR mounts can visibly animate
  // into the focal value when intro is enabled.
  const tweened = useTweenedValue(
    tweenTarget,
    animateOpt,
    reducedMotion,
    introEnabled && !reducedMotion && !wasHydratingFromSSR ? 0 : tweenTarget
  )
  const displayedValue = animateOpt ? tweened : tweenTarget

  // ── Threshold + colour ───────────────────────────────────────────
  const matchedThreshold = useMemo(
    () => resolveThreshold(numericValue, thresholds),
    [numericValue, thresholds]
  )
  const level: BigNumberLevel = matchedThreshold
    ? matchedThreshold.level
    : "neutral"
  const resolvedColor =
    colorProp ?? colorForLevel(level, matchedThreshold?.color)

  // ── Delta ────────────────────────────────────────────────────────
  const comparisonValue = snapshot.comparison ?? comparison?.value ?? null
  const computedDelta =
    explicitDelta != null
      ? explicitDelta
      : comparisonValue != null && !isEmpty
        ? numericValue - comparisonValue
        : null
  // A delta that formats as zero reads, and is colored, as no change; the
  // raw delta still reaches slots and callbacks.
  const shownDelta =
    computedDelta != null && Number.isFinite(computedDelta) &&
      isFormattedZero(computedDelta, deltaFormatter)
      ? 0
      : computedDelta
  const sentiment = resolveSentiment(
    shownDelta,
    comparison?.direction ?? target?.direction ?? direction,
    sentimentProp
  )
  const deltaFormatted =
    computedDelta != null && Number.isFinite(computedDelta)
      ? formatSignedDelta(computedDelta, deltaFormatter)
      : null
  const deltaPercentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale ?? "en-US", {
        style: "percent",
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
        signDisplay: "exceptZero",
      }),
    [locale]
  )
  const deltaPercent =
    comparisonValue != null &&
    !isEmpty &&
    (showDeltaPercent ?? true) &&
    comparisonValue !== 0
      ? deltaPercentFormatter.format(
          (numericValue - comparisonValue) / Math.abs(comparisonValue)
        )
      : null

  // ── Target ───────────────────────────────────────────────────────
  const targetPresentation = useTargetPresentation({
    target,
    value: effectiveValue,
    format,
    locale,
    currency,
    precision
  })
  const targetPercent = targetPresentation?.percent ?? null
  const targetText = targetPresentation?.text ?? null

  // ── Staleness ────────────────────────────────────────────────────
  const stale = useStaleness(snapshot.time, stalenessThreshold)

  // ── Pre-rendered strings ─────────────────────────────────────────
  const formatReading = (value: number | null | undefined) => Number.isFinite(value)
    ? decorate(formatter(value as number), prefix, suffix)
    : ""
  const formattedValue = formatReading(displayedValue)

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
    pushBuffer: snapshot.rows
  }

  // ── ARIA sentence ────────────────────────────────────────────────
  const ariaSentence =
    description ??
    buildAriaSentence({
      label,
      formattedValue: formatReading(effectiveValue),
      unit,
      comparisonLabel: comparison?.label,
      delta: shownDelta,
      deltaFormatted,
      deltaPercent,
      targetText,
      thresholdLabel: matchedThreshold?.label,
      stale,
      staleLabel
    })

  // ── Layout primitives ────────────────────────────────────────────
  const padding =
    typeof paddingProp === "number"
      ? cardPadding(paddingProp)
      : { ...defaults.padding, ...(paddingProp ?? {}) }

  const flexAlign = align === "start" || align === "end"
    ? `flex-${align}` as const
    : align === "center" ? "center" : undefined

  const display = mode === "inline" ? "inline-flex" : "flex"
  const containerStyle: React.CSSProperties = {
    // `relative` so a top-right-anchored `chartSlot` can absolute-position
    // against the card.
    position: "relative",
    boxSizing: "border-box",
    width,
    height,
    padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
    background: backgroundProp ?? defaults.background,
    border: defaults.expanded
      ? `1px solid ${borderColor ?? "var(--semiotic-border, #e2e2e2)"}`
      : undefined,
    borderRadius:
      typeof borderRadius === "number"
        ? `${borderRadius}px`
        : (borderRadius ?? "var(--semiotic-border-radius, 8px)"),
    display,
    flexDirection: "column",
    alignItems: flexAlign,
    textAlign: align as React.CSSProperties["textAlign"],
    fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
    color: "var(--semiotic-text, #111)",
    opacity: stale ? 0.55 : 1,
    transition: "opacity 240ms ease-out",
    gridColumn: emphasis === "primary" ? "span 2" : undefined,
    cursor: onClick || onObservation ? "pointer" : undefined,
    ...styleProp
  }

  // ── Click handler ────────────────────────────────────────────────
  function activate(x: number, y: number) {
    const datum = {
      value: numericValue,
      level,
      delta: computedDelta
    }
    onClick?.(datum, { x, y })
    onObservation?.({
        type: "click",
        datum,
        x,
        y,
        chartType: "BigNumber",
        chartId,
        timestamp: Date.now()
    })
  }

  const interactive = Boolean(onClick || onObservation)
  function handleActivationKey(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.defaultPrevented) return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    const trigger = event.key === "Enter" ? "keydown" : "keyup"
    if (event.type === trigger && !event.repeat) {
      const rect = event.currentTarget.getBoundingClientRect()
      activate(rect.width / 2, rect.height / 2)
    }
  }

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
  const { color: deltaColor, arrow, suffix: sentimentSuffix } = sentimentDisplay[sentiment] ?? sentimentDisplay.neutral

  // ── Loading + empty ──────────────────────────────────────────────
  if (loading) {
    const w = typeof width === "number" ? width : 280
    return (
      <Block
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`${rootClassName} semiotic-bignumber--loading`}
        style={{ ...containerStyle, opacity: 1 }}
      >
        {loadingContent ?? (
          <DefaultLoadingShimmer width={w} mode={mode} />
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
          // #666 fallback = LIGHT_THEME.textSecondary; #999 fails WCAG AA.
          color: "var(--semiotic-text-secondary, #666)",
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
    <Block
        role={interactive ? "button" : "group"}
        tabIndex={interactive ? 0 : undefined}
        aria-label={ariaSentence}
        aria-describedby={summary ? summaryId : undefined}
        data-chart="BigNumber"
        data-mode={mode}
        data-level={level}
        data-stale={stale ? "true" : undefined}
        data-sentiment={sentiment}
        className={rootClassName}
        style={containerStyle}
        onKeyDown={interactive ? handleActivationKey : undefined}
        onKeyUp={interactive ? handleActivationKey : undefined}
        onClick={interactive ? event => {
          const rect = event.currentTarget.getBoundingClientRect()
          activate(event.clientX - rect.left, event.clientY - rect.top)
        } : undefined}
      >
        {/* Header (label + caption) */}
        {defaults.expanded && (label || caption || headerSlot) ? (
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
                chartSlot != null
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
              display,
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
        (deltaFormatted || targetPresentation || comparison) ? (
          <Block
            className={`semiotic-bignumber__delta semiotic-bignumber__delta--${sentimentSuffix}`}
            style={{
              display,
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
                      color: deltaColor,
                      fontWeight: 600
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`semiotic-bignumber__arrow semiotic-bignumber__arrow--${sentimentSuffix}`}
                    >
                      {arrow}
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
                {targetPresentation ? (
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
                      of {targetPresentation.formattedValue}
                      {targetPresentation.label ? ` ${targetPresentation.label}` : ""}
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
        {defaults.expanded && chartSlot != null ? (
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
        {defaults.expanded && trendSlot != null ? (
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

        {summary ? (
          <span id={summaryId} hidden>{summary}</span>
        ) : null}
      </Block>
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
 *   trendSlot={(ctx) => (
 *     <LineChart
 *       data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map(
 *         (y, x) => ({ x, y })
 *       )}
 *       xAccessor="x"
 *       yAccessor="y"
 *       mode="sparkline"
 *       width={240}
 *       height={32}
 *       color={ctx.color}
 *     />
 *   )}
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
const ForwardedBigNumber = /* @__PURE__ */ withSizedChartErrorBoundary(/* @__PURE__ */ forwardRef(BigNumberInner), "BigNumber", (props) => {
  const defaults = MODE_DEFAULTS[props.mode ?? "tile"] ?? MODE_DEFAULTS.tile
  return { width: props.width ?? defaults.width, height: props.height ?? defaults.height }
}) as (
  props: BigNumberProps & { ref?: React.ForwardedRef<BigNumberHandle> }
) => React.ReactElement | null

export const BigNumber = ForwardedBigNumber
export default BigNumber

// ── Internal: loading shimmer ────────────────────────────────────────

function DefaultLoadingShimmer(props: {
  width: number
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
