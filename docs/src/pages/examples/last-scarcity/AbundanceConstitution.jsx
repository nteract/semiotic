import React, { useMemo, useState } from "react"
import { XYCustomChart } from "semiotic/xy"
import { hitTargetPoint, unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  CONSTITUTION_ARCHETYPES,
  DEFAULT_CONSTITUTION,
  constitutionPosition,
} from "./lastScarcityData"

const LEVER_GROUPS = [
  {
    id: "constitution",
    label: "Constitutional levers",
    controls: [
      { id: "infrastructure", label: "Public AI infrastructure", low: "private", high: "public" },
      { id: "provision", label: "Universal provision", low: "conditional", high: "universal" },
      { id: "rights", label: "Data & identity rights", low: "weak", high: "strong" },
      { id: "civic", label: "Local civic capacity", low: "thin", high: "thick" },
      { id: "interoperability", label: "Interoperability", low: "enclosed", high: "open" },
    ],
  },
  {
    id: "formation",
    label: "Formative levers",
    controls: [
      { id: "formation", label: "Education as formation", low: "credential", high: "practice" },
      { id: "ritual", label: "Public ritual & contemplation", low: "rare", high: "common" },
      { id: "care", label: "Care responsibilities", low: "outsourced", high: "shared" },
      { id: "unoptimized", label: "Unoptimized spaces", low: "optimized", high: "protected" },
    ],
  },
]

