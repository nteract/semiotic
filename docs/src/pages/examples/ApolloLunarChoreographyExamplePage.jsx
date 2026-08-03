import React, { useMemo, useState } from "react"
import { ProcessSankey } from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  APOLLO_MISSIONS,
  APOLLO_PHASE_COLORS,
  APOLLO_SOURCES,
  APOLLO_SUMMARY,
  axisTicksForMissionHours,
  formatDurationHours,
  formatElapsedHours,
  processDataForFocus,
} from "./data/apolloLunarChoreography"
import "./ApolloLunarChoreographyExamplePage.css"

const FOCUS_OPTIONS = Object.freeze([
  {
    id: "all",
    short: "All nine",
    label: "The whole choreography",
    note: "Align every lunar voyage at launch.",
  },
  {
    id: "landings",
    short: "Six landings",
    label: "The third-seat split",
    note: "Watch two descend while one stays above.",
  },
  {
    id: "long-stay",
    short: "J missions",
    label: "Science buys time",
    note: "Apollo 15–17 hold the surface lane open.",
  },
  {
    id: "apollo-13",
    short: "Apollo 13",
    label: "The choreography breaks",
    note: "All three divert through the lifeboat.",
  },
])

const implementationCode = `import { ProcessSankey } from "semiotic"

const { nodes, edges, domain } = processDataForFocus("all")

<ProcessSankey
  nodes={nodes}
  edges={edges}
  domain={domain}
  axisTicks={axisTicksForMissionHours(domain[1])}
  nodeLabel="label"
  colorBy="category"
  colorScheme={APOLLO_PHASE_COLORS}
  pairing="temporal"
  laneOrder="crossing-min+inside-out"
  maxValueScale={5}
  lanePlacement="hug"
  ribbonLane="both"
  lifetimeMode="half"
  showLaneRails
  showParticles
  accessibleTable
/>

// Each edge is one crew batch moving between real mission phases.
// All missions use NASA Ground Elapsed Time, aligned at launch.
{
  id: "apollo-11-descent",
  mission: "Apollo 11",
  source: "LUNAR ORBIT",
  target: "SURFACE",
  value: 2,
  startTime: 100.26,
  endTime: 102.76,
  people: ["Neil Armstrong", "Buzz Aldrin"]
}`

function focusSummary(focusId, missions) {
  if (focusId === "all") {
    return "Nine lunar voyages aligned at launch: 27 crew-seats leave Earth, 24 reach lunar orbit, 12 descend to the surface, and every seat reaches recovery."
  }
  if (focusId === "landings") {
    return "Across six landings, the lunar-orbit band repeatedly narrows from three people to one while two occupy the surface, then returns to three before the homeward burn."
  }
  if (focusId === "long-stay") {
    return "Apollo 15, 16, and 17 turn the surface from a brief visit into a roughly three-day workplace while one command-module pilot remains above."
  }
  if (focusId === "apollo-13") {
    return "Apollo 13 never enters lunar orbit: all three crew-seats divert through the lunar-module lifeboat and then follow the free-return path to recovery."
  }
  const mission = missions[0]
  return mission ? `${mission.label}: ${mission.story}` : "Apollo lunar mission phases."
}

function eventsForMission(mission) {
  const events = [{ label: "Launch", time: 0 }]
  if (mission.kind === "abort") {
    events.push(
      { label: "Oxygen-tank accident", time: mission.accident },
      { label: "Command module powered down", time: mission.lifeboatStart },
      { label: "PC+2 return burn", time: mission.returnBurn },
    )
  } else {
    events.push({ label: "Lunar-orbit insertion", time: mission.lunarOrbitInsertion })
    if (mission.kind === "rehearsal") {
      events.push(
        { label: "LM undocking", time: mission.undocking },
        { label: "Low pass", time: mission.lowPass },
        { label: "Rendezvous docking", time: mission.docking },
      )
    }
    if (mission.kind === "landing") {
      events.push(
        { label: "Lunar landing", time: mission.lunarLanding },
        { label: "Lunar liftoff", time: mission.lunarLiftoff },
      )
    }
    events.push({ label: "Trans-Earth injection", time: mission.transEarthInjection })
  }
  events.push({ label: "Splashdown", time: mission.missionHours })
  return events
}

