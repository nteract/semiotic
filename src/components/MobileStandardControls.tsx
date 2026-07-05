"use client"
import * as React from "react"
import type {
  MobileStandardControlKind,
  MobileStandardControlsMode,
} from "./charts/shared/types"

export type { MobileStandardControlKind, MobileStandardControlsMode }
export type MobileStandardControlRequest = MobileStandardControlsMode

export interface MobileStandardControlLegendItem {
  id: string
  label?: React.ReactNode
  color?: string
  active?: boolean
  disabled?: boolean
}

export interface MobileStandardBrushControls {
  label?: React.ReactNode
  value?: [number, number]
  domain?: [number, number]
  step?: number
  disabled?: boolean
  formatValue?: (value: number) => React.ReactNode
  onChange?: (value: [number, number]) => void
  onClear?: () => void
}

export interface MobileStandardZoomControls {
  label?: React.ReactNode
  disabled?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
}

export interface MobileStandardLegendControls {
  label?: React.ReactNode
  items?: MobileStandardControlLegendItem[]
  disabled?: boolean
  onToggle?: (id: string, active: boolean) => void
  onShowAll?: () => void
  onHideAll?: () => void
}

export interface MobileStandardControlsProps {
  controls?: MobileStandardControlRequest
  targetSize?: number
  compact?: boolean
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
  brush?: MobileStandardBrushControls
  zoom?: MobileStandardZoomControls
  legend?: MobileStandardLegendControls
}

export interface UseMobileRangeControlsOptions {
  domain: [number, number]
  initialValue?: [number, number]
  step?: number
  minSpan?: number
  label?: React.ReactNode
  formatValue?: (value: number) => React.ReactNode
  onChange?: (value: [number, number]) => void
}

export interface UseMobileRangeControlsResult {
  value: [number, number]
  setValue: (value: [number, number]) => void
  xExtent: [number, number]
  brush: MobileStandardBrushControls
  zoom: MobileStandardZoomControls
}

export function clampMobileRange(
  value: [number, number],
  domain: [number, number],
  minSpan = 0
): [number, number] {
  const lo = Math.min(domain[0], domain[1])
  const hi = Math.max(domain[0], domain[1])
  const start = Math.max(lo, Math.min(hi, value[0]))
  const end = Math.max(lo, Math.min(hi, value[1]))
  const ordered: [number, number] = start <= end ? [start, end] : [end, start]
  if (ordered[1] - ordered[0] >= minSpan) return ordered
  const center = (ordered[0] + ordered[1]) / 2
  const half = minSpan / 2
  return [
    Math.max(lo, Math.min(hi - minSpan, center - half)),
    Math.min(hi, Math.max(lo + minSpan, center + half)),
  ]
}

export function zoomMobileRange(
  value: [number, number],
  domain: [number, number],
  direction: "in" | "out",
  step = 1,
  minSpan = step
): [number, number] {
  const delta = direction === "in" ? step : -step
  return clampMobileRange([value[0] + delta, value[1] - delta], domain, minSpan)
}

export function useMobileRangeControls(
  options: UseMobileRangeControlsOptions
): UseMobileRangeControlsResult {
  const {
    domain,
    initialValue = domain,
    step = 1,
    minSpan = step,
    label,
    formatValue,
    onChange,
  } = options
  const [valueState, setValueState] = React.useState<[number, number]>(() =>
    clampMobileRange(initialValue, domain, minSpan)
  )
  const value = clampMobileRange(valueState, domain, minSpan)
  const setValue = React.useCallback(
    (next: [number, number]) => {
      const clamped = clampMobileRange(next, domain, minSpan)
      setValueState(clamped)
      onChange?.(clamped)
    },
    [domain, minSpan, onChange]
  )
  const brush = React.useMemo<MobileStandardBrushControls>(
    () => ({
      label,
      domain,
      value,
      step,
      formatValue,
      onChange: setValue,
      onClear: () => setValue(domain),
    }),
    [domain, formatValue, label, setValue, step, value]
  )
  const zoom = React.useMemo<MobileStandardZoomControls>(
    () => ({
      onZoomIn: () => setValue(zoomMobileRange(value, domain, "in", step, minSpan)),
      onZoomOut: () => setValue(zoomMobileRange(value, domain, "out", step, minSpan)),
      onReset: () => setValue(domain),
    }),
    [domain, minSpan, setValue, step, value]
  )
  return { value, setValue, xExtent: value, brush, zoom }
}

function normalizeControls(
  controls: MobileStandardControlRequest | undefined,
  props: Pick<MobileStandardControlsProps, "brush" | "zoom" | "legend">
): MobileStandardControlKind[] {
  if (controls === false) return []
  if (controls === true || controls === "all") return ["brush", "zoom", "legend"]
  if (Array.isArray(controls)) return controls
  if (controls) return [controls]

  const inferred: MobileStandardControlKind[] = []
  if (props.brush) inferred.push("brush")
  if (props.zoom) inferred.push("zoom")
  if (props.legend) inferred.push("legend")
  return inferred
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  border: "1px solid var(--semiotic-border, #d8dee4)",
  borderRadius: 12,
  background: "var(--semiotic-surface, var(--semiotic-bg, rgba(255,255,255,0.92)))",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--semiotic-text-secondary, #57606a)",
}