export default function AbundanceConstitution({ values, onChange, reducedMotion, onChoice }) {
  const [width, hostRef] = useResponsiveWidth(320, 720)
  const current = useMemo(() => constitutionPosition(values), [values])
  const [trail, setTrail] = useState([constitutionPosition(DEFAULT_CONSTITUTION)])
  const [selected, setSelected] = useState(null)
  const displayedTrail = useMemo(
    () => (reducedMotion ? [current] : trail),
    [current, reducedMotion, trail],
  )

  const nearest = useMemo(
    () =>
      [...CONSTITUTION_ARCHETYPES].sort((a, b) => distance(a, current) - distance(b, current))[0],
    [current],
  )

  const update = (id, value) => {
    const next = { ...values, [id]: Number(value) }
    const nextPosition = constitutionPosition(next)
    setTrail((existing) =>
      reducedMotion ? [nextPosition] : [...existing.slice(-17), nextPosition],
    )
    onChange(next)
    onChoice?.(`constitution-${id}`, Number(value))
  }

  const layout = useMemo(
    () => (ctx) => constitutionLayout(ctx, current, displayedTrail),
    [current, displayedTrail],
  )

  const chartHeight = width < 500 ? 520 : 480

  return (
    <div ref={hostRef} className="ls-constitution">
      <div className="ls-constitution__notice">
        <span>SCENARIO FIELD</span>
        <strong>Two axes, twelve named possibilities</strong>
        <p>
          Left to right: who holds power. Bottom to top: how desire is formed. Named points are
          stories for orientation, not forecasts or rankings.
        </p>
      </div>

      <div className="ls-constitution__chart">
        <XYCustomChart
          data={CONSTITUTION_ARCHETYPES}
          layout={layout}
          width={Math.max(320, width)}
          height={chartHeight}
          xExtent={[-1, 1]}
          yExtent={[-1, 1]}
          margin={{ top: 34, right: 28, bottom: 44, left: 44 }}
          chartId="last-scarcity-abundance-constitution"
          enableHover
          onObservation={(event) => {
            if (event.type === "hover" && event.datum) setSelected(unwrapDatum(event.datum))
            if (event.type === "hover-end") setSelected(null)
          }}
          accessibleTable
          description="A true two-by-two field of power versus desire, with twelve named scenario points and the reader’s current lever position."
          summary={`Nearest named scenario: ${nearest.label}. Your point is at power ${current.x.toFixed(2)}, desire ${current.y.toFixed(2)}.`}
          tooltip={(datum) => {
            const row = unwrapDatum(datum)
            return row ? `${row.label}: ${row.note}` : null
          }}
          frameProps={{ background: "transparent" }}
        />
      </div>

      <div className="ls-constitution__readout" aria-live="polite">
        <span>{selected ? "Named scenario" : "Your current possibility"}</span>
        <strong>{selected?.label ?? `Nearest to ${nearest.label}`}</strong>
        <p>
          {selected?.note ??
            `${current.x >= 0 ? "Power is more distributed" : "Power remains more concentrated"}; ${
              current.y >= 0
                ? "formative practices are thicker"
                : "desire remains more captured by gratification and display"
            }.`}
        </p>
      </div>

      <div className="ls-constitution__controls">
        {LEVER_GROUPS.map((group) => (
          <fieldset key={group.id}>
            <legend>{group.label}</legend>
            {group.controls.map((control) => (
              <label key={control.id}>
                <span>
                  <strong>{control.label}</strong>
                  <output>{values[control.id]}</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={values[control.id]}
                  onChange={(event) => update(control.id, event.target.value)}
                />
                <small>
                  <i>{control.low}</i>
                  <i>{control.high}</i>
                </small>
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      <div className="ls-farabian-return">
        <div>
          <span>THE GARDEN ALONE</span>
          <p>Personal virtue cannot cancel predatory institutions.</p>
        </div>
        <div>
          <span>THE COMMONS ALONE</span>
          <p>Fair distribution cannot tell people what is worth wanting.</p>
        </div>
        <strong>Character and power solve different problems, and both still matter.</strong>
      </div>
    </div>
  )
}

function constitutionLayout(ctx, current, trail) {
  if (!ctx.data.length) return { nodes: [] }

  const { plot } = ctx.dimensions
  const x = (value) => ((value + 1) / 2) * plot.width
  const y = (value) => (1 - (value + 1) / 2) * plot.height
  const currentDatum = {
    id: "reader-position",
    label: "Your current possibility",
    note: `Power ${current.x.toFixed(2)}; desire ${current.y.toFixed(2)}. Scenario, not a score.`,
    x: current.x,
    y: current.y,
  }
  const nodes = [
    ...ctx.data.map((row) =>
      hitTargetPoint({
        x: x(row.x),
        y: y(row.y),
        r: 12,
        datum: row,
        id: `constitution-${row.id}`,
      }),
    ),
    hitTargetPoint({
      x: x(current.x),
      y: y(current.y),
      r: 14,
      datum: currentDatum,
      id: "constitution-reader-position",
    }),
  ]
  return {
    nodes,
    overlays: (
      <g pointerEvents="none" className="ls-constitution-svg">
        {/* Full quadrant panels so the field reads as a true 2×2, not four corner dots */}
        <rect width={plot.width / 2} height={plot.height / 2} x="0" y="0" fill="#c5d4c1" opacity="0.28" />
        <rect
          width={plot.width / 2}
          height={plot.height / 2}
          x={plot.width / 2}
          y="0"
          fill="#8fb9a4"
          opacity="0.28"
        />
        <rect
          width={plot.width / 2}
          height={plot.height / 2}
          x="0"
          y={plot.height / 2}
          fill="#b7929b"
          opacity="0.22"
        />
        <rect
          width={plot.width / 2}
          height={plot.height / 2}
          x={plot.width / 2}
          y={plot.height / 2}
          fill="#d8bd7c"
          opacity="0.22"
        />
        <line
          x1={plot.width / 2}
          x2={plot.width / 2}
          y1="0"
          y2={plot.height}
          stroke="var(--ls-chart-rule, #65776e)"
          strokeWidth="1.4"
        />
        <line
          x1="0"
          x2={plot.width}
          y1={plot.height / 2}
          y2={plot.height / 2}
          stroke="var(--ls-chart-rule, #65776e)"
          strokeWidth="1.4"
        />
        <text
          x={plot.width / 2}
          y="-12"
          textAnchor="middle"
          fill="var(--ls-chart-ink-soft, #45675b)"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1"
        >
          CULTIVATED DESIRE
        </text>
        <text
          x={plot.width / 2}
          y={plot.height + 30}
          textAnchor="middle"
          fill="var(--ls-chart-ink-soft, #7b5960)"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1"
        >
          CAPTURED DESIRE
        </text>
        <text
          x="2"
          y={plot.height / 2 - 8}
          fill="var(--ls-chart-ink-soft, #71555c)"
          fontSize="8"
          fontWeight="700"
        >
          CONCENTRATED POWER
        </text>
        <text
          x={plot.width - 2}
          y={plot.height / 2 - 8}
          textAnchor="end"
          fill="var(--ls-chart-ink-soft, #45675b)"
          fontSize="8"
          fontWeight="700"
        >
          DISTRIBUTED POWER
        </text>

        {trail.length > 1 && (
          <path
            d={trail
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${x(point.x)},${y(point.y)}`,
              )
              .join(" ")}
            fill="none"
            stroke="var(--ls-chart-ink-soft, #2f5a50)"
            strokeWidth="2"
            strokeDasharray="2 5"
            opacity="0.38"
          />
        )}

        {ctx.data.map((row) => {
          const px = x(row.x)
          const py = y(row.y)
          const labelAbove = row.y < 0.15
          return (
            <g key={row.id}>
              <circle
                cx={px}
                cy={py}
                r="5.5"
                fill="var(--ls-chart-paper, #fffefa)"
                stroke="var(--ls-chart-ink-soft, #3f5a4a)"
                strokeWidth="1.4"
              />
              <text
                x={px}
                y={labelAbove ? py - 10 : py + 14}
                textAnchor="middle"
                fill="var(--ls-chart-ink, #243f36)"
                fontSize="7.5"
                fontWeight="700"
              >
                {row.label}
              </text>
            </g>
          )
        })}

        <circle cx={x(current.x)} cy={y(current.y)} r="14" fill="#a85555" opacity="0.16" />
        <circle
          cx={x(current.x)}
          cy={y(current.y)}
          r="6.5"
          fill="#a85555"
          stroke="var(--ls-chart-paper, #fffefa)"
          strokeWidth="2"
        />
        <path
          d={`M${x(current.x) - 12},${y(current.y)}H${x(current.x) + 12}M${x(current.x)},${y(current.y) - 12}V${y(current.y) + 12}`}
          stroke="#a85555"
          strokeWidth="0.8"
        />
      </g>
    ),
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export { DEFAULT_CONSTITUTION }