function phaseLabel(id) {
  return {
    LAUNCH: "Launch",
    "LUNAR ORBIT": "Lunar orbit",
    "LOW PASS": "Low lunar pass",
    SURFACE: "Lunar surface",
    LIFEBOAT: "LM lifeboat",
    RECOVERY: "Recovery",
  }[id] || id
}

const PHASE_DETAILS = Object.freeze({
  LAUNCH: "The shared departure lane: each three-person crew leaves Earth together before the mission path diverges.",
  "LUNAR ORBIT": "The mission's orbital workspace. Landing crews split here, leaving one command-module pilot above while two descend.",
  "LOW PASS": "Apollo 10's rehearsal lane: two astronauts descended to 47,400 feet without attempting a landing.",
  SURFACE: "The lunar workplace occupied by each mission's commander and lunar-module pilot until liftoff.",
  LIFEBOAT: "Apollo 13's emergency shelter, where all three astronauts conserved command-module power for the return home.",
  RECOVERY: "The conserved endpoint: every crew-seat reaches splashdown, even when the route there changes.",
})

export function ApolloTooltip({ hover, edges = [] }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null

  if (datum.missionId) {
    return (
      <div className="semiotic-tooltip apollo-example__tooltip">
        <span style={{ color: datum.missionColor }}>{datum.mission}</span>
        <strong>{phaseLabel(datum.source)} → {phaseLabel(datum.target)}</strong>
        <p>{datum.note}</p>
        <small>{formatElapsedHours(datum.startTime)} to {formatElapsedHours(datum.endTime)}</small>
        <b>{datum.value} crew-seat{datum.value === 1 ? "" : "s"}: {datum.people?.join(", ")}</b>
      </div>
    )
  }

  if (!datum.id) return null
  const relatedEdges = edges.filter((edge) => edge.source === datum.id || edge.target === datum.id)
  const missionCount = new Set(relatedEdges.map((edge) => edge.missionId)).size
  const incomingCount = relatedEdges.filter((edge) => edge.target === datum.id).length
  const outgoingCount = relatedEdges.filter((edge) => edge.source === datum.id).length
  return (
    <div className="semiotic-tooltip apollo-example__tooltip">
      <span style={{ color: APOLLO_PHASE_COLORS[datum.category] }}>Mission phase</span>
      <strong>{datum.label || phaseLabel(datum.id)}</strong>
      <p>{PHASE_DETAILS[datum.id] || "A phase occupied by crew before or after a timed transition."}</p>
      <small>
        {missionCount} mission{missionCount === 1 ? "" : "s"} in this lens · {relatedEdges.length} timed transition{relatedEdges.length === 1 ? "" : "s"}
      </small>
      <b>{incomingCount} arriving · {outgoingCount} departing ribbon{outgoingCount === 1 ? "" : "s"}</b>
    </div>
  )
}

function OrbitGlyph() {
  return (
    <svg className="apollo-example__orbit-glyph" viewBox="0 0 540 300" aria-hidden="true">
      <defs>
        <radialGradient id="apollo-earth" cx="35%" cy="30%">
          <stop offset="0" stopColor="#c9f1f4" />
          <stop offset="0.42" stopColor="#4da7bd" />
          <stop offset="1" stopColor="#123447" />
        </radialGradient>
        <radialGradient id="apollo-moon" cx="32%" cy="28%">
          <stop offset="0" stopColor="#f0e2c6" />
          <stop offset="1" stopColor="#8e8b86" />
        </radialGradient>
      </defs>
      <path d="M82 175C188 33 382 34 466 136C398 236 195 262 82 175Z" fill="none" stroke="#6d8995" strokeDasharray="4 8" />
      <path d="M86 176C215 227 375 224 464 137" fill="none" stroke="#e8875f" strokeWidth="2.5" />
      <circle cx="76" cy="180" r="43" fill="url(#apollo-earth)" />
      <circle cx="469" cy="133" r="27" fill="url(#apollo-moon)" />
      <circle cx="452" cy="122" r="5" fill="#777772" opacity="0.6" />
      <circle cx="480" cy="142" r="7" fill="#777772" opacity="0.45" />
      <g transform="translate(306 224) rotate(-9)">
        <path d="M-15 0 4-7 20 0 4 7Z" fill="#f3c969" />
        <path d="M-19-5-30-11-28-2Z" fill="#ef835d" opacity="0.75" />
        <path d="M-19 5-30 11-28 2Z" fill="#ef835d" opacity="0.75" />
      </g>
    </svg>
  )
}

