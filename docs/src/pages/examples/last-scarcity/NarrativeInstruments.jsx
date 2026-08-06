import React, { useCallback, useMemo, useState } from "react"
import { ThemeProvider, useTheme } from "semiotic"
import { GauntletChart } from "semiotic/physics"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import { CHAPTERS, INITIAL_FREED_HOURS } from "./lastScarcityData"
import { formatDwell } from "./useLocalReadingTelemetry"

const ALLOCATION_META = [
  { id: "care", label: "Care", color: "#c36d5a" },
  { id: "friendship", label: "Friendship", color: "#d59e5c" },
  { id: "art", label: "Art", color: "#8e5d73" },
  { id: "study", label: "Study", color: "#66856d" },
  { id: "contemplation", label: "Contemplation", color: "#567d7c" },
  { id: "play", label: "Play", color: "#d7b64e" },
  { id: "rest", label: "Rest", color: "#91a992" },
  { id: "romance", label: "Romance", color: "#a75455" },
  { id: "public-life", label: "Public life", color: "#496b8a" },
]

export function GoodFutureInstrument({ allocation, onAllocationChange, onChoice }) {
  const adjust = (id, direction) => {
    const step = 2
    const current = allocation[id]
    if (direction < 0 && current < step) return
    const next = { ...allocation }
    if (direction > 0) {
      const donor = Object.entries(next)
        .filter(([otherId, value]) => otherId !== id && value >= step)
        .sort((a, b) => b[1] - a[1])[0]
      if (!donor) return
      next[donor[0]] -= step
      next[id] += step
    } else {
      const recipient = Object.entries(next)
        .filter(([otherId]) => otherId !== id)
        .sort((a, b) => b[1] - a[1])[0]
      next[recipient[0]] += step
      next[id] -= step
    }
    onAllocationChange(next)
    onChoice?.("freed-hours-allocation", next)
  }

  return (
    <div className="ls-good-future">
      <div className="ls-good-future__diagram" aria-label="The initial four-step abundance story">
        {["Abundant intelligence", "Abundant production", "Free time", "Human flourishing"].map(
          (label, index) => (
            <React.Fragment key={label}>
              {index > 0 && (
                <span className="ls-good-future__arrow" aria-hidden="true">
                  ↓
                </span>
              )}
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{label}</strong>
              </div>
            </React.Fragment>
          ),
        )}
      </div>

      <div className="ls-allocation">
        <div className="ls-allocation__head">
          <div>
            <span>Stays in this session</span>
            <h3>Imagine what you could do with 100 more hours of free time</h3>
          </div>
          <strong>{Object.values(allocation).reduce((sum, value) => sum + value, 0)} / 100</strong>
        </div>
        <div className="ls-allocation__bar" aria-hidden="true">
          {ALLOCATION_META.map((item) => (
            <i key={item.id} style={{ width: `${allocation[item.id]}%`, background: item.color }} />
          ))}
        </div>
        <div className="ls-allocation__grid">
          {ALLOCATION_META.map((item) => (
            <div key={item.id}>
              <span style={{ "--allocation-color": item.color }}>{item.label}</span>
              <button
                type="button"
                onClick={() => adjust(item.id, -1)}
                disabled={allocation[item.id] < 2}
                aria-label={`Move two hours away from ${item.label}`}
              >
                −
              </button>
              <output>{allocation[item.id]}</output>
              <button
                type="button"
                onClick={() => adjust(item.id, 1)}
                aria-label={`Move two hours to ${item.label}`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const HUMAN_POSITIVES = [
  { id: "security", label: "Security", short: "Sec", color: "#4f705a", value: 2.2, buoyancy: 2.4, radius: 9 },
  { id: "dignity", label: "Dignity", short: "Dig", color: "#567d7c", value: 1.8, buoyancy: 2, radius: 8 },
  { id: "trust", label: "Trust", short: "Tr", color: "#66856d", value: 1.6, buoyancy: 1.8, radius: 8 },
  { id: "agency", label: "Agency", short: "Ag", color: "#496b8a", value: 2, buoyancy: 2.1, radius: 8 },
]

const HUMAN_NEGATIVES = [
  { id: "fear", label: "Fear", short: "Fr", color: "#9a5e67", load: 1.2, radius: 7 },
  { id: "humiliation", label: "Humiliation", short: "Hu", color: "#a75455", load: 1.35, radius: 7 },
  { id: "grievance", label: "Grievance", short: "Gr", color: "#8e5d73", load: 1.15, radius: 7 },
  { id: "domination", label: "Domination", short: "Do", color: "#6e4654", load: 1.4, radius: 7 },
]

const AGON_GATES_FULL = [
  { id: "material", label: "Material scarcity", color: "#739078" },
  { id: "status", label: "Humiliation", color: "#a75455" },
  { id: "memory", label: "Memory", color: "#8e5d73" },
  { id: "command", label: "Domination", color: "#6e4654" },
]

const AGON_GATES_WITHOUT_MATERIAL = AGON_GATES_FULL.filter((gate) => gate.id !== "material")

export function AgonInstrument({ onChoice }) {
  // The essay deliberately overrides canonical chart CSS variables for its
  // editorial surface. Re-providing the resolved theme here creates an
  // explicit chart-token reset without coupling this instrument to docs state.
  const chartTheme = useTheme()
  const [width, hostRef] = useResponsiveWidth(320, 720)
  const [includeMaterialGate, setIncludeMaterialGate] = useState(true)
  const [runKey, setRunKey] = useState(0)
  const [lastOutcome, setLastOutcome] = useState(null)

  const data = useMemo(
    () => [
      {
        id: "person",
        label: "A person",
        positives: ["security", "dignity", "trust", "agency"],
        negatives: [],
        viability: 88,
      },
    ],
    [],
  )

  const gates = includeMaterialGate ? AGON_GATES_FULL : AGON_GATES_WITHOUT_MATERIAL

  const events = useCallback(
    (project) => {
      const sequence = []
      let t = 0.9
      if (includeMaterialGate) {
        sequence.push({
          id: `${project.id}-material`,
          label: "Material scarcity",
          time: t,
          gateId: "material",
          effects: [
            {
              popPositive: { candidates: ["security"], count: 1 },
              addNegative: ["fear"],
              stage: "provision breaks",
              summary: "Material scarcity removes security and adds fear.",
            },
          ],
        })
        t += 0.95
      }
      sequence.push(
        {
          id: `${project.id}-status`,
          label: "Humiliation",
          time: t,
          gateId: "status",
          effects: [
            {
              popPositive: { candidates: ["dignity"], count: 1 },
              addNegative: ["humiliation"],
              stage: "status injury",
              summary: "Humiliation removes dignity and attaches shame.",
            },
          ],
        },
        {
          id: `${project.id}-memory`,
          label: "Memory",
          time: t + 0.85,
          gateId: "memory",
          effects: [
            {
              popPositive: { candidates: ["trust"], count: 1 },
              addNegative: ["grievance"],
              stage: "memory arms",
              summary: "Inherited grievance can strip trust and attach revenge.",
            },
          ],
        },
        {
          id: `${project.id}-command`,
          label: "Domination",
          time: t + 1.7,
          gateId: "command",
          final: true,
          effects: [
            {
              popPositive: { candidates: ["agency"], count: 1 },
              addNegative: ["domination"],
              stage: "command contest",
              summary: "Domination targets agency itself.",
            },
          ],
        },
      )
      return sequence
    },
    [includeMaterialGate],
  )

  const chartWidth = Math.max(300, width)

  return (
    <div ref={hostRef} className="ls-agon">
      <div className="ls-agon__intro">
        <span>Scenario · gates on one human compound body</span>
        <h3>Material scarcity is only the first gate</h3>
        <p>
          The person enters with security, dignity, trust, and agency. With all four gates, material
          scarcity hits first. Click the button to remove that gate entirely and replay: humiliation,
          memory, and domination still strip positives. Producing more goods does not skip those
          later gates.
        </p>
      </div>

      <div className="ls-agon__controls">
        <button
          type="button"
          aria-pressed={!includeMaterialGate}
          onClick={() => {
            setIncludeMaterialGate(false)
            onChoice?.("agon-material-gate", "removed")
            setRunKey((value) => value + 1)
          }}
        >
          Remove material scarcity gate &amp; replay
        </button>
        <button
          type="button"
          onClick={() => {
            setIncludeMaterialGate(true)
            onChoice?.("agon-material-gate", "restored")
            setRunKey((value) => value + 1)
          }}
        >
          Restore all four gates &amp; replay
        </button>
      </div>

      <ThemeProvider theme={chartTheme}>
        <div className="ls-agon__chart">
          <GauntletChart
            key={`agon-${runKey}-${includeMaterialGate ? "with-material" : "no-material"}`}
            data={data}
            idAccessor="id"
            positiveAccessor="positives"
            negativeAccessor="negatives"
            positiveProperties={HUMAN_POSITIVES}
            negativeProperties={HUMAN_NEGATIVES}
            gates={gates}
            events={events}
            crashDetection={false}
            showChrome
            showTethers
            showProjection
            seed={42 + runKey}
            size={[chartWidth, Math.min(480, Math.max(360, Math.round(chartWidth * 0.62)))]}
            title={
              includeMaterialGate
                ? "A person through four gates"
                : "A person without the material gate"
            }
            description={
              includeMaterialGate
                ? "One compound human body crosses material scarcity, humiliation, memory, and domination."
                : "Material scarcity is gone from the route. Humiliation, memory, and domination still fire."
            }
            onStateChange={(states) => {
              const person = states?.find?.((row) => row.id === "person") ?? states?.[0]
              if (person) setLastOutcome(person)
            }}
          />
        </div>
      </ThemeProvider>

      <div className="ls-agon__readout" aria-live="polite">
        <span>After the gates</span>
        <strong>
          {lastOutcome
            ? `Stage: ${lastOutcome.stage ?? "running"} · viability ${Math.round(lastOutcome.viability ?? 0)}`
            : "Run plays automatically"}
        </strong>
        <p>
          {includeMaterialGate
            ? "All four gates are on the route, including material scarcity."
            : "Material scarcity has been removed from the gauntlet. The other three gates still strip dignity, trust, and agency."}
        </p>
      </div>

      <div className="ls-agon__evidence">
        <article>
          <span>MEASUREMENT · CDC YRBSS 2023</span>
          <strong>19%</strong>
          <h3>bullied at school</h3>
          <p>Up from 15% in 2021. A real status conflict, not a theory of innate aggression.</p>
        </article>
        <article>
          <span>MEASUREMENT · CDC YRBSS 2023</span>
          <strong>16%</strong>
          <h3>electronically bullied</h3>
          <p>Self-reported high-school experience; demographics matter.</p>
        </article>
        <article>
          <span>MEASUREMENT · UCDP 26.1</span>
          <strong>1946–2025</strong>
          <h3>state-based conflict record</h3>
          <p>Careful categories do not explain why wars start, or prove they are inevitable.</p>
        </article>
      </div>

      <div className="ls-agon__limit">
        <strong>The honest claim is narrower</strong>
        <p>
          Removing the material scarcity gate does not switch off humiliation, grievance, or
          domination. No prosperity-to-peace causal arrow is drawn here.
        </p>
      </div>
    </div>
  )
}

export function ReaderAttentionMirror({
  allocation,
  trace,
  telemetryEnabled,
  choices,
  constitutionValues,
  onResetTrace,
}) {
  const topAllocation = useMemo(
    () =>
      ALLOCATION_META.map((item) => ({ ...item, value: allocation[item.id] })).sort(
        (a, b) => b.value - a.value,
      ),
    [allocation],
  )
  const dwellRows = useMemo(
    () =>
      CHAPTERS.map((chapter) => ({ ...chapter, dwell: trace.dwell[chapter.id] ?? 0 })).sort(
        (a, b) => b.dwell - a.dwell,
      ),
    [trace.dwell],
  )
  const tensions = useMemo(
    () => buildTensions({ allocation, choices, constitutionValues, dwell: trace.dwell }),
    [allocation, choices, constitutionValues, trace.dwell],
  )
  const mostRead = dwellRows[0]?.dwell > 0 ? dwellRows[0] : null

  return (
    <div className="ls-mirror">
      <div className="ls-mirror__comparison">
        <div>
          <span>WHAT YOU SAID</span>
          <strong>
            {topAllocation[0].label} · {topAllocation[0].value} hours
          </strong>
          <p>
            Your three largest imagined uses were{" "}
            {topAllocation
              .slice(0, 3)
              .map((item) => item.label.toLowerCase())
              .join(", ")}
            .
          </p>
        </div>
        <div>
          <span>WHERE ATTENTION WENT</span>
          <strong>
            {telemetryEnabled ? (mostRead ? mostRead.room : "No dwell yet") : "Trace disabled"}
          </strong>
          <p>
            {telemetryEnabled
              ? mostRead
                ? `${formatDwell(mostRead.dwell)} in this room; ${trace.backtracks} backward chapter transition${trace.backtracks === 1 ? "" : "s"}.`
                : "Keep reading to leave a temporary trace."
              : "Your explicit choices still appear below; no dwell is being collected."}
          </p>
        </div>
      </div>

      <div className="ls-mirror__warning">
        <strong>Attention is not agreement. Curiosity is not endorsement.</strong>
        <p>A trace, not a diagnosis, not a virtue score.</p>
      </div>

      <div className="ls-tensions" aria-label="Four nonexclusive tensions in this reading session">
        {tensions.map((tension) => (
          <div key={tension.id}>
            <span>{tension.left}</span>
            <div
              className="ls-tension-track"
              role="img"
              aria-label={`${tension.left} to ${tension.right}; trace marker ${Math.round(tension.value * 100)} percent toward ${tension.right}`}
            >
              <i style={{ left: `${tension.value * 100}%` }} />
            </div>
            <span>{tension.right}</span>
            <p>{tension.note}</p>
          </div>
        ))}
      </div>

      {telemetryEnabled && (
        <details className="ls-reader-trace">
          <summary>Open your local chapter trace</summary>
          <ol>
            {dwellRows
              .filter((row) => row.dwell > 0)
              .map((row) => (
                <li key={row.id}>
                  <span>{row.room}</span>
                  <i
                    style={{
                      width: `${Math.max(2, (row.dwell / Math.max(1, dwellRows[0].dwell)) * 100)}%`,
                    }}
                  />
                  <strong>{formatDwell(row.dwell)}</strong>
                </li>
              ))}
          </ol>
          <button type="button" onClick={onResetTrace}>
            Delete this in-memory trace
          </button>
        </details>
      )}

      <div className="ls-north-star">
        <p>
          AI may make intelligence, fluent expression, fantasy, advice, praise, entertainment, and
          the appearance of companionship abundant.
        </p>
        <strong>
          It will not make another person’s consent, loyalty, admiration, forgiveness, or love
          interchangeable.
        </strong>
        <p>That is where politics after abundance actually begins.</p>
      </div>

      <div className="ls-last-question">
        <span>The question is no longer only what humans are good for.</span>
        <h3>What kind of beings do we become when necessity no longer decides for us?</h3>
        <strong>What forms the chooser?</strong>
      </div>
    </div>
  )
}

function buildTensions({ allocation, choices, constitutionValues, dwell }) {
  const preference = choices["companion-prefer"]
  const mutuality =
    preference === "human"
      ? 0.2
      : preference === "strategic"
        ? 0.52
        : preference === "agreeable"
          ? 0.82
          : 0.5
  const formationAverage =
    (constitutionValues.formation +
      constitutionValues.ritual +
      constitutionValues.care +
      constitutionValues.unoptimized) /
    400
  const formation = 1 - formationAverage
  const powerAverage =
    (constitutionValues.infrastructure +
      constitutionValues.rights +
      constitutionValues.civic +
      constitutionValues.interoperability) /
    400
  const commons = 1 - powerAverage
  const contemplativeHours =
    allocation.contemplation + allocation.study + allocation.art + allocation.care
  const escalationDwell = (dwell.court ?? 0) + (dwell.agon ?? 0)
  const reflectiveDwell = (dwell.commons ?? 0) + (dwell["empty-office"] ?? 0)
  const attentionAdjustment =
    escalationDwell + reflectiveDwell > 0
      ? escalationDwell / (escalationDwell + reflectiveDwell)
      : 0.5
  const contemplation = clamp01(0.72 - contemplativeHours / 160 + attentionAdjustment * 0.35)
  return [
    {
      id: "mutuality",
      left: "mutuality",
      right: "instrumentalization",
      value: mutuality,
      note: "Derived only from your companion preference, if answered.",
    },
    {
      id: "formation",
      left: "formation",
      right: "gratification",
      value: formation,
      note: "A reflection of the formative levers you set, not a character judgment.",
    },
    {
      id: "commons",
      left: "commons",
      right: "concentration",
      value: commons,
      note: "A projection of four institutional controls, not a political identity.",
    },
    {
      id: "contemplation",
      left: "contemplation",
      right: "escalation",
      value: contemplation,
      note: "Combines declared hours and, only with consent, relative chapter dwell.",
    },
  ]
}

function clamp01(value) {
  return Math.max(0.04, Math.min(0.96, value))
}

export { ALLOCATION_META, INITIAL_FREED_HOURS }
