import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChartContainer, ThemeProvider } from "semiotic"
import { OrdinalCustomChart } from "semiotic/ordinal"
import {
  ChainReactionChart,
  calculateBlockerAmplification,
  compileDependencyMachine,
} from "semiotic/physics"
import { intervalLanesLayout } from "semiotic/recipes"
import { BigNumber } from "semiotic/value"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  BLOCKER_IDS,
  CITY_PULSE_TASKS,
  LANES,
  SNAPSHOT_DAY,
  STATUS_COLORS,
  TASK_ACCESSORS,
} from "./data/releaseMachine"
import "./ChainReactionExamplePage.css"

const implementationCode = `import {
  ChainReactionChart,
  calculateBlockerAmplification,
  compileDependencyMachine,
} from "semiotic/physics"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { intervalLanesLayout } from "semiotic/recipes"

const machine = compileDependencyMachine({ data: tasks, ...accessors, laneOrder: LANES })
const amp = calculateBlockerAmplification(machine, "privacy-approval")
// → { downstreamTaskCount: 9, affectedLaneCount: 4, … }

// Same rows, two coordinates:
// Swimlane: x = planned day  ·  Machine: y = dependency depth
<OrdinalCustomChart layout={intervalLanesLayout} … />
<ChainReactionChart mode="replay" insight="blocker-amplification" … />`

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])
  return reduced
}