function Metric({ value, label, note }) {
  return (
    <div className="apollo-example__metric">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </div>
  )
}

function MissionDossier({ mission, focusId, onShowAll }) {
  const events = eventsForMission(mission)
  const commandModulePilot = mission.crew.find((member) => member.role === "CMP")
  return (
    <section className="apollo-example__dossier" aria-labelledby="apollo-dossier-title">
      <div className="apollo-example__dossier-heading">
        <div>
          <span>Selected flight / {mission.year}</span>
          <h3 id="apollo-dossier-title">{mission.label}</h3>
          <p>{mission.story}</p>
          {focusId !== "all" ? (
            <button className="apollo-example__show-all" type="button" onClick={onShowAll}>
              <span aria-hidden="true">←</span> Back to all missions
            </button>
          ) : null}
        </div>
        <div className="apollo-example__mission-duration">
          <small>Mission duration</small>
          <strong>{formatDurationHours(mission.missionHours)}</strong>
          <span>{mission.destination}</span>
        </div>
      </div>

      <div className="apollo-example__crew" aria-label={`${mission.label} crew`}>
        {mission.crew.map((member) => (
          <div key={member.name}>
            <span>{member.role}</span>
            <strong>{member.name}</strong>
            <small>
              {mission.kind === "landing" && member.role === "CMP"
                ? "The third seat: remained in lunar orbit"
                : mission.kind === "landing"
                  ? "Descended to the lunar surface"
                  : mission.kind === "rehearsal" && member.role !== "CMP"
                    ? "Flew the low lunar pass"
                    : mission.kind === "abort"
                      ? "Sheltered in the lunar module"
                      : "Remained with the three-person crew"}
            </small>
          </div>
        ))}
      </div>

      <ol className="apollo-example__event-ledger">
        {events.map((event, index) => (
          <li key={event.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{event.label}</strong>
            <time>{formatElapsedHours(event.time)}</time>
          </li>
        ))}
      </ol>

      {mission.kind === "landing" ? (
        <p className="apollo-example__dossier-note">
          For {formatDurationHours(mission.surfaceHours)}, {mission.crew.filter((d) => d.role !== "CMP").map((d) => d.name).join(" and ")} occupied the surface lane while {commandModulePilot.name} carried the one-person lunar-orbit band.
        </p>
      ) : null}
    </section>
  )
}

export default function ApolloLunarChoreographyExamplePage() {
  const reducedMotion = useReducedMotion()
  const [focusId, setFocusId] = useState("all")
  const [inspectedMissionId, setInspectedMissionId] = useState("apollo-11")
  const [showParticles, setShowParticles] = useState(true)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [placement, setPlacement] = useState("hug")
  const [chartWidth, chartRef] = useResponsiveWidth(300, 1080)

  const processData = useMemo(() => processDataForFocus(focusId), [focusId])
  const inspectedMission =
    APOLLO_MISSIONS.find((row) => row.id === inspectedMissionId) ?? APOLLO_MISSIONS[2]
  const compact = chartWidth < 700
  const focusIsSingleMission = processData.missions.length === 1
  const valueScaleCap = focusIsSingleMission ? 18 : focusId === "all" ? 4.8 : 7
  const chartSummary = focusSummary(focusId, processData.missions)
  const axisTicks = axisTicksForMissionHours(processData.domain[1])

  function selectFocus(nextFocusId) {
    setFocusId(nextFocusId)
    if (nextFocusId.startsWith("apollo-")) setInspectedMissionId(nextFocusId)
  }

  function inspectChartDatum(datum) {
    const raw = unwrapDatum(datum)
    if (raw?.missionId) setInspectedMissionId(raw.missionId)
  }

  return (
    <ExamplePageLayout title="The Third Seat: Apollo’s Lunar Choreography">
      <div className="apollo-example">
        <header className="apollo-example__masthead">
          <div className="apollo-example__mast-copy">
            <span className="apollo-example__kicker">NASA FLIGHT LOG / 1968–1972 / PROCESS SANKEY</span>
            <h2>THE<br />THIRD<br />SEAT</h2>
            <p>
              Nine crews aimed at the Moon. Six times, two people descended—and one kept circling alone.
              Align the missions at launch to see Apollo as a choreography of separation, waiting, reunion, and return.
            </p>
          </div>
          <div className="apollo-example__hero-orbit">
            <OrbitGlyph />
            <div className="apollo-example__question">
              <span>The question</span>
              <strong>Where was every crew-seat, hour by hour?</strong>
              <small>Bands hold people. Ribbons move them. Nothing disappears.</small>
            </div>
          </div>
        </header>

        <section className="apollo-example__metrics" aria-label="Apollo lunar mission summary">
          <Metric value={APOLLO_SUMMARY.crewSeats} label="crew-seats" note="nine missions × three seats" />
          <Metric value={APOLLO_SUMMARY.uniquePeople} label="people" note="Lovell, Young, and Cernan flew twice" />
          <Metric value={APOLLO_SUMMARY.lunarSurfacePeople} label="moonwalkers" note="two from each landing crew" />
          <Metric value={APOLLO_SUMMARY.soloOrbiters} label="third seats" note="one command-module pilot per landing" />
        </section>

        <section className="apollo-example__opening" aria-labelledby="apollo-opening-title">
          <span className="apollo-example__section-number">01 / Read the process</span>
          <div>
            <h3 id="apollo-opening-title">The famous photograph leaves someone out.</h3>
            <p>
              A lunar landing is usually remembered as two figures on gray ground. But Apollo was designed around three:
              the command-module pilot stayed in lunar orbit while the commander and lunar-module pilot descended.
              The one-person band is not a footnote. It is the line that made reunion—and the trip home—possible.
            </p>
          </div>
          <aside>
            <strong>Why ProcessSankey?</strong>
            <p>A conventional Sankey can show how many people took each route. It cannot show how long one person waited above while two remained below.</p>
          </aside>
        </section>

        <section className="apollo-example__chart-section" aria-labelledby="apollo-chart-title">
          <div className="apollo-example__chart-heading">
            <div>
              <span>02 / Mission control</span>
              <h3 id="apollo-chart-title">Where the crew sits, by hour after launch</h3>
              <p>{chartSummary}</p>
            </div>
            <div className="apollo-example__chart-key" aria-label="Chart reading key">
              <span><i className="is-band" /> band = occupying a phase</span>
              <span><i className="is-ribbon" /> ribbon = moving between phases</span>
            </div>
          </div>

          <div className="apollo-example__focus-grid" role="group" aria-label="Story lens">
            {FOCUS_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={focusId === option.id ? "is-active" : ""}
                aria-pressed={focusId === option.id}
                onClick={() => selectFocus(option.id)}
              >
                <small>{option.short}</small>
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </button>
            ))}
          </div>

          <div className="apollo-example__mission-selector" role="group" aria-label="Select one Apollo mission">
            {APOLLO_MISSIONS.map((mission) => (
              <button
                type="button"
                key={mission.id}
                aria-pressed={focusId === mission.id}
                className={focusId === mission.id ? "is-active" : ""}
                style={{ "--mission-color": mission.color }}
                onClick={() => selectFocus(mission.id)}
              >
                <span>{mission.label.replace("Apollo ", "A")}</span>
                <small>{mission.kind === "landing" ? "landed" : mission.kind}</small>
              </button>
            ))}
          </div>

          <div className="apollo-example__engineering-controls">
            <div role="group" aria-label="Lane placement">
              <span>Lane placement</span>
              {[
                ["hug", "Flight plan"],
                ["stack", "Full stack"],
              ].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={placement === id} onClick={() => setPlacement(id)}>
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={showParticles && !reducedMotion}
              disabled={reducedMotion}
              onClick={() => setShowParticles((value) => !value)}
            >
              {reducedMotion ? "Motion preference respected" : showParticles ? "Crew motion on" : "Crew motion off"}
            </button>
            <button type="button" aria-pressed={showTelemetry} onClick={() => setShowTelemetry((value) => !value)}>
              {showTelemetry ? "Layout telemetry on" : "Reveal layout telemetry"}
            </button>
          </div>

          <div className="apollo-example__chart-shell" ref={chartRef}>
            <ProcessSankey
              nodes={processData.nodes}
              edges={processData.edges}
              domain={processData.domain}
              axisTicks={axisTicks}
              nodeLabel="label"
              width={Math.max(300, chartWidth)}
              height={compact ? 470 : 560}
              margin={{
                top: showTelemetry ? 62 : 34,
                right: compact ? 20 : 132,
                bottom: 50,
                left: compact ? 74 : 112,
              }}
              colorBy="category"
              colorScheme={APOLLO_PHASE_COLORS}
              showLegend={!compact}
              pairing="temporal"
              laneOrder="crossing-min+inside-out"
              maxValueScale={valueScaleCap}
              lanePlacement={placement}
              ribbonLane="both"
              lifetimeMode="half"
              showLaneRails
              showLabels
              showParticles={showParticles && !reducedMotion}
              particleStyle={{
                radius: 2.4,
                opacity: 0.88,
                spawnRate: 0.08,
                speedMultiplier: 0.75,
                maxPerEdge: 18,
                color: "source",
              }}
              showQualityReadout={showTelemetry}
              edgeOpacity={0.62}
              tooltip={(hover) => <ApolloTooltip hover={hover} edges={processData.edges} />}
              onClick={inspectChartDatum}
              timeFormat={formatElapsedHours}
              valueFormat={(value) => `${value} crew-seat${value === 1 ? "" : "s"}`}
              accessibleTable
              description="Apollo lunar crews moving among launch, lunar orbit, lunar surface, Apollo 10's low pass, Apollo 13's lifeboat, and recovery, aligned by hours after launch."
              summary={chartSummary}
              chartId="apollo-lunar-choreography"
            />
          </div>

          <p className="apollo-example__chart-caption">
            Analytical alignment, not calendar time: every mission begins at T+0. Ribbon width counts crew-seats;
            horizontal length is elapsed time. Click a ribbon to load its mission log below.
          </p>
        </section>

        <MissionDossier mission={inspectedMission} focusId={focusId} onShowAll={() => selectFocus("all")} />

        <section className="apollo-example__argument" aria-labelledby="apollo-argument-title">
          <div className="apollo-example__argument-heading">
            <span className="apollo-example__section-number">03 / What the shape teaches</span>
            <h3 id="apollo-argument-title">The program learned by changing the duration of the split.</h3>
          </div>
          <div className="apollo-example__argument-grid">
            <article>
              <span>First proof</span>
              <strong>20 hours</strong>
              <h4>Apollo 8 made lunar orbit real.</h4>
              <p>Three people stayed together for ten orbits. The chart establishes the unbranched route before the landing choreography appears.</p>
              <button type="button" onClick={() => selectFocus("apollo-8")}>Trace Apollo 8</button>
            </article>
            <article>
              <span>Rehearsal</span>
              <strong>47,400 ft</strong>
              <h4>Apollo 10 split without touching down.</h4>
              <p>Two people moved into the low-pass lane while John Young remained above. Every major step except landing was rehearsed.</p>
              <button type="button" onClick={() => selectFocus("apollo-10")}>Trace Apollo 10</button>
            </article>
            <article>
              <span>Operating model</span>
              <strong>2 + 1</strong>
              <h4>Six landings repeat one separation.</h4>
              <p>The surface band is always two crew-seats wide. The lunar-orbit band pinches to one, then grows back to three.</p>
              <button type="button" onClick={() => selectFocus("landings")}>Compare six landings</button>
            </article>
            <article className="is-alert">
              <span>Exception</span>
              <strong>3 → 3</strong>
              <h4>Apollo 13 refuses the planned split.</h4>
              <p>The entire batch enters the lifeboat. Mass conservation turns “successful failure” into a visible claim: nobody is sacrificed to the route.</p>
              <button type="button" onClick={() => selectFocus("apollo-13")}>Trace Apollo 13</button>
            </article>
          </div>
        </section>

        <section className="apollo-example__surface-table" aria-labelledby="apollo-surface-title">
          <div>
            <span className="apollo-example__section-number">04 / The Moon becomes a workplace</span>
            <h3 id="apollo-surface-title">Six landings, one widening commitment of time</h3>
            <p>
              Apollo 11’s surface band lasts 21.6 hours. By Apollo 17 it lasts 75.0—long enough for three EVAs,
              a rover, sleep periods, and a much broader scientific program. The people count stays two; the temporal footprint changes.
            </p>
          </div>
          <div className="apollo-example__surface-bars">
            {APOLLO_MISSIONS.filter((mission) => mission.kind === "landing").map((mission) => (
              <button
                type="button"
                key={mission.id}
                onClick={() => selectFocus(mission.id)}
                style={{ "--surface-width": `${(mission.surfaceHours / 75) * 100}%`, "--mission-color": mission.color }}
              >
                <span>{mission.label}</span>
                <i><b /></i>
                <strong>{mission.surfaceHours.toFixed(1)} h</strong>
              </button>
            ))}
          </div>
          <table>
            <caption>Published NASA mission milestones used for the surface-duration comparison.</caption>
            <thead><tr><th>Mission</th><th>Landing GET</th><th>Liftoff GET</th><th>Surface duration</th><th>Command-module pilot</th></tr></thead>
            <tbody>
              {APOLLO_MISSIONS.filter((mission) => mission.kind === "landing").map((mission) => (
                <tr key={mission.id}>
                  <th>{mission.label}</th>
                  <td>{formatElapsedHours(mission.lunarLanding)}</td>
                  <td>{formatElapsedHours(mission.lunarLiftoff)}</td>
                  <td>{formatDurationHours(mission.surfaceHours)}</td>
                  <td>{mission.crew.find((member) => member.role === "CMP")?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="apollo-example__method" aria-labelledby="apollo-method-title">
          <div className="apollo-example__method-copy">
            <span className="apollo-example__section-number">05 / Evidence and transformation</span>
            <h3 id="apollo-method-title">Real milestones, one deliberate analytical clock</h3>
            <p>
              NASA reports mission events as Ground Elapsed Time. This example transcribes the major milestones and aligns every launch at zero,
              turning nine historical clocks into one comparable process. “Crew-seat” is the unit because three people flew twice:
              {" "}{APOLLO_SUMMARY.repeatVoyagers.map((row) => `${row.name} (${row.missions.join(" and ")})`).join("; ")}.
            </p>
            <p>
              Landing and liftoff endpoints are published values. The short landing-mission descent and ascent ribbons use declared display intervals
              because the compact NASA summary does not list every separation and docking. Apollo 10 preserves its published undocking,
              closest-approach, and docking times while the return ribbon begins at a declared display break after closest approach.
              Apollo 13’s lifeboat path uses the accident, power-down, PC+2 burn, and splashdown chronology.
            </p>
          </div>
          <div className="apollo-example__sources">
            {APOLLO_SOURCES.map((source, index) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                <span>Source 0{index + 1} / {source.publisher}</span>
                <strong>{source.label}</strong>
                <small>{source.use}</small>
              </a>
            ))}
          </div>
        </section>

        <section className="blocks-example apollo-example__code" aria-labelledby="apollo-code-title">
          <span className="apollo-example__section-number">06 / Rebuild the view</span>
          <h3 id="apollo-code-title">The chart is the data model</h3>
          <p>
            The special effect is not custom drawing. It is a ProcessSankey with real event time, a capped value scale,
            hugged lanes, renderer-aware ordering, and crew batches that conserve their value through every split and reunion.
          </p>
          <CodeBlock code={implementationCode} language="jsx" showCopyButton wrap />
        </section>

        <footer className="apollo-example__footer">
          <span>THE THIRD SEAT / SEMIOTIC PROCESS SANKEY</span>
          <strong>Every route ends with three.</strong>
          <p>That is the engineering story hiding inside the moonwalk photographs.</p>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}
