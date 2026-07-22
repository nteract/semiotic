"use client"

import * as React from "react"
import type { Style } from "../../stream/types"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsBodyStyleContext,
  PhysicsHoverData,
  PhysicsSemanticItem
} from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import type {
  CrucibleBodyDatum,
  CrucibleLayout,
  CruciblePhase,
  CrucibleProductState,
  CrucibleComponentState,
  CrucibleProjectionRow,
  CrucibleProjectionSpec,
  CrucibleRunState
} from "./crucibleTypes"
import {
  componentDescription,
  displayNumber,
  productDescription
} from "./crucibleBodyRenderers"

const INK = "var(--semiotic-text, #26323a)"
const MUTED_INK = "var(--semiotic-text-secondary, #6c7377)"
const ACCENT = "var(--semiotic-accent, #b8792d)"
const NEGATIVE = "var(--semiotic-negative, #9f3d35)"
const POSITIVE = "var(--semiotic-positive, #356b63)"

/** Default tooltip preserves the distinction between source and product. */
export function defaultCrucibleTooltipContent<TDatum extends Datum>(
  hover: PhysicsHoverData,
  state: CrucibleRunState<TDatum>
): React.ReactNode {
  const wrapped = hover.data as CrucibleBodyDatum<TDatum> | undefined
  if (!wrapped?.__crucible) return null
  const item =
    wrapped.kind === "component"
      ? state.components[wrapped.semanticId]
      : state.products[wrapped.semanticId]
  if (!item) return null
  const isProduct = wrapped.kind === "product"
  return (
    <div
      className="semiotic-tooltip semiotic-crucible-tooltip"
      style={{
        background: "var(--semiotic-tooltip-bg, rgba(38, 50, 58, 0.96))",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
        color: "var(--semiotic-tooltip-text, #fffaf0)",
        maxWidth: 290,
        padding: "9px 12px"
      }}
    >
      <strong>{item.label}</strong>
      <div
        style={{
          opacity: 0.78,
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase"
        }}
      >
        {isProduct
          ? `Product · ${(item as CrucibleProductState).status}`
          : `Source · ${(item as CrucibleComponentState).status}`}
      </div>
      <div style={{ marginTop: 4 }}>
        {isProduct
          ? productDescription(item as CrucibleProductState)
          : componentDescription(item as CrucibleComponentState)}
      </div>
    </div>
  )
}

function chamberPath(layout: CrucibleLayout): string {
  const { x, y, width, height } = layout.chamber
  const shoulder = Math.min(width * 0.14, 48)
  const footY = y + height
  return [
    `M ${x} ${y}`,
    `L ${x + shoulder} ${footY - height * 0.16}`,
    `Q ${x + width / 2} ${footY + height * 0.1} ${x + width - shoulder} ${footY - height * 0.16}`,
    `L ${x + width} ${y}`
  ].join(" ")
}

