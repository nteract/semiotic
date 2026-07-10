/**
 * Process-physics chrome kit — stage bays, capacity badges, absorb basins,
 * feature sockets, and flow spines for ProcessFlow / custom process layouts.
 *
 * Theme via CSS vars (with solid fallbacks so chrome never goes blank):
 *   --semiotic-process-floor, --semiotic-process-lane, --semiotic-process-border
 *   --semiotic-process-text, --semiotic-process-muted
 *   --semiotic-success / warning / danger / info for semantic stage roles
 */
import * as React from "react"

export interface ProcessChromeStage {
  id: string
  label: string
  x0: number
  x1: number
  x: number
  width: number
  count?: number
  capacity?: number
  absorb?: boolean
  portalTarget?: string
  queueDepth?: number
  processed?: number
}

export interface ProcessChromeGroup {
  id: string
  label: string
  x: number
  y: number
  absorbed?: number
  total?: number
  complete?: boolean
}

export interface ProcessChromeLayout {
  width: number
  height: number
  left: number
  right: number
  topY: number
  bottomY: number
  midY: number
  stages: readonly ProcessChromeStage[]
  groups?: readonly ProcessChromeGroup[]
}

export interface ProcessChromeOptions {
  showFlowSpine?: boolean
  showStageCounts?: boolean
  showCapacityBadges?: boolean
  showGroupSockets?: boolean
  /** Fit stage labels to the stage band instead of drawing fixed-width pills. */
  stageLabelMode?: "auto" | "full" | "compact" | "none"
  /**
   * When true, stage bays are stroke-only (transparent fill) so particles
   * and paired charts remain visible through the gate geometry.
   */
  outlineStages?: boolean
  testId?: string
}

const ROLE_PALETTE = {
  flow: { fill: "rgba(59, 130, 246, 0.14)", stroke: "rgba(96, 165, 250, 0.7)", accent: "#60a5fa" },
  capacity: { fill: "rgba(251, 146, 60, 0.18)", stroke: "rgba(251, 146, 60, 0.85)", accent: "#fb923c" },
  portal: { fill: "rgba(244, 114, 182, 0.14)", stroke: "rgba(244, 114, 182, 0.7)", accent: "#f472b6" },
  absorb: { fill: "rgba(52, 211, 153, 0.18)", stroke: "rgba(52, 211, 153, 0.8)", accent: "#34d399" }
} as const

const AVG_LABEL_CHAR_PX = 6.2

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function estimateLabelWidth(label: string): number {
  return label.length * AVG_LABEL_CHAR_PX
}

function compactLabel(label: string, maxChars: number): string {
  const trimmed = label.trim()
  if (trimmed.length <= maxChars) return trimmed
  if (maxChars <= 1) return trimmed.slice(0, 1)
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
  if (initials.length > 1 && initials.length <= maxChars) return initials
  if (maxChars <= 3) return trimmed.slice(0, maxChars).toUpperCase()
  return `${trimmed.slice(0, Math.max(1, maxChars - 2))}..`
}

function fittedLabel(
  label: string,
  maxWidth: number,
  mode: NonNullable<ProcessChromeOptions["stageLabelMode"]> = "auto"
): { text: string; textLength?: number } {
  const availableChars = Math.max(1, Math.floor(maxWidth / AVG_LABEL_CHAR_PX))
  const text =
    mode === "compact"
      ? compactLabel(label, availableChars)
      : mode === "full"
        ? label
        : estimateLabelWidth(label) <= maxWidth
          ? label
          : compactLabel(label, availableChars)
  const estimated = estimateLabelWidth(text)
  return {
    text,
    textLength: estimated > maxWidth ? Math.max(4, maxWidth) : undefined
  }
}

function stageRole(stage: ProcessChromeStage): keyof typeof ROLE_PALETTE {
  if (stage.absorb) return "absorb"
  if (stage.portalTarget) return "portal"
  if (stage.capacity != null) return "capacity"
  return "flow"
}