function buttonStyle(targetSize: number, active?: boolean): React.CSSProperties {
  return {
    minWidth: targetSize,
    minHeight: targetSize,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid var(--semiotic-border, #d8dee4)",
    background: active
      ? "var(--semiotic-primary, #0969da)"
      : "var(--semiotic-bg, #fff)",
    color: active
      ? "var(--semiotic-on-primary, #fff)"
      : "var(--semiotic-text, #24292f)",
    fontSize: 13,
    fontWeight: 650,
    touchAction: "manipulation",
  }
}

function isCallable(fn: unknown): fn is () => void {
  return typeof fn === "function"
}

function BrushControls({ brush, targetSize }: { brush?: MobileStandardBrushControls; targetSize: number }) {
  const value = brush?.value
  const domain = brush?.domain
  const hasRange = !!value && !!domain
  const disabled = brush?.disabled === true
  const format = brush?.formatValue ?? ((v: number) => v)
  const canChange = !!brush?.onChange && hasRange && !disabled
  const min = domain?.[0] ?? 0
  const max = domain?.[1] ?? 1
  const lower = value?.[0] ?? min
  const upper = value?.[1] ?? max
  const step = brush?.step ?? ((max - min) / 100 || 1)

  return (
    <section style={sectionStyle} aria-label="Brush controls">
      <div style={labelStyle}>{brush?.label ?? "Filter range"}</div>
      {hasRange ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
            <span>Start: {format(lower)}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={lower}
              disabled={!canChange}
              style={{ minHeight: targetSize }}
              onChange={(event) => {
                const next = Number(event.currentTarget.value)
                brush?.onChange?.([Math.min(next, upper), upper])
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
            <span>End: {format(upper)}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={upper}
              disabled={!canChange}
              style={{ minHeight: targetSize }}
              onChange={(event) => {
                const next = Number(event.currentTarget.value)
                brush?.onChange?.([lower, Math.max(next, lower)])
              }}
            />
          </label>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #57606a)" }}>
          Provide a brush domain and value to expose range inputs beside the drag gesture.
        </div>
      )}
      <button
        type="button"
        disabled={disabled || !isCallable(brush?.onClear)}
        onClick={brush?.onClear}
        style={buttonStyle(targetSize)}
      >
        Clear range
      </button>
    </section>
  )
}

function ZoomControls({ zoom, targetSize }: { zoom?: MobileStandardZoomControls; targetSize: number }) {
  const disabled = zoom?.disabled === true
  return (
    <section style={sectionStyle} aria-label="Zoom controls">
      <div style={labelStyle}>{zoom?.label ?? "Zoom"}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" aria-label="Zoom out" disabled={disabled || !isCallable(zoom?.onZoomOut)} onClick={zoom?.onZoomOut} style={buttonStyle(targetSize)}>
          -
        </button>
        <button type="button" aria-label="Reset zoom" disabled={disabled || !isCallable(zoom?.onReset)} onClick={zoom?.onReset} style={buttonStyle(targetSize)}>
          Reset
        </button>
        <button type="button" aria-label="Zoom in" disabled={disabled || !isCallable(zoom?.onZoomIn)} onClick={zoom?.onZoomIn} style={buttonStyle(targetSize)}>
          +
        </button>
      </div>
    </section>
  )
}

function LegendControls({ legend, targetSize }: { legend?: MobileStandardLegendControls; targetSize: number }) {
  const disabled = legend?.disabled === true
  const items = legend?.items ?? []
  return (
    <section style={sectionStyle} aria-label="Legend controls">
      <div style={labelStyle}>{legend?.label ?? "Series"}</div>
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {items.map((item) => {
            const active = item.active !== false
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || item.disabled || !legend?.onToggle}
                onClick={() => legend?.onToggle?.(item.id, !active)}
                style={buttonStyle(targetSize, active)}
                aria-pressed={active}
              >
                {item.color && (
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      marginRight: 6,
                      borderRadius: 999,
                      background: item.color,
                    }}
                  />
                )}
                {item.label ?? item.id}
              </button>
            )
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={disabled || !isCallable(legend?.onShowAll)} onClick={legend?.onShowAll} style={buttonStyle(targetSize)}>
          Show all
        </button>
        <button type="button" disabled={disabled || !isCallable(legend?.onHideAll)} onClick={legend?.onHideAll} style={buttonStyle(targetSize)}>
          Hide all
        </button>
      </div>
    </section>
  )
}

export function MobileStandardControls({
  controls,
  targetSize = 44,
  compact = false,
  className,
  style,
  ariaLabel = "Mobile chart controls",
  brush,
  zoom,
  legend,
}: MobileStandardControlsProps) {
  const requested = normalizeControls(controls, { brush, zoom, legend })
  if (requested.length === 0) return null

  return (
    <div
      className={className}
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
        ...style,
      }}
    >
      {requested.includes("brush") && <BrushControls brush={brush} targetSize={targetSize} />}
      {requested.includes("zoom") && <ZoomControls zoom={zoom} targetSize={targetSize} />}
      {requested.includes("legend") && <LegendControls legend={legend} targetSize={targetSize} />}
    </div>
  )
}

export default MobileStandardControls