/** Static vessel, program rail, and named exception/product outlets. */
export function CrucibleChrome<TDatum extends Datum>({
  layout,
  phases,
  state,
  compact = false
}: {
  layout: CrucibleLayout
  phases: readonly CruciblePhase[]
  state: CrucibleRunState<TDatum>
  compact?: boolean
}) {
  const totalDuration = Math.max(
    1,
    phases.reduce((sum, phase) => sum + Math.max(0, phase.duration), 0)
  )
  return (
    <svg
      aria-hidden="true"
      data-testid="crucible-chrome"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ inset: 0, pointerEvents: "none", position: "absolute" }}
    >
      <defs>
        <linearGradient id="semiotic-crucible-heat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.03" />
          <stop offset="0.66" stopColor={ACCENT} stopOpacity="0.1" />
          <stop offset="1" stopColor={NEGATIVE} stopOpacity="0.18" />
        </linearGradient>
        <pattern
          id="semiotic-crucible-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(20)"
        >
          <line
            x1="0"
            x2="0"
            y1="0"
            y2="7"
            stroke={INK}
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        x={layout.chamber.x}
        y={layout.chamber.y}
        width={layout.chamber.width}
        height={layout.chamber.height}
        rx={2}
        fill="url(#semiotic-crucible-heat)"
        stroke={INK}
        strokeOpacity="0.52"
        strokeWidth={compact ? 1 : 2.2}
      />
      <path
        d={chamberPath(layout)}
        fill="url(#semiotic-crucible-hatch)"
        stroke="none"
      />
      <line
        x1={layout.mouth.x}
        x2={layout.mouth.x + layout.mouth.width}
        y1={layout.mouth.y}
        y2={layout.mouth.y}
        stroke={INK}
        strokeLinecap="round"
        strokeOpacity="0.72"
        strokeWidth={compact ? 2 : 5}
      />

      {!compact ? (
        <g data-testid="crucible-phase-rail">
          {phases.map((phase, index) => {
            const before = phases
              .slice(0, index)
              .reduce((sum, item) => sum + Math.max(0, item.duration), 0)
            const x =
              layout.phaseRail.x +
              (before / totalDuration) * layout.phaseRail.width
            const width =
              (Math.max(0, phase.duration) / totalDuration) *
              layout.phaseRail.width
            const active = phase.id === state.phaseId
            const complete = state.phaseIndex > index || state.complete
            return (
              <g key={phase.id}>
                <rect
                  x={x}
                  y={layout.phaseRail.y}
                  width={Math.max(1, width - 2)}
                  height={layout.phaseRail.height}
                  rx={2}
                  fill={
                    active ? (phase.color ?? ACCENT) : complete ? POSITIVE : INK
                  }
                  fillOpacity={active ? 0.68 : complete ? 0.28 : 0.09}
                />
                {width >= 46 ? (
                  <text
                    x={x + width / 2}
                    y={layout.phaseRail.y + layout.phaseRail.height + 13}
                    fill={active ? INK : MUTED_INK}
                    fontFamily="system-ui, sans-serif"
                    fontSize={8.5}
                    fontWeight={active ? 800 : 650}
                    letterSpacing="0.04em"
                    textAnchor="middle"
                  >
                    {(phase.label ?? phase.id).toUpperCase()}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      ) : null}

      {layout.outlets.map((outlet) => (
        <g key={outlet.id}>
          <rect
            x={outlet.x}
            y={outlet.y}
            width={outlet.width}
            height={outlet.height}
            rx={3}
            fill={
              outlet.color ?? (outlet.side === "left" ? NEGATIVE : POSITIVE)
            }
            fillOpacity="0.1"
            stroke={
              outlet.color ?? (outlet.side === "left" ? NEGATIVE : POSITIVE)
            }
            strokeDasharray="3 3"
            strokeOpacity="0.62"
          />
          {!compact ? (
            <text
              x={outlet.x + outlet.width / 2}
              y={outlet.y + Math.min(13, outlet.height / 2 + 3)}
              fill={MUTED_INK}
              fontFamily="system-ui, sans-serif"
              fontSize={8}
              fontWeight={750}
              letterSpacing="0.05em"
              textAnchor="middle"
            >
              {(outlet.label ?? outlet.id).toUpperCase()}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  )
}

function projectionValue(row: CrucibleProjectionRow, measure: string): number {
  if (measure === "count") return row.count
  if (measure === "amount") return row.amount
  return Number(row.metrics[measure] ?? 0)
}

export function crucibleProjectionSemanticItems(
  rows: readonly CrucibleProjectionRow[],
  layout: CrucibleLayout,
  projection: CrucibleProjectionSpec,
  amountLabel?: string
): PhysicsSemanticItem[] {
  if (!rows.length) return []
  const measure = projection.measure ?? "count"
  const laneWidth = layout.projection.width / Math.max(1, rows.length)
  return rows.map((row, index) => {
    const value = projectionValue(row, measure)
    const valueLabel =
      measure === "amount" && amountLabel
        ? `${displayNumber(value)} ${amountLabel}`
        : `${displayNumber(value)} ${measure}`
    return {
      id: `crucible-projection-${row.key}`,
      label: `${row.label}: ${valueLabel}`,
      description: `${row.count} source component${row.count === 1 ? "" : "s"}; ${displayNumber(row.amount)} amount.`,
      datum: row,
      group: "settled composition",
      x: layout.projection.x + (index + 0.5) * laneWidth,
      y: layout.projection.y + layout.projection.height / 2,
      shape: "rect",
      width: Math.max(12, laneWidth * 0.62),
      height: Math.max(8, layout.projection.height - 8)
    }
  })
}

/** Compact settled histogram; the ledger values, not body positions, set bars. */
export function CrucibleProjectionOverlay({
  rows,
  layout,
  projection,
  amountLabel
}: {
  rows: readonly CrucibleProjectionRow[]
  layout: CrucibleLayout
  projection: CrucibleProjectionSpec
  amountLabel?: string
}) {
  if (!rows.length) return null
  const measure = projection.measure ?? "count"
  const values = rows.map((row) => Math.max(0, projectionValue(row, measure)))
  const maximum = Math.max(1, ...values)
  const laneWidth = layout.projection.width / Math.max(1, rows.length)
  const labelRoom = layout.projection.height > 48 ? 21 : 4
  const barHeight = Math.max(5, layout.projection.height - labelRoom - 5)
  return (
    <svg
      aria-hidden="true"
      data-testid="crucible-projection-overlay"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ inset: 0, pointerEvents: "none", position: "absolute" }}
    >
      {rows.map((row, index) => {
        const value = values[index]
        const height = Math.max(
          value > 0 ? 2 : 0,
          (value / maximum) * barHeight
        )
        const x = layout.projection.x + index * laneWidth + laneWidth * 0.18
        const y = layout.projection.y + barHeight - height
        return (
          <g key={row.key}>
            <rect
              x={x}
              y={y}
              width={Math.max(3, laneWidth * 0.64)}
              height={height}
              rx={2}
              fill={
                row.status === "failed" || row.status === "ejected"
                  ? NEGATIVE
                  : row.status === "complete"
                    ? ACCENT
                    : POSITIVE
              }
              fillOpacity="0.68"
            />
            {labelRoom > 4 && laneWidth >= 34 ? (
              <>
                <text
                  x={x + laneWidth * 0.32}
                  y={layout.projection.y + barHeight + 10}
                  fill={MUTED_INK}
                  fontFamily="system-ui, sans-serif"
                  fontSize={7.5}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {row.label.length > 13
                    ? `${row.label.slice(0, 12)}…`
                    : row.label}
                </text>
                <text
                  x={x + laneWidth * 0.32}
                  y={layout.projection.y + barHeight + 19}
                  fill={INK}
                  fontFamily="system-ui, sans-serif"
                  fontSize={8}
                  fontWeight={850}
                  textAnchor="middle"
                >
                  {displayNumber(value)}
                  {measure === "amount" && amountLabel ? ` ${amountLabel}` : ""}
                </text>
              </>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export interface CrucibleReplayControlsProps {
  controls: {
    playPause: boolean
    reset: boolean
    stepPhase: boolean
    timeline: boolean
    speed: boolean
  }
  duration: number
  elapsed: number
  phaseLabel: string
  playing: boolean
  complete: boolean
  playbackRate: number
  disabled?: boolean
  onPlayPause: () => void
  onReset: () => void
  onStepPhase: () => void
  onPlaybackRateChange: (rate: number) => void
}

/** Optional in-chart replay controls; external controls can use the ref API. */
export function CrucibleReplayControls({
  controls,
  duration,
  elapsed,
  phaseLabel,
  playing,
  complete,
  playbackRate,
  disabled,
  onPlayPause,
  onReset,
  onStepPhase,
  onPlaybackRateChange
}: CrucibleReplayControlsProps) {
  const progress =
    duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1
  return (
    <div
      aria-label="Crucible replay controls"
      className="semiotic-crucible-controls"
      style={{
        alignItems: "center",
        color: INK,
        display: "flex",
        flexWrap: "wrap",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        gap: 6,
        marginBottom: 7
      }}
    >
      {controls.playPause ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onPlayPause}
          aria-pressed={playing}
        >
          {playing ? "Pause" : complete ? "Replay" : "Play"}
        </button>
      ) : null}
      {controls.stepPhase ? (
        <button type="button" disabled={disabled} onClick={onStepPhase}>
          Next phase
        </button>
      ) : null}
      {controls.reset ? (
        <button type="button" disabled={disabled} onClick={onReset}>
          Reset
        </button>
      ) : null}
      {controls.timeline ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: "1 1 150px",
            gap: 7,
            minWidth: 130
          }}
        >
          <span style={{ fontWeight: 750, whiteSpace: "nowrap" }}>
            {phaseLabel}
          </span>
          <span
            aria-hidden="true"
            style={{
              background: "rgba(38,50,58,0.14)",
              borderRadius: 2,
              flex: 1,
              height: 4,
              overflow: "hidden"
            }}
          >
            <span
              style={{
                background: ACCENT,
                display: "block",
                height: "100%",
                transform: `scaleX(${progress})`,
                transformOrigin: "left center"
              }}
            />
          </span>
          <span
            style={{ color: MUTED_INK, fontVariantNumeric: "tabular-nums" }}
          >
            {elapsed.toFixed(1)}s
          </span>
        </div>
      ) : null}
      {controls.speed ? (
        <label style={{ alignItems: "center", display: "flex", gap: 4 }}>
          Speed
          <select
            disabled={disabled}
            value={playbackRate}
            onChange={(event) =>
              onPlaybackRateChange(Number(event.currentTarget.value))
            }
          >
            <option value={0.25}>¼×</option>
            <option value={0.5}>½×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      ) : null}
    </div>
  )
}

/** Merge default semantic styling with a caller's frame bodyStyle. */
export function resolveCrucibleBodyStyle(
  defaultFill: string,
  body: PhysicsBodyState,
  context: PhysicsBodyStyleContext,
  bodyStyle:
    | Style
    | ((body: PhysicsBodyState, context: PhysicsBodyStyleContext) => Style)
    | undefined
): Style {
  const userStyle =
    typeof bodyStyle === "function" ? bodyStyle(body, context) : bodyStyle
  const wrapped = body.datum as CrucibleBodyDatum | undefined
  return {
    fill: defaultFill,
    stroke:
      wrapped?.kind === "product" ? "var(--semiotic-background, #fffaf0)" : INK,
    strokeWidth: wrapped?.kind === "product" ? 1.8 : 1.1,
    opacity: 0.96,
    ...userStyle
  }
}
