import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChartContainer } from "semiotic"
import {
  ChainReactionChart,
  calculateBlockerAmplification,
  compileDependencyMachine,
} from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PhysicsArcStatus,
  usePhysicsExampleConversationArc,
} from "./PhysicsExampleConversationArc"
import "./ChainReactionExamplePage.css"

const SNAPSHOT_DAY = 11
const LANES = ["Product", "Data", "Frontend", "Quality", "Launch"]

const CITY_PULSE_TASKS = [
  { id: "brief", title: "Approve product brief", lane: "Product", startDay: 0, endDay: 1, progress: 1, status: "done", dependsOn: [], completedDay: 1 },
  { id: "interaction-spec", title: "Finalize interaction specification", lane: "Product", startDay: 1, endDay: 3, progress: 1, status: "done", dependsOn: ["brief"], completedDay: 3 },
  { id: "privacy-approval", title: "Approve event-retention policy", lane: "Product", startDay: 2, endDay: 5, progress: 0.9, status: "blocked", dependsOn: ["brief"], blockerReason: "Legal decision on 30-day event retention" },
  { id: "sample-fixture", title: "Build representative event fixture", lane: "Data", startDay: 1, endDay: 2, progress: 1, status: "done", dependsOn: ["brief"], completedDay: 2 },
  { id: "event-schema", title: "Finalize event schema", lane: "Data", startDay: 3, endDay: 6, progress: 0.25, status: "waiting", dependsOn: ["privacy-approval", "sample-fixture"] },
  { id: "stream-ingest", title: "Implement streaming ingest", lane: "Data", startDay: 6, endDay: 9, progress: 0, status: "waiting", dependsOn: ["event-schema"] },
  { id: "aggregate-api", title: "Implement aggregation API", lane: "Data", startDay: 6, endDay: 9, progress: 0.1, status: "waiting", dependsOn: ["event-schema"] },
  { id: "app-shell", title: "Build dashboard shell", lane: "Frontend", startDay: 2, endDay: 4, progress: 1, status: "done", dependsOn: ["interaction-spec"], completedDay: 4 },
  { id: "static-view", title: "Build static dashboard view", lane: "Frontend", startDay: 4, endDay: 7, progress: 1, status: "done", dependsOn: ["app-shell", "sample-fixture"], completedDay: 7 },
  { id: "replay-controls", title: "Add replay and pause controls", lane: "Frontend", startDay: 7, endDay: 11, progress: 0.7, status: "in-progress", dependsOn: ["static-view"] },
  { id: "live-binding", title: "Connect the live event stream", lane: "Frontend", startDay: 8, endDay: 12, progress: 0.15, status: "waiting", dependsOn: ["stream-ingest", "aggregate-api"] },
  { id: "keyboard-nav", title: "Implement keyboard navigation", lane: "Quality", startDay: 7, endDay: 11, progress: 0.6, status: "in-progress", dependsOn: ["static-view"] },
  { id: "ssr-settle", title: "Validate settled SSR rendering", lane: "Quality", startDay: 7, endDay: 10, progress: 0.8, status: "in-progress", dependsOn: ["static-view"] },
  { id: "threat-model", title: "Complete security threat model", lane: "Quality", startDay: 6, endDay: 9, progress: 0.1, status: "waiting", dependsOn: ["privacy-approval", "event-schema"] },
  { id: "load-test", title: "Run live-stream load test", lane: "Quality", startDay: 12, endDay: 14, progress: 0, status: "waiting", dependsOn: ["live-binding"] },
  { id: "docs-copy", title: "Finalize documentation copy", lane: "Launch", startDay: 6, endDay: 11, progress: 0.45, status: "waiting", dependsOn: ["interaction-spec", "event-schema"] },
  { id: "hero-art", title: "Finish launch illustration", lane: "Launch", startDay: 4, endDay: 8, progress: 0.9, status: "blocked", dependsOn: ["interaction-spec"], blockerReason: "Asset license has not been cleared" },
  { id: "social-card", title: "Produce social preview card", lane: "Launch", startDay: 8, endDay: 9, progress: 0, status: "waiting", dependsOn: ["hero-art"] },
  { id: "release-candidate", title: "Cut release candidate", lane: "Launch", startDay: 14, endDay: 16, progress: 0, status: "waiting", dependsOn: ["live-binding", "keyboard-nav", "ssr-settle", "threat-model", "load-test", "docs-copy"] },
  { id: "launch", title: "Launch City Pulse Live", lane: "Launch", startDay: 17, endDay: 17, progress: 0, status: "waiting", dependsOn: ["release-candidate", "social-card"], milestone: true },
]