function stageBadge(stage: ProcessChromeStage): string {
  if (stage.capacity != null) {
    const q = stage.queueDepth != null ? ` · q ${stage.queueDepth}` : ""
    return `cap ${Math.round(stage.capacity)}${q}`
  }
  if (stage.absorb) return "absorb"
  if (stage.portalTarget) return "portal"
  return "flow"
}

/**
 * SVG process chrome for overlays / backgroundGraphics.
 * Pure presentational — call from ProcessFlowChart or PhysicsCustomChart.
 */
export function processChrome(
  layout: ProcessChromeLayout,
  options: ProcessChromeOptions = {}
): React.ReactElement {
  const {
    showFlowSpine = true,
    showStageCounts = true,
    showCapacityBadges = true,
    showGroupSockets = true,
    stageLabelMode = "auto",
    outlineStages = false,
    testId = "process-flow-chrome"
  } = options
  const { width: w, height: h, left, right, topY, bottomY, midY, stages, groups = [] } =
    layout
  const laneH = bottomY - topY

  return (
    <svg
      aria-hidden="true"
      data-testid={testId}
      data-outline-stages={outlineStages ? "true" : undefined}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      className={[
        "semiotic-process-chrome",
        outlineStages ? "semiotic-process-chrome--outline-stages" : null
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <defs>
        <linearGradient id="semiotic-process-floor" x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--semiotic-process-floor, var(--semiotic-bg, #0f172a))"
            stopOpacity="0.2"
          />
          <stop
            offset="100%"
            stopColor="var(--semiotic-process-lane, var(--semiotic-surface, #1e293b))"
            stopOpacity="0.55"
          />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#semiotic-process-floor)" />
      <rect
        x={left - 6}
        y={topY - 8}
        width={right - left + 12}
        height={laneH + 16}
        rx={14}
        fill="var(--semiotic-process-lane, var(--semiotic-surface, #111827))"
        fillOpacity={0.45}
        stroke="var(--semiotic-process-border, var(--semiotic-border, #334155))"
        strokeOpacity={0.95}
      />
      {showFlowSpine ? (
        <line
          x1={left + 8}
          x2={right - 8}
          y1={midY}
          y2={midY}
          stroke="var(--semiotic-process-border, var(--semiotic-border, #475569))"
          strokeWidth={2}
          strokeDasharray="6 8"
          opacity={0.55}
        />
      ) : null}
      {stages.map((stage, index) => {
        const role = stageRole(stage)
        const palette = ROLE_PALETTE[role]
        const bandW = Math.max(12, stage.width - 8)
        const labelBoxW = clamp(bandW - 8, 22, 88)
        const labelTextMaxW = Math.max(8, labelBoxW - 10)
        const label = fittedLabel(stage.label, labelTextMaxW, stageLabelMode)
        const showStageLabel = stageLabelMode !== "none" && bandW - 8 >= 22
        const badge = stageBadge(stage)
        const badgeTextMaxW = Math.max(16, bandW - 10)
        const fittedBadge = fittedLabel(badge, badgeTextMaxW, "auto")
        const showBadge = showCapacityBadges && bandW >= 32
        const countText =
          stage.count != null
            ? `n=${stage.count}${stage.processed != null ? ` done ${stage.processed}` : ""}`
            : ""
        const countTextMaxW = Math.max(16, bandW - 8)
        const fittedCount = fittedLabel(countText, countTextMaxW, "auto")
        const stageLabelY = Math.max(30, topY - 15)
        const stageLabelBoxY = stageLabelY - 13
        return (
          <g key={stage.id} data-stage={stage.id} data-role={role}>
            <rect
              className="semiotic-process-chrome__stage-bay"
              x={stage.x0 + 4}
              y={topY + 6}
              width={bandW}
              height={laneH - 12}
              rx={10}
              fill={outlineStages ? "none" : palette.fill}
              stroke={palette.stroke}
              strokeWidth={outlineStages ? 1.85 : role === "flow" ? 1 : 1.6}
            />
            {index < stages.length - 1 ? (
              <polygon
                points={`${stage.x1 - 2},${midY - 7} ${stage.x1 + 8},${midY} ${stage.x1 - 2},${midY + 7}`}
                fill={palette.accent}
                opacity={0.85}
              />
            ) : null}
            {showStageLabel ? (
              <>
                <rect
                  className="semiotic-process-chrome__stage-label-bg"
                  x={stage.x - labelBoxW / 2}
                  y={stageLabelBoxY}
                  width={labelBoxW}
                  height={18}
                  rx={9}
                  fill="var(--semiotic-bg, #0f172a)"
                  fillOpacity={0.75}
                  stroke={palette.stroke}
                />
                <text
                  x={stage.x}
                  y={stageLabelY}
                  textAnchor="middle"
                  fill={palette.accent}
                  fontSize={10}
                  fontWeight={800}
                  className="semiotic-process-chrome__stage-label"
                  textLength={label.textLength}
                  lengthAdjust={label.textLength ? "spacingAndGlyphs" : undefined}
                >
                  <title>{stage.label}</title>
                  {label.text}
                </text>
              </>
            ) : null}
            {showBadge ? (
              <text
                x={stage.x}
                y={topY + 22}
                textAnchor="middle"
                fill="var(--semiotic-process-muted, var(--semiotic-text-secondary, #94a3b8))"
                fontSize={9}
                fontWeight={700}
                textLength={fittedBadge.textLength}
                lengthAdjust={fittedBadge.textLength ? "spacingAndGlyphs" : undefined}
              >
                <title>{badge}</title>
                {fittedBadge.text}
              </text>
            ) : null}
            {showStageCounts && stage.count != null ? (
              <text
                x={stage.x}
                y={Math.min(h - 8, bottomY + 16)}
                textAnchor="middle"
                fill="var(--semiotic-process-text, var(--semiotic-text, #e2e8f0))"
                fontSize={11}
                fontWeight={800}
                textLength={fittedCount.textLength}
                lengthAdjust={fittedCount.textLength ? "spacingAndGlyphs" : undefined}
              >
                <title>{countText}</title>
                {fittedCount.text}
              </text>
            ) : null}
          </g>
        )
      })}
      {showGroupSockets
        ? groups.map((group, groupIndex) => {
            const total = group.total ?? 0
            const absorbed = group.absorbed ?? 0
            const done = group.complete ?? (total > 0 && absorbed >= total)
            const almost = !done && total > 0 && absorbed / total >= 0.75
            const fill = done
              ? "rgba(52, 211, 153, 0.35)"
              : almost
                ? "rgba(251, 191, 36, 0.28)"
                : "rgba(15, 23, 42, 0.75)"
            const stroke = done ? "#34d399" : almost ? "#fbbf24" : "var(--semiotic-border, #64748b)"
            const status = total > 0
              ? `${absorbed}/${total}${done ? " shipped" : almost ? " almost" : ""}`
              : `feature ${groupIndex + 1}`
            const socketW = clamp(
              Math.max(54, estimateLabelWidth(group.label) + 18, estimateLabelWidth(status) + 16),
              54,
              104
            )
            const fittedGroup = fittedLabel(group.label, socketW - 12, "auto")
            const fittedStatus = fittedLabel(status, socketW - 12, "auto")
            return (
              <g key={group.id} data-group={group.id}>
                <rect
                  x={group.x - socketW / 2}
                  y={group.y - 22}
                  width={socketW}
                  height={44}
                  rx={10}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={group.x}
                  y={group.y - 4}
                  textAnchor="middle"
                  fill="var(--semiotic-process-text, var(--semiotic-text, #f8fafc))"
                  fontSize={10}
                  fontWeight={800}
                  textLength={fittedGroup.textLength}
                  lengthAdjust={fittedGroup.textLength ? "spacingAndGlyphs" : undefined}
                >
                  <title>{group.label}</title>
                  {fittedGroup.text}
                </text>
                <text
                  x={group.x}
                  y={group.y + 12}
                  textAnchor="middle"
                  fill={stroke}
                  fontSize={9}
                  fontWeight={700}
                  textLength={fittedStatus.textLength}
                  lengthAdjust={fittedStatus.textLength ? "spacingAndGlyphs" : undefined}
                >
                  <title>{status}</title>
                  {fittedStatus.text}
                </text>
              </g>
            )
          })
        : null}
    </svg>
  )
}