export default function ChainReactionExamplePage() {
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "tufte-dark" : "tufte"
  const [width, hostRef] = useResponsiveWidth(320, 1120)
  const chartWidth = Math.max(320, Math.min(width - 24, 1040))
  const machineRef = useRef(null)
  const reducedMotion = useReducedMotion()

  const [selectedTaskID, setSelectedTaskID] = useState("privacy-approval")
  const [previewTaskID, setPreviewTaskID] = useState(null)
  const [events, setEvents] = useState([])
  const [playing, setPlaying] = useState(false)

  const machine = useMemo(
    () =>
      compileDependencyMachine({
        data: CITY_PULSE_TASKS,
        ...TASK_ACCESSORS,
        laneOrder: LANES,
      }),
    [],
  )

  const amplifications = useMemo(() => {
    const out = {}
    for (const id of BLOCKER_IDS) {
      out[id] = calculateBlockerAmplification(machine, id)
    }
    return out
  }, [machine])

  // Machine nodes expose `label` (from labelAccessor); the raw row still has `title`.
  const selectedTask = machine.byID.get(selectedTaskID) ?? machine.byID.get("privacy-approval")
  const selectedLabel =
    selectedTask?.label ?? selectedTask?.datum?.title ?? selectedTask?.id ?? "task"
  const selectedAmp = calculateBlockerAmplification(machine, selectedTask.id)
  const highlighted = useMemo(
    () => new Set([selectedTask.id, ...selectedAmp.downstreamTaskIDs]),
    [selectedAmp.downstreamTaskIDs, selectedTask.id],
  )

  const privacy = amplifications["privacy-approval"]
  const heroArt = amplifications["hero-art"]

  // Settle once so completed work is already folded in — the open question is
  // which *remaining* blocker freezes the most unfinished work, not a replay of
  // history the reader has not asked for.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      machineRef.current?.settle?.()
      setPlaying(false)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [])

  const handleObservation = useCallback((event) => {
    setEvents((current) => [...current.slice(-6), event])
    if (event.taskID) setSelectedTaskID(event.taskID)
    if (event.blockerID) setSelectedTaskID(event.blockerID)
    if (event.type === "machine-settled") setPlaying(false)
  }, [])

  const act = (fn) => {
    fn?.()
  }

  const scheduleLayout = useMemo(
    () => intervalLanesLayout,
    [],
  )

  const scheduleConfig = useMemo(
    () => ({
      laneAccessor: "lane",
      startAccessor: "startDay",
      endAccessor: "endDay",
      domain: [0, 18],
      lanes: LANES,
      unit: 0.15,
      minBarWidth: 6,
      idAccessor: "id",
      color: (d) => {
        if (d.id === selectedTaskID) return "#192b23"
        if (highlighted.has(d.id) && d.status === "blocked") return STATUS_COLORS.blocked
        if (highlighted.has(d.id)) return "#c47a52"
        return STATUS_COLORS[d.status] ?? STATUS_COLORS.waiting
      },
      showLaneLabels: true,
      showAxis: true,
      axisTicks: [0, 5, 10, 15],
      tickFormat: (d) => `d${d}`,
    }),
    [highlighted, selectedTaskID],
  )

  // Height scales with dependency depth so top lane labels and bottom-level
  // tipped cards stay inside ChartContainer's overflow:hidden body.
  const machineHeight = Math.max(
    chartWidth < 640 ? 920 : 780,
    160 + (machine.maxLevel + 1) * 118,
  )

  return (
    <ExamplePageLayout title="The Release Machine">
      <ThemeProvider theme={themeName}>
        <div className="release-machine" ref={hostRef}>
          <header className="release-machine__hero">
            <div>
              <span className="release-machine__kicker">
                Blocker amplification · same schedule, different leverage
              </span>
              <h2>Two tasks are 90% done and late. Only one freezes the launch.</h2>
              <p>
                On day {SNAPSHOT_DAY} of City Pulse Live, the swimlane looks busy and almost ready.
                The release machine re-plots the same rows by dependency depth so you can see which
                blocker still traps unfinished work — and which one is mostly theater.
              </p>
            </div>
            <div className="release-machine__hero-stat">
              <span>Snapshot</span>
              <strong>Day {SNAPSHOT_DAY}</strong>
              <small>{CITY_PULSE_TASKS.length} tasks · {LANES.length} lanes</small>
            </div>
          </header>

          <section className="release-machine__question">
            <span>One question</span>
            <h3>Which blocker prevents the most downstream work from becoming possible?</h3>
            <p>
              Amplification counts unfinished descendants and affected lanes. It does not forecast
              calendar days saved.
            </p>
          </section>

          <section className="release-machine__compare" aria-label="Blocker comparison">
            {BLOCKER_IDS.map((id) => {
              const task = machine.byID.get(id)
              const amp = amplifications[id]
              const active = selectedTaskID === id
              return (
                <button
                  key={id}
                  type="button"
                  className={active ? "is-active" : ""}
                  onClick={() => setSelectedTaskID(id)}
                >
                  <span>
                    {task.lane} · {Math.round(task.progress * 100)}% · blocked
                  </span>
                  <strong>{task.label ?? task.datum?.title ?? task.id}</strong>
                  <div className="release-machine__amp-tiles">
                    <BigNumber
                      value={amp.downstreamTaskCount}
                      label="Unfinished tasks"
                      format={(v) => String(v)}
                      mode="inline"
                      description={`${amp.downstreamTaskCount} unfinished downstream tasks`}
                    />
                    <BigNumber
                      value={amp.affectedLaneCount}
                      label="Affected lanes"
                      format={(v) => String(v)}
                      mode="inline"
                      description={`${amp.affectedLaneCount} lanes affected`}
                    />
                  </div>
                  <p>{task.blockerReason}</p>
                </button>
              )
            })}
          </section>

          <p className="release-machine__verdict" aria-live="polite">
            <strong>Verdict.</strong> Event-retention policy freezes{" "}
            <strong>{privacy.downstreamTaskCount} tasks</strong> across{" "}
            <strong>{privacy.affectedLaneCount} lanes</strong>. Launch illustration freezes only{" "}
            <strong>{heroArt.downstreamTaskCount}</strong> /{" "}
            <strong>{heroArt.affectedLaneCount}</strong>. Same progress bar; different leverage.
          </p>

          <section className="release-machine__view">
            <div className="release-machine__section-heading">
              <span>View 1 · schedule coordinate</span>
              <h3>The timeline says almost ready.</h3>
              <p>
                <code>intervalLanesLayout</code> packs the same rows by planned day. Both blockers
                look red and late.
              </p>
            </div>
            <ChartContainer
              title="City Pulse Live schedule"
              subtitle={`Planned intervals through snapshot day ${SNAPSHOT_DAY}`}
            >
              <OrdinalCustomChart
                data={CITY_PULSE_TASKS}
                layout={scheduleLayout}
                layoutConfig={scheduleConfig}
                categoryAccessor="lane"
                valueAccessor="startDay"
                oExtent={LANES}
                rExtent={[0, 18]}
                width={chartWidth}
                height={Math.max(320, LANES.length * 72 + 48)}
                chartId="release-swimlane"
                description="Project swimlane of City Pulse Live tasks by team and planned day"
                onObservation={(obs) => {
                  const d = obs?.datum
                  if (d?.id) setSelectedTaskID(d.id)
                }}
                tooltip={{
                  title: (d) => d.title,
                  fields: [
                    { field: "lane", label: "Lane" },
                    { field: "status", label: "Status" },
                    {
                      field: "progress",
                      label: "Progress",
                      format: (v) => `${Math.round(Number(v) * 100)}%`,
                    },
                    { field: "blockerReason", label: "Blocker" },
                  ],
                }}
              />
            </ChartContainer>
          </section>

          <section className="release-machine__bridge" aria-hidden>
            <div>
              <b>Swimlane</b>
              <strong>x = planned day</strong>
              <small>when & who</small>
            </div>
            <div className="release-machine__bridge-arrow">↓ same rows</div>
            <div>
              <b>Release machine</b>
              <strong>depth = dependency</strong>
              <small>what can propagate</small>
            </div>
          </section>

          <section className="release-machine__view">
            <div className="release-machine__section-heading">
              <span>View 2 · dependency coordinate</span>
              <h3>The machine stalls at a decision.</h3>
              <p>
                <strong>How to read it:</strong> columns are teams; rows go down as prerequisites
                deepen. Select a blocked task — everything it freezes stays bright (
                <em>↓ stuck</em>); the rest dims. Gold paths and balls are satisfied prerequisites
                moving to the next AND socket. A ball arriving does <em>not</em> finish the work —
                it only unlocks readiness.
              </p>
            </div>

            <div className="release-machine__controls" aria-label="Machine controls">
              <button
                type="button"
                onClick={() => {
                  setPlaying(true)
                  act(() => machineRef.current?.play())
                }}
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false)
                  act(() => machineRef.current?.pause())
                }}
              >
                Pause
              </button>
              <button type="button" onClick={() => act(() => machineRef.current?.step())}>
                Step
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false)
                  setPreviewTaskID(null)
                  act(() => machineRef.current?.reset())
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false)
                  act(() => machineRef.current?.settle())
                }}
              >
                Settle
              </button>
              {previewTaskID ? (
                <button
                  type="button"
                  className="is-preview"
                  onClick={() => {
                    setPreviewTaskID(null)
                    act(() => machineRef.current?.clearPreview())
                  }}
                >
                  Clear preview
                </button>
              ) : (
                <button
                  type="button"
                  className="is-preview"
                  disabled={!selectedTask.blockerReason}
                  onClick={() => {
                    setPreviewTaskID(selectedTask.id)
                    act(() => machineRef.current?.previewResolve(selectedTask.id))
                  }}
                >
                  Preview resolving “{selectedLabel.split(" ").slice(0, 3).join(" ")}…”
                </button>
              )}
              <span className="release-machine__status">
                {previewTaskID
                  ? `Preview: ${machine.byID.get(previewTaskID)?.label ?? previewTaskID}`
                  : playing
                    ? "Playing recorded completions"
                    : "Settled snapshot"}
              </span>
            </div>

            <ChartContainer
              title="Dependency enactment machine"
              subtitle="Logical task state with physics-guided prerequisite tokens"
              status={previewTaskID ? "paused" : playing ? "live" : "static"}
              height={machineHeight + 8}
            >
              <ChainReactionChart
                ref={machineRef}
                data={CITY_PULSE_TASKS}
                {...TASK_ACCESSORS}
                currentTime={SNAPSHOT_DAY}
                mechanism="domino-ball"
                orientation="vertical"
                mode="replay"
                insight="blocker-amplification"
                controls={false}
                selectedTaskIDs={[selectedTaskID]}
                onSelectionChange={(ids) => ids[0] && setSelectedTaskID(ids[0])}
                onObservation={handleObservation}
                reducedMotion={reducedMotion ? "settle" : undefined}
                seed={3800}
                width={chartWidth}
                height={machineHeight}
                title="City Pulse Live release machine"
                description="Twenty project tasks by team lane and dependency depth. Completed tiles tip logically; balls deliver prerequisites to AND sockets."
                accessibleTable
                enableHover
              />
            </ChartContainer>
          </section>

          <section className="release-machine__inspector" aria-live="polite">
            <div>
              <span className="release-machine__kicker">Selected task</span>
              <h3>{selectedLabel}</h3>
              <p>
                {selectedTask.blockerReason ??
                  `${selectedTask.status} · ${Math.round(selectedTask.progress * 100)}% complete`}
              </p>
            </div>
            <div className="release-machine__reach">
              <div>
                <strong>{selectedAmp.downstreamTaskCount}</strong>
                <span>unfinished descendants</span>
              </div>
              <div>
                <strong>{selectedAmp.affectedLaneCount}</strong>
                <span>affected lanes</span>
              </div>
              <p>{selectedAmp.affectedLanes?.join(" · ") || "No unfinished downstream lanes"}</p>
            </div>
            <div className="release-machine__events">
              <strong>Observations</strong>
              {events.length ? (
                events.map((event, index) => (
                  <code key={`${event.type}-${index}`}>{observationLabel(event)}</code>
                ))
              ) : (
                <span>Play or step the machine to collect task-level events.</span>
              )}
            </div>
          </section>

          <section className="release-machine__semantics">
            <div className="release-machine__section-heading">
              <span>Semantic contract</span>
              <h3>Physics enacts; logic owns the claim.</h3>
            </div>
            <div className="release-machine__semantic-grid">
              <article>
                <b>Task completion</b>
                <p>Recorded completedDay, push done, or an explicit mechanical completion.</p>
              </article>
              <article>
                <b>Ball delivery</b>
                <p>One prerequisite is satisfied. It does not mean the target work finished.</p>
              </article>
              <article>
                <b>AND socket</b>
                <p>Every incoming edge must arrive before the task arms.</p>
              </article>
              <article>
                <b>Visible brace</b>
                <p>Blocking is a readable pin — never hidden friction or mass.</p>
              </article>
            </div>
          </section>

          <section className="release-machine__table">
            <div className="release-machine__section-heading">
              <span>Static projection</span>
              <h3>The analysis survives without animation.</h3>
            </div>
            <div className="release-machine__table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Lane</th>
                    <th>Progress</th>
                    <th>State</th>
                    <th>Waiting on</th>
                    <th>Downstream reach</th>
                  </tr>
                </thead>
                <tbody>
                  {machine.nodes.map((task) => {
                    const amp = calculateBlockerAmplification(machine, task.id)
                    return (
                      <tr
                        key={task.id}
                        className={highlighted.has(task.id) ? "is-highlighted" : ""}
                      >
                        <th scope="row">
                          <button type="button" onClick={() => setSelectedTaskID(task.id)}>
                            {task.label}
                          </button>
                        </th>
                        <td>{task.lane}</td>
                        <td>{Math.round(task.progress * 100)}%</td>
                        <td>{task.status}</td>
                        <td>
                          {task.blockerReason ??
                            (task.dependencyIDs.join(", ") || "None")}
                        </td>
                        <td>
                          {amp.downstreamTaskCount} tasks / {amp.affectedLaneCount} lanes
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="release-machine__method">
            <div>
              <span className="release-machine__kicker">Information engine</span>
              <h3>Compile the graph once; project it twice.</h3>
              <p>
                <code>compileDependencyMachine</code> and{" "}
                <code>calculateBlockerAmplification</code> are pure. The schedule uses{" "}
                <code>intervalLanesLayout</code>; the machine is <code>ChainReactionChart</code>. Same
                accessors, different coordinate system — that is the whole move.
              </p>
            </div>
            <CodeBlock language="jsx" code={implementationCode} showCopyButton />
          </section>
        </div>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}

function observationLabel(event) {
  if (event.type === "machine-stalled") {
    return `${event.blockerID}: stalls ${event.downstreamTaskCount} tasks / ${event.affectedLaneCount} lanes`
  }
  if (event.type === "dependency-delivered") {
    return `${event.sourceID} → ${event.targetID}: prerequisite delivered`
  }
  if (event.type === "task-armed") return `${event.taskID}: armed`
  if (event.type === "task-completed") return `${event.taskID}: completed`
  if (event.type === "blocker-previewed") return `${event.blockerID}: preview opened`
  if (event.type === "machine-settled") return "machine settled"
  return event.type
}