const COMMON_TASK_PROPS = {
  data: CITY_PULSE_TASKS,
  taskIDAccessor: "id",
  labelAccessor: "title",
  laneAccessor: "lane",
  startAccessor: "startDay",
  endAccessor: "endDay",
  progressAccessor: "progress",
  statusAccessor: "status",
  dependencyAccessor: "dependsOn",
  completionTimeAccessor: "completedDay",
  blockerAccessor: "blockerReason",
  milestoneAccessor: "milestone",
}

const implementationCode = `const commonTaskProps = {
  data: cityPulseTasks,
  taskIDAccessor: "id",
  labelAccessor: "title",
  laneAccessor: "lane",
  startAccessor: "startDay",
  endAccessor: "endDay",
  progressAccessor: "progress",
  statusAccessor: "status",
  dependencyAccessor: "dependsOn",
  completionTimeAccessor: "completedDay",
  blockerAccessor: "blockerReason",
}

<ProjectSwimlane {...commonTaskProps} currentTime={11} />

<ChainReactionChart
  {...commonTaskProps}
  currentTime={11}
  mechanism="domino-ball"
  orientation="vertical"
  mode="replay"
  insight="blocker-amplification"
/>

// A preview changes mechanical state, never supplied data.
machineRef.current.previewResolve("privacy-approval")`

export default function ChainReactionExamplePage() {
  const hostRef = useRef(null)
  const machineRef = useRef(null)
  const [width, setWidth] = useState(980)
  const [selectedTaskID, setSelectedTaskID] = useState("privacy-approval")
  const [previewTaskID, setPreviewTaskID] = useState(null)
  const [events, setEvents] = useState([])
  const reducedMotion = useReducedMotion()
  const machine = useMemo(
    () => compileDependencyMachine({ ...COMMON_TASK_PROPS, laneOrder: LANES }),
    [],
  )
  const amplifications = useMemo(
    () =>
      Object.fromEntries(
        ["privacy-approval", "hero-art"].map((id) => [
          id,
          calculateBlockerAmplification(machine, id),
        ]),
      ),
    [machine],
  )
  const selectedTask = machine.byID.get(selectedTaskID) ?? machine.byID.get("privacy-approval")
  const selectedAmplification = calculateBlockerAmplification(machine, selectedTask.id)
  const highlighted = new Set([selectedTask.id, ...selectedAmplification.downstreamTaskIDs])
  const arc = usePhysicsExampleConversationArc({
    sessionId: "physics-chain-reaction-example",
    arcId: "physics-release-machine",
    component: "ChainReactionChart",
    chartId: "city-pulse-release-machine",
  })
  const recordArcEdit = arc.recordEdit
  const recordArcRendered = arc.recordRendered

  useEffect(() => {
    if (!hostRef.current || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, Math.floor(entry.contentRect.width)))
    })
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    recordArcRendered({
      snapshotDay: SNAPSHOT_DAY,
      taskCount: CITY_PULSE_TASKS.length,
      blockerCount: 2,
      topBlocker: "privacy-approval",
      downstreamTaskCount: amplifications["privacy-approval"].downstreamTaskCount,
      affectedLaneCount: amplifications["privacy-approval"].affectedLaneCount,
    })
  }, [amplifications, recordArcRendered])

  const chartWidth = Math.max(320, Math.min(1040, width))
  const machineHeight = chartWidth < 620 ? 1050 : 880
  const handleObservation = useCallback(
    (event) => {
      setEvents((current) => [...current.slice(-5), event])
      if (event.taskID) setSelectedTaskID(event.taskID)
    },
    [],
  )
  const act = (action, callback, meta = {}) => {
    recordArcEdit(["machine", action], { action, ...meta })
    callback?.()
  }
  const previewResolution = (taskID) => {
    setSelectedTaskID(taskID)
    setPreviewTaskID(taskID)
    act("previewResolve", () => machineRef.current?.previewResolve(taskID), { taskID })
  }
  const clearPreview = () => {
    setPreviewTaskID(null)
    act("clearPreview", () => machineRef.current?.clearPreview())
  }

  return (
    <ExamplePageLayout title="The Release Machine">
      <div className="release-machine">
        <section className="release-machine__hero">
          <div>
            <span className="release-machine__kicker">Physics as dependency enactment</span>
            <p>
              City Pulse Live has two blockers. Both are 90% complete and both are late. One holds
              a local launch asset; the other prevents nine unfinished tasks across four teams
              from becoming possible.
            </p>
          </div>
          <div className="release-machine__hero-stat">
            <span>Snapshot</span><strong>Day {SNAPSHOT_DAY}</strong><small>20 tasks / 5 work lanes</small>
          </div>
          <PhysicsArcStatus arc={arc} label="Machine story arc" />
        </section>

        <section className="release-machine__question">
          <span>One analytical question</span>
          <h2>Which blocker prevents the most downstream work from becoming possible?</h2>
          <p>Blocker amplification counts unfinished work reachable from a blocker. It does not estimate days saved or predict a launch date.</p>
        </section>

        <section className="release-machine__comparison" aria-label="Blocker amplification comparison">
          {["privacy-approval", "hero-art"].map((taskID) => {
            const task = machine.byID.get(taskID)
            const amplification = amplifications[taskID]
            const active = selectedTaskID === taskID
            return (
              <button key={taskID} type="button" className={active ? "is-active" : ""} onClick={() => setSelectedTaskID(taskID)}>
                <span>{task.lane} blocker / {Math.round(task.progress * 100)}% complete</span>
                <strong>{task.label}</strong>
                <div><b>{amplification.downstreamTaskCount}</b><small>unfinished tasks</small><b>{amplification.affectedLaneCount}</b><small>affected lanes</small></div>
                <p>{task.blockerReason}</p>
              </button>
            )
          })}
        </section>

        <section className="release-machine__view" aria-labelledby="release-timeline-title">
          <div className="release-machine__section-heading">
            <span>View 1 / temporal position</span>
            <h2 id="release-timeline-title">The schedule looks busy and nearly ready.</h2>
            <p>Precise dates, duration, progress, and team ownership belong to the conventional interval swimlane.</p>
          </div>
          <ChartContainer
            title="City Pulse Live project swimlane"
            subtitle={`Planned task intervals through snapshot day ${SNAPSHOT_DAY}`}
            height={560}
            actions={{ fullscreen: true, export: true }}
          >
            <ProjectSwimlane
              {...COMMON_TASK_PROPS}
              width={chartWidth}
              height={500}
              currentTime={SNAPSHOT_DAY}
              selectedTaskID={selectedTaskID}
              highlighted={highlighted}
              onSelect={setSelectedTaskID}
            />
          </ChartContainer>
        </section>

        <section className="release-machine__bridge">
          <span>Same rows, different coordinate system</span>
          <div><b>Swimlane</b><strong>x = planned day</strong><small>answers when and who</small></div>
          <div><b>Release machine</b><strong>y = dependency depth</strong><small>answers what can propagate</small></div>
        </section>

        <section ref={hostRef} className="release-machine__view" aria-labelledby="release-machine-title">
          <div className="release-machine__section-heading">
            <span>View 2 / dependency position</span>
            <h2 id="release-machine-title">The machine stalls at a decision.</h2>
            <p>Task tiles tip only for recorded or explicit completion. A ball means one prerequisite was delivered; it never completes downstream work.</p>
          </div>

          <div className="release-machine__controls" aria-label="Release machine controls">
            <button type="button" onClick={() => act("play", () => machineRef.current?.play())}>Play</button>
            <button type="button" onClick={() => act("pause", () => machineRef.current?.pause())}>Pause</button>
            <button type="button" onClick={() => act("step", () => machineRef.current?.step())}>Step</button>
            <button type="button" onClick={() => act("reset", () => machineRef.current?.reset())}>Reset</button>
            <button type="button" onClick={() => act("settle", () => machineRef.current?.settle())}>Settle</button>
            {previewTaskID ? (
              <button type="button" className="is-preview" onClick={clearPreview}>Clear preview</button>
            ) : (
              <button type="button" className="is-preview" onClick={() => previewResolution(selectedTaskID)} disabled={!selectedTask.blockerReason}>Preview resolution</button>
            )}
            <span>{previewTaskID ? `Mechanical preview: ${machine.byID.get(previewTaskID)?.label}` : "Recorded replay mode"}</span>
          </div>

          <ChartContainer
            title="Dependency enactment machine"
            subtitle="Logical task transitions with physics-guided prerequisite tokens"
            status={previewTaskID ? "preview" : "live"}
            height={machineHeight + 160}
            actions={{ fullscreen: true, export: true }}
          >
            <ChainReactionChart
              ref={machineRef}
              {...COMMON_TASK_PROPS}
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
              description="Twenty project tasks arranged by team lane and longest dependency depth. Completed task tiles are tipped logically; physical balls deliver satisfied prerequisites to AND sockets."
              accessibleTable
              enableHover
            />
          </ChartContainer>
        </section>

        <section className="release-machine__inspector" aria-live="polite">
          <div>
            <span className="release-machine__kicker">Selected task</span>
            <h2>{selectedTask.label}</h2>
            <p>{selectedTask.blockerReason ?? `${selectedTask.status}; ${Math.round(selectedTask.progress * 100)}% complete.`}</p>
          </div>
          <div className="release-machine__reach">
            <div><strong>{selectedAmplification.downstreamTaskCount}</strong><span>unfinished descendants</span></div>
            <div><strong>{selectedAmplification.affectedLaneCount}</strong><span>affected lanes</span></div>
            <p>{selectedAmplification.affectedLanes.join(" / ") || "No unfinished downstream lanes"}</p>
          </div>
          <div className="release-machine__events">
            <strong>Semantic observations</strong>
            {events.length ? events.map((event, index) => <code key={`${event.type}-${index}`}>{observationLabel(event)}</code>) : <span>Play or step the machine to collect task-level events.</span>}
          </div>
        </section>

        <section className="release-machine__semantics" aria-labelledby="release-semantics-title">
          <div className="release-machine__section-heading">
            <span>Semantic contract</span>
            <h2 id="release-semantics-title">Physics performs the enactment; chart logic preserves the claim.</h2>
          </div>
          <div>
            <article><b>Task completion</b><p>Recorded <code>completedDay</code>, pushed done state, or a clearly labelled mechanical completion.</p></article>
            <article><b>Ball delivery</b><p>One prerequisite became satisfied. It does not mean the target work happened.</p></article>
            <article><b>AND socket</b><p>Every incoming edge must be delivered before the task becomes armed.</p></article>
            <article><b>Visible brace</b><p>Blocking is a readable pin, never hidden friction, mass, or restitution.</p></article>
          </div>
        </section>

        <section className="release-machine__table" aria-labelledby="release-table-title">
          <div className="release-machine__section-heading">
            <span>Accessible static projection</span>
            <h2 id="release-table-title">The analysis survives without animation.</h2>
          </div>
          <div><table><thead><tr><th>Task</th><th>Lane</th><th>Progress</th><th>State</th><th>Waiting on</th><th>Downstream reach</th></tr></thead><tbody>{machine.nodes.map((task) => {
            const amplification = calculateBlockerAmplification(machine, task.id)
            return <tr key={task.id} className={highlighted.has(task.id) ? "is-highlighted" : ""}><th scope="row"><button type="button" onClick={() => setSelectedTaskID(task.id)}>{task.label}</button></th><td>{task.lane}</td><td>{Math.round(task.progress * 100)}%</td><td>{task.status}</td><td>{task.blockerReason ?? (task.dependencyIDs.join(", ") || "None")}</td><td>{amplification.downstreamTaskCount} tasks / {amplification.affectedLaneCount} lanes</td></tr>
          })}</tbody></table></div>
        </section>

        <section className="release-machine__method">
          <div>
            <span className="release-machine__kicker">Shared functionality</span>
            <h2>The machine is compiled from a dependency graph.</h2>
            <p>
              The chart extracts DAG validation, longest-path levels, lane placement, socket IDs,
              point-based track routes, logical joins, replay folding, and blocker amplification.
              The kernel has no angular dynamics, so task tipping remains honest logical rendering;
              <code> StreamPhysicsFrame</code> owns the dependency-token motion and settling.
            </p>
          </div>
          <CodeBlock language="jsx" code={implementationCode} showCopyButton />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function ProjectSwimlane({ data, width, height, currentTime, selectedTaskID, highlighted, onSelect }) {
  const margin = { top: 34, right: 20, bottom: 32, left: width < 600 ? 76 : 112 }
  const plotWidth = width - margin.left - margin.right
  const laneHeight = (height - margin.top - margin.bottom) / LANES.length
  const dayX = (day) => margin.left + (Number(day) / 17) * plotWidth
  return (
    <svg className="release-machine__swimlane" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="City Pulse Live interval swimlane through project day 11">
      <rect width={width} height={height} fill="#f5f0e5" />
      {Array.from({ length: 18 }, (_, day) => <g key={day}><line x1={dayX(day)} x2={dayX(day)} y1={margin.top} y2={height - margin.bottom} stroke={day === currentTime ? "#b24f42" : "#7a817b"} strokeWidth={day === currentTime ? 2 : 1} opacity={day === currentTime ? 0.9 : 0.16} /><text x={dayX(day)} y={height - 12} textAnchor="middle" fontSize="8" fill="#69736c">{day}</text></g>)}
      {LANES.map((lane, laneIndex) => {
        const laneTasks = data.filter((task) => task.lane === lane)
        const y0 = margin.top + laneIndex * laneHeight
        return <g key={lane}><rect x="0" y={y0} width={width} height={laneHeight} fill={laneIndex % 2 ? "#ffffff" : "#ebeadf"} opacity="0.42" /><text x={margin.left - 8} y={y0 + 15} textAnchor="end" fontSize={width < 600 ? "8" : "10"} fontWeight="800" fill="#354c40">{lane}</text>{laneTasks.map((task, taskIndex) => {
          const start = dayX(task.startDay)
          const end = dayX(Math.max(task.startDay + 0.45, task.endDay))
          const y = y0 + 22 + (taskIndex % 3) * Math.max(14, (laneHeight - 30) / 3)
          const taskWidth = Math.max(8, end - start)
          const active = task.id === selectedTaskID
          const related = highlighted.has(task.id)
          const fill = task.status === "blocked" ? "#b45143" : task.status === "done" ? "#4f7767" : task.status === "in-progress" ? "#c5963d" : "#a8aca4"
          return <g key={task.id} className="release-machine__timeline-task" onClick={() => onSelect(task.id)} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(task.id) }}><title>{task.title}. {Math.round(task.progress * 100)}% complete. {task.status}.</title><rect x={start} y={y} width={taskWidth} height="11" rx="2" fill="#d8d8cf" stroke={active ? "#192b23" : related ? "#b45143" : "#747b75"} strokeWidth={active ? 2.5 : related ? 1.8 : 0.7} /><rect x={start} y={y} width={taskWidth * task.progress} height="11" rx="2" fill={fill} />{task.blockerReason ? <path d={`M${end - 4},${y - 3} l7,17 M${end + 3},${y - 3} l-7,17`} stroke="#7f3029" strokeWidth="2" /> : null}{taskWidth > 58 ? <text x={start + 4} y={y + 8.2} fontSize="7" fill={task.progress > 0.55 ? "#fff" : "#26382f"}>{truncate(task.title, 22)}</text> : null}</g>
        })}</g>
      })}
      <text x={dayX(currentTime) + 5} y="22" fill="#a43e34" fontSize="9" fontWeight="800">SNAPSHOT DAY {currentTime}</text>
    </svg>
  )
}

function observationLabel(event) {
  if (event.type === "machine-stalled") return `${event.blockerID}: stalled ${event.downstreamTaskCount} tasks / ${event.affectedLaneCount} lanes`
  if (event.type === "dependency-delivered") return `${event.sourceID} -> ${event.targetID}: prerequisite delivered`
  if (event.type === "task-armed") return `${event.taskID}: all prerequisites delivered`
  if (event.type === "task-completed") return `${event.taskID}: recorded completion`
  if (event.type === "blocker-previewed") return `${event.blockerID}: mechanical preview opened`
  return event.type
}

function truncate(value, length) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}...`
}

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
