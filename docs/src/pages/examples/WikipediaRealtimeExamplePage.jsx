import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  RealtimeHeatmap,
  RealtimeHistogram,
  RealtimeLineChart,
  RealtimeSwarmChart,
  ThemeProvider,
  useSyncedPushData,
} from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./WikipediaRealtimeExamplePage.css"

const STREAM_URL = "https://stream.wikimedia.org/v2/stream/recentchange"
const USERS_API = "https://en.wikipedia.org/w/api.php"
const MAX_EVENTS = 600
const CHART_BUFFER_SIZE = MAX_EVENTS * 2
const MAGNITUDE_STEPS = [0, 10, 50, 250, 1000]
const GROUPS = ["administrator", "registered", "bot", "anonymous"]

const GROUP_META = {
  administrator: {
    label: "Administrators",
    shortLabel: "Admin",
    description: "Local sysops, resolved through the users API",
    fill: "#f4bf4f",
    stroke: "#6f3b00",
    strokeWidth: 2.2,
  },
  registered: {
    label: "Registered users",
    shortLabel: "Registered",
    description: "Signed-in editors without the sysop group",
    fill: "#55c2e8",
    stroke: "#07566f",
    strokeWidth: 1.2,
  },
  bot: {
    label: "Bots",
    shortLabel: "Bot",
    description: "Edits flagged as automated by MediaWiki",
    fill: "#a7d46f",
    stroke: "#284e16",
    strokeWidth: 2,
  },
  anonymous: {
    label: "Anonymous users",
    shortLabel: "Anonymous",
    description: "IP and temporary-account edits",
    fill: "#c19bea",
    stroke: "#553078",
    strokeWidth: 1.2,
  },
  other: {
    label: "Other",
    shortLabel: "Other",
    description: "Events without a classifiable editor",
    fill: "#9ca3af",
    stroke: "#374151",
    strokeWidth: 1,
  },
}

const DEFAULT_FILTERS = {
  actor: "all",
  direction: "all",
  magnitudeStep: 0,
  namespace: "all",
  query: "",
  includeMinor: true,
  windowSize: 240,
}

const QUESTION_PRESETS = [
  {
    id: "large-human-deletions",
    label: "Large human deletions",
    prompt: "Who is removing 250+ characters?",
    filters: { actor: "human", direction: "remove", magnitudeStep: 3 },
  },
  {
    id: "bot-additions",
    label: "Bot additions",
    prompt: "Where are bots adding material?",
    filters: { actor: "bot", direction: "add", magnitudeStep: 1 },
  },
  {
    id: "talk-pages",
    label: "Talk pages",
    prompt: "What is being debated right now?",
    filters: { namespace: "talk", magnitudeStep: 0 },
  },
  {
    id: "outliers",
    label: "Outlier watch",
    prompt: "Show edits moving 1,000+ characters.",
    filters: { magnitudeStep: 4, direction: "all" },
  },
]

const implementationCode = `const stream = new EventSource(
  "https://stream.wikimedia.org/v2/stream/recentchange"
)

const swarmRef = useRef(null)

stream.onmessage = ({ data }) => {
  const change = JSON.parse(data)
  if (change.server_name !== "en.wikipedia.org") return
  if (!["edit", "new"].includes(change.type)) return

  const delta = (change.length?.new ?? 0) - (change.length?.old ?? 0)
  setEdits(current => [...current, {
    id: change.meta.id,
    time: Date.parse(change.meta.dt),
    magnitude: Math.abs(delta),
    delta,
    group: classifyEditor(change)
  }].slice(-600))
}

useSyncedPushData(swarmRef, visibleEdits, { id: "id" })

<RealtimeSwarmChart
  ref={swarmRef}
  timeAccessor="time"
  valueAccessor="delta"
  yScaleType="symlog"
  categoryAccessor="group"
  colors={groupColors}
  pointStyle={edit => ({
    stroke: actorStyles[edit.group].stroke,
    strokeWidth: actorStyles[edit.group].strokeWidth,
    r: edit.minor ? 3 : 4
  })}
  pointIdAccessor="id"
  enableHover
/>`

export default function WikipediaRealtimeExamplePage() {
  const [paused, setPaused] = useState(false)
  const { edits, status, totalReceived } = useWikipediaEditStream(paused)
  const mainSwarmRef = useRef(null)
  const histogramRef = useRef(null)
  const heatmapRef = useRef(null)
  const lineRef = useRef(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [activePreset, setActivePreset] = useState(null)
  const [hoveredEdit, setHoveredEdit] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(900, 1132)
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  const windowedEdits = useMemo(() => edits.slice(-filters.windowSize), [edits, filters.windowSize])

  const visibleEdits = useMemo(
    () => windowedEdits.filter((edit) => editMatchesFilters(edit, filters)),
    [windowedEdits, filters],
  )

  const actorCounts = useMemo(() => {
    const counts = Object.fromEntries([...GROUPS, "other"].map((group) => [group, 0]))
    visibleEdits.forEach((edit) => {
      counts[edit.group] = (counts[edit.group] || 0) + 1
    })
    return counts
  }, [visibleEdits])

  const stats = useMemo(() => summarizeEdits(visibleEdits, edits), [visibleEdits, edits])
  const timeExtent = useMemo(() => sharedTimeExtent(windowedEdits), [windowedEdits])
  const maxMagnitude = useMemo(
    () => Math.max(50, ...visibleEdits.map((edit) => edit.magnitude)),
    [visibleEdits],
  )
  const magnitudeExtent = useMemo(() => [0, maxMagnitude], [maxMagnitude])
  const signedExtent = useMemo(() => [-maxMagnitude, maxMagnitude], [maxMagnitude])
  const netFlow = useMemo(
    () => aggregateNetFlow(visibleEdits, timeExtent),
    [visibleEdits, timeExtent],
  )
  const outOfOrderEdits = useMemo(
    () => visibleEdits.filter((edit) => edit.outOfOrder),
    [visibleEdits],
  )
  const outOfOrderAnnotations = useMemo(() => {
    const latest = outOfOrderEdits[outOfOrderEdits.length - 1]
    if (!latest) return []
    return [
      {
        type: "callout",
        pointId: latest.id,
        label: `Out of order · ${formatDuration(latest.arrivalLagMs)} late`,
        radius: 13,
        dx: 46,
        dy: -36,
        color: "#ff4fd8",
        connector: { end: "arrow" },
      },
    ]
  }, [outOfOrderEdits])
  const groupData = useMemo(
    () =>
      Object.fromEntries(
        GROUPS.map((group) => [group, visibleEdits.filter((edit) => edit.group === group)]),
      ),
    [visibleEdits],
  )

  const latestVisible = visibleEdits[visibleEdits.length - 1]
  const inspectedEdit = hoveredEdit || selectedEdit || latestVisible || null
  const groupCardWidth = (chartWidth - 18) / 2
  const groupChartWidth = groupCardWidth - 36
  const mainChartWidth = chartWidth - 48
  const summaryChartWidth = groupChartWidth
  const filteredCount = Math.max(0, windowedEdits.length - visibleEdits.length)

  useSyncedPushData(mainSwarmRef, visibleEdits, { id: "id" })
  useSyncedPushData(histogramRef, visibleEdits, { id: "id" })
  useSyncedPushData(heatmapRef, visibleEdits, { id: "id" })
  useSyncedPushData(lineRef, netFlow, { id: "id" })

  const handleChartHover = useCallback((hover) => {
    setHoveredEdit(hover?.data || null)
  }, [])

  const patchFilters = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }))
    setActivePreset(null)
  }, [])

  const applyPreset = useCallback((preset) => {
    setFilters({ ...DEFAULT_FILTERS, ...preset.filters })
    setActivePreset(preset.id)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setActivePreset(null)
  }, [])

  return (
    <ExamplePageLayout title="Wikipedia, as it happens">
      <p className="wiki-realtime-lede">
        Every dot is a live edit to English Wikipedia. Time moves left to right; the overview plots
        signed character change above and below zero. It keeps editor identity in fill and outline,
        while the four small multiples use absolute magnitude and recode direction: green adds text,
        red removes it.
      </p>

      <div className="wiki-realtime-status-strip" aria-label="Live stream status">
        <StatusCell
          value={<StreamStatus status={status} />}
          label={paused ? "stream held locally" : "Wikimedia EventStreams"}
        />
        <StatusCell value={stats.rate} label="edits / minute" />
        <StatusCell value={formatSigned(stats.netCharacters)} label="net characters in view" />
        <StatusCell value={stats.uniqueEditors} label="editors in view" />
        <StatusCell value={outOfOrderEdits.length} label="out-of-order in view" />
        <StatusCell value={formatCompact(totalReceived)} label="received this session" />
      </div>

      <section className="wiki-realtime-control-deck" aria-label="Wikipedia edit filters">
        <div className="wiki-realtime-control-heading">
          <div>
            <span className="wiki-realtime-kicker">Ask the stream</span>
            <h2>Choose which edits to follow</h2>
          </div>
          <div className="wiki-realtime-stream-actions">
            <button
              type="button"
              className={`wiki-realtime-pause ${paused ? "is-paused" : ""}`}
              onClick={() => setPaused((current) => !current)}
              aria-pressed={paused}
            >
              <span className="wiki-realtime-pause-icon" aria-hidden="true">
                {paused ? "▶" : "Ⅱ"}
              </span>
              {paused ? "Resume stream" : "Hold stream"}
            </button>
            <button type="button" className="wiki-realtime-reset" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </div>

        <div className="wiki-realtime-presets">
          {QUESTION_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={activePreset === preset.id ? "is-active" : ""}
              onClick={() => applyPreset(preset)}
              title={preset.prompt}
            >
              <span>{preset.label}</span>
              <small>{preset.prompt}</small>
            </button>
          ))}
        </div>

        <div className="wiki-realtime-controls">
          <Control label="Editor">
            <select
              value={filters.actor}
              onChange={(event) => patchFilters({ actor: event.target.value })}
            >
              <option value="all">Everyone</option>
              <option value="human">All humans</option>
              <option value="administrator">Administrators</option>
              <option value="registered">Registered users</option>
              <option value="anonymous">Anonymous users</option>
              <option value="bot">Bots</option>
              <option value="other">Other</option>
            </select>
          </Control>
          <Control label="Direction">
            <select
              value={filters.direction}
              onChange={(event) => patchFilters({ direction: event.target.value })}
            >
              <option value="all">Additions + removals</option>
              <option value="add">Additions only</option>
              <option value="remove">Removals only</option>
              <option value="neutral">No net change</option>
            </select>
          </Control>
          <Control label="Namespace">
            <select
              value={filters.namespace}
              onChange={(event) => patchFilters({ namespace: event.target.value })}
            >
              <option value="all">All namespaces</option>
              <option value="article">Articles only</option>
              <option value="talk">Talk namespaces</option>
              <option value="project">Project + utility</option>
            </select>
          </Control>
          <Control label="Visible window">
            <select
              value={filters.windowSize}
              onChange={(event) => patchFilters({ windowSize: Number(event.target.value) })}
            >
              <option value={120}>120 edits</option>
              <option value={240}>240 edits</option>
              <option value={480}>480 edits</option>
            </select>
          </Control>
          <Control
            label={`Minimum change · ${formatMagnitude(MAGNITUDE_STEPS[filters.magnitudeStep])}`}
          >
            <input
              type="range"
              min="0"
              max={MAGNITUDE_STEPS.length - 1}
              step="1"
              value={filters.magnitudeStep}
              onChange={(event) => patchFilters({ magnitudeStep: Number(event.target.value) })}
            />
          </Control>
          <Control label="Page or editor">
            <input
              type="search"
              value={filters.query}
              placeholder="Filter the live window"
              onChange={(event) => patchFilters({ query: event.target.value })}
            />
          </Control>
          <label className="wiki-realtime-checkbox">
            <input
              type="checkbox"
              checked={filters.includeMinor}
              onChange={(event) => patchFilters({ includeMinor: event.target.checked })}
            />
            <span>Include minor edits</span>
          </label>
        </div>

        <div className="wiki-realtime-filter-result" aria-live="polite">
          <strong>{visibleEdits.length}</strong> edits answer the current question
          {filteredCount > 0 && <span> · {filteredCount} filtered from the visible window</span>}
        </div>
      </section>

      <ThemeProvider theme={carbonTheme}>
        <div ref={chartHostRef} className="wiki-realtime-scroller">
          <div className="wiki-realtime-dashboard" style={{ width: chartWidth }}>
            <section className="wiki-realtime-main-panel">
              <ChartHeading
                kicker="All editors · signed symlog scale"
                title="The edit stream"
                note="Hover a dot to inspect it"
              />
              <RealtimeSwarmChart
                ref={mainSwarmRef}
                size={[mainChartWidth, 360]}
                margin={{ top: 18, right: 18, bottom: 34, left: 58 }}
                timeAccessor="time"
                valueAccessor="delta"
                windowSize={CHART_BUFFER_SIZE}
                timeExtent={timeExtent}
                valueExtent={signedExtent}
                yScaleType="symlog"
                categoryAccessor="group"
                colors={groupColors()}
                pointStyle={actorPointStyle}
                pointIdAccessor="id"
                enableHover={{ crosshair: true }}
                onHover={handleChartHover}
                tooltipContent={renderEditTooltip}
                annotations={outOfOrderAnnotations}
                tickFormatTime={formatTime}
                tickFormatValue={formatSigned}
                emptyContent={false}
                background="transparent"
                description="Live swarm of Wikipedia edits: each point is one edit, placed by arrival time and signed character change, colored by editor class."
                summary="Points above the midline added text; points below removed it. Out-of-order arrivals are ringed and annotated."
              />
              <ActorLegend
                counts={actorCounts}
                active={filters.actor}
                onSelect={(actor) =>
                  patchFilters({ actor: filters.actor === actor ? "all" : actor })
                }
              />
              <OutOfOrderKey count={outOfOrderEdits.length} />
            </section>

            <section className="wiki-realtime-inspector" aria-live="polite">
              <Inspector edit={inspectedEdit} />
            </section>

            <div className="wiki-realtime-small-multiples">
              {GROUPS.map((group) => (
                <SwarmCard
                  key={group}
                  group={group}
                  data={groupData[group]}
                  width={groupChartWidth}
                  timeExtent={timeExtent}
                  valueExtent={magnitudeExtent}
                  onHover={handleChartHover}
                />
              ))}
            </div>

            <section className="wiki-realtime-summary-section">
              <div className="wiki-realtime-section-heading">
                <span className="wiki-realtime-kicker">The same buffer, aggregated</span>
                <h2>Shape of the current window</h2>
                <p>
                  Raw edits remain available for inspection while Semiotic derives temporal volume,
                  magnitude density, and signed character flow.
                </p>
              </div>

              <div className="wiki-realtime-summary-grid">
                <SummaryCard title="Edit volume" note="10-second bins · stacked by editor class">
                  <RealtimeHistogram
                    ref={histogramRef}
                    size={[summaryChartWidth, 240]}
                    margin={{ top: 12, right: 14, bottom: 34, left: 45 }}
                    binSize={10000}
                    timeAccessor="time"
                    valueAccessor={() => 1}
                    windowSize={CHART_BUFFER_SIZE}
                    timeExtent={timeExtent}
                    categoryAccessor="group"
                    pointIdAccessor="id"
                    colors={groupColors()}
                    gap={1}
                    opacity={0.88}
                    enableHover
                    tickFormatTime={formatTime}
                    tickFormatValue={(value) => String(Math.round(value))}
                    emptyContent={false}
                    background="transparent"
                    description="Edit volume: counts of edits in ten-second bins, stacked by editor class."
                  />
                </SummaryCard>
                <SummaryCard
                  title="Magnitude density"
                  note="Time × absolute character change · cell color is count"
                >
                  <RealtimeHeatmap
                    ref={heatmapRef}
                    size={[summaryChartWidth, 240]}
                    margin={{ top: 12, right: 14, bottom: 34, left: 52 }}
                    timeAccessor="time"
                    valueAccessor="magnitude"
                    windowSize={CHART_BUFFER_SIZE}
                    timeExtent={timeExtent}
                    valueExtent={magnitudeExtent}
                    pointIdAccessor="id"
                    heatmapXBins={24}
                    heatmapYBins={12}
                    aggregation="count"
                    enableHover
                    tickFormatTime={formatTime}
                    tickFormatValue={formatMagnitude}
                    emptyContent={false}
                    background="transparent"
                    description="Magnitude density: a heatmap of edits over time by absolute character change, where darker cells hold more edits."
                  />
                </SummaryCard>
                <SummaryCard
                  wide
                  title="Net character flow"
                  note="Signed character change summed into 10-second intervals"
                >
                  <RealtimeLineChart
                    ref={lineRef}
                    size={[mainChartWidth, 230]}
                    margin={{ top: 12, right: 18, bottom: 34, left: 58 }}
                    timeAccessor="time"
                    valueAccessor="value"
                    windowSize={CHART_BUFFER_SIZE}
                    pointIdAccessor="id"
                    timeExtent={timeExtent}
                    stroke="#55c2e8"
                    strokeWidth={2.5}
                    enableHover
                    tickFormatTime={formatTime}
                    tickFormatValue={formatSigned}
                    emptyContent={false}
                    background="transparent"
                    description="Net character flow: signed character change summed into ten-second intervals — above zero the encyclopedia is growing, below it is shrinking."
                  />
                </SummaryCard>
              </div>
            </section>

            <section className="wiki-realtime-ledger">
              <div className="wiki-realtime-section-heading">
                <span className="wiki-realtime-kicker">Drill down</span>
                <h2>Latest matching edits</h2>
                <p>Select a row to hold its detail above, or open the revision on Wikipedia.</p>
              </div>
              <div className="wiki-realtime-ledger-list">
                {[...visibleEdits]
                  .slice(-12)
                  .reverse()
                  .map((edit) => (
                    <button
                      type="button"
                      key={edit.id}
                      className={selectedEdit?.id === edit.id ? "is-selected" : ""}
                      onClick={() =>
                        setSelectedEdit((current) => (current?.id === edit.id ? null : edit))
                      }
                    >
                      <span
                        className="wiki-realtime-ledger-dot"
                        style={{
                          background: GROUP_META[edit.group].fill,
                          borderColor: GROUP_META[edit.group].stroke,
                        }}
                      />
                      <span className="wiki-realtime-ledger-page">{edit.title}</span>
                      <span className="wiki-realtime-ledger-user">{edit.user}</span>
                      <span className={edit.delta >= 0 ? "is-addition" : "is-removal"}>
                        {formatSigned(edit.delta)}
                      </span>
                      <span className="wiki-realtime-ledger-time">{formatTime(edit.time)}</span>
                    </button>
                  ))}
                {visibleEdits.length === 0 && (
                  <div className="wiki-realtime-no-results">
                    Waiting for an edit that matches the current question.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </ThemeProvider>

      <section className="wiki-realtime-editorial">
        <div>
          <span className="wiki-realtime-kicker">Why five swarms?</span>
          <h2>Overview and drilldown</h2>
          <p>
            The overview uses double encodings (fill plus outline) so actor classes survive dense
            overlap. The small multiples share the same time and magnitude extents, making activity
            and outliers comparable without asking color to do two jobs at once. That way you can
            see clusters across different Wikipedia editor types while still seeing patterns
            specific to admins or anons.
          </p>
        </div>
        <div>
          <span className="wiki-realtime-kicker">Classification detail</span>
          <h2>Administrators need a second lookup</h2>
          <p>
            Recent-change events identify bots and expose editor names, but do not include local
            user groups. Registered names are therefore resolved in cached batches against
            Wikipedia&apos;s users API; members of the <code>sysop</code> group move into the
            administrator series when that lookup returns.
          </p>
        </div>
      </section>

      <section className="wiki-realtime-code">
        <div className="wiki-realtime-section-heading">
          <span className="wiki-realtime-kicker">Core implementation</span>
          <h2>One event buffer</h2>
          <p>
            The EventSource keeps one React-side control buffer, then the charts mirror the filtered
            window through Semiotic&apos;s imperative push, update, and remove API. Semiotic handles
            temporal windows, canvas rendering, binning, heatmap aggregation, axes, hover
            hit-testing, and per-datum swarm styles.
          </p>
        </div>
        <CodeBlock code={implementationCode} language="jsx" />
      </section>

      <p className="wiki-realtime-source-note">
        Live data from{" "}
        <a
          href="https://stream.wikimedia.org/v2/stream/recentchange"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikimedia EventStreams
        </a>
        . This example filters the global recent-change stream to edit and new-page events from{" "}
        <code>en.wikipedia.org</code>. Stream data may contain user-provided page titles and edit
        summaries.
      </p>
    </ExamplePageLayout>
  )
}

function useWikipediaEditStream(paused) {
  const [edits, setEdits] = useState([])
  const [status, setStatus] = useState("connecting")
  const [totalReceived, setTotalReceived] = useState(0)
  const adminCacheRef = useRef(new Map())
  const pendingUsersRef = useRef(new Set())
  const maxEventTimeRef = useRef(-Infinity)

  useEffect(() => {
    let disposed = false
    let inFlight = false
    let controller = null

    const resolveAdministrators = async () => {
      if (disposed || inFlight || pendingUsersRef.current.size === 0) return
      const users = [...pendingUsersRef.current].slice(0, 50)
      users.forEach((user) => pendingUsersRef.current.delete(user))
      inFlight = true
      controller = new AbortController()

      try {
        const params = new URLSearchParams({
          action: "query",
          format: "json",
          formatversion: "2",
          list: "users",
          ususers: users.join("|"),
          usprop: "groups",
          origin: "*",
        })
        const response = await fetch(`${USERS_API}?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Wikipedia users API returned ${response.status}`)
        const payload = await response.json()
        const resolved = new Map()

        for (const user of payload?.query?.users || []) {
          const group = user.groups?.includes("sysop") ? "administrator" : "registered"
          adminCacheRef.current.set(user.name, group)
          resolved.set(user.name, group)
        }

        if (!disposed && resolved.size > 0) {
          setEdits((current) =>
            current.map((edit) => {
              const group = resolved.get(edit.user)
              return group && group !== edit.group ? { ...edit, group } : edit
            }),
          )
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          users.forEach((user) => adminCacheRef.current.set(user, "registered"))
        }
      } finally {
        inFlight = false
      }
    }

    const timer = window.setInterval(resolveAdministrators, 1200)
    return () => {
      disposed = true
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [])

  useEffect(() => {
    if (paused) {
      setStatus("paused")
      return undefined
    }
    if (typeof EventSource === "undefined") {
      setStatus("unsupported")
      return undefined
    }

    const source = new EventSource(STREAM_URL)
    setStatus("connecting")

    source.onopen = () => setStatus("live")
    source.onerror = () => setStatus("reconnecting")
    source.onmessage = (message) => {
      try {
        const raw = JSON.parse(message.data)
        if (raw?.meta?.domain === "canary") return
        if (raw.server_name !== "en.wikipedia.org") return
        if (raw.type !== "edit" && raw.type !== "new") return
        if (!raw.length || raw.length.new == null) return

        const edit = normalizeEdit(raw, adminCacheRef.current, maxEventTimeRef.current)
        if (!edit) return
        if (edit.time > maxEventTimeRef.current) {
          maxEventTimeRef.current = edit.time
        }
        if (edit.group === "registered" && !adminCacheRef.current.has(edit.user)) {
          pendingUsersRef.current.add(edit.user)
        }
        setEdits((current) => [...current, edit].slice(-MAX_EVENTS))
        setTotalReceived((current) => current + 1)
      } catch {
        // EventStreams can reconnect across partial network frames; malformed
        // messages are ignored while the native EventSource resumes.
      }
    }

    return () => source.close()
  }, [paused])

  return { edits, status, totalReceived }
}

function normalizeEdit(raw, adminCache, maxEventTime = -Infinity) {
  const oldLength = Number(raw.length?.old ?? 0)
  const newLength = Number(raw.length?.new ?? 0)
  const time = Date.parse(raw.meta?.dt) || Number(raw.timestamp) * 1000
  if (!Number.isFinite(oldLength) || !Number.isFinite(newLength) || !Number.isFinite(time)) {
    return null
  }

  const delta = newLength - oldLength
  const arrivalLagMs = Number.isFinite(maxEventTime) ? Math.max(0, maxEventTime - time) : 0
  const user = raw.user || "Unknown editor"
  const group = classifyEditor(raw, user, adminCache)
  const revisionNew = raw.revision?.new
  const revisionOld = raw.revision?.old
  const diffUrl = revisionNew
    ? `${raw.server_url}/w/index.php?diff=${encodeURIComponent(revisionNew)}${revisionOld ? `&oldid=${encodeURIComponent(revisionOld)}` : ""}`
    : raw.meta?.uri

  return {
    id: raw.meta?.id || `${raw.wiki}-${raw.id}-${time}`,
    time,
    title: raw.title || "Untitled page",
    user,
    group,
    delta,
    magnitude: Math.abs(delta),
    outOfOrder: arrivalLagMs > 0,
    arrivalLagMs,
    direction: delta > 0 ? "add" : delta < 0 ? "remove" : "neutral",
    namespace: Number(raw.namespace ?? -1),
    minor: Boolean(raw.minor),
    bot: Boolean(raw.bot),
    comment: raw.comment || "No edit summary",
    diffUrl,
  }
}

function classifyEditor(raw, user, adminCache) {
  if (raw.bot) return "bot"
  if (isAnonymousUser(user)) return "anonymous"
  if (!user || user === "Unknown editor") return "other"
  return adminCache.get(user) || "registered"
}

function isAnonymousUser(user) {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{0,4}$/i
  const temporaryAccount = /^~\d{4,}-/
  return ipv4.test(user) || ipv6.test(user) || temporaryAccount.test(user)
}

function editMatchesFilters(edit, filters) {
  const minimum = MAGNITUDE_STEPS[filters.magnitudeStep]
  if (edit.magnitude < minimum) return false
  if (!filters.includeMinor && edit.minor) return false
  if (filters.direction !== "all" && edit.direction !== filters.direction) return false
  if (filters.actor === "human" && (edit.group === "bot" || edit.group === "other")) return false
  if (!["all", "human"].includes(filters.actor) && edit.group !== filters.actor) return false
  if (filters.namespace === "article" && edit.namespace !== 0) return false
  if (filters.namespace === "talk" && (edit.namespace < 1 || edit.namespace % 2 === 0)) return false
  if (filters.namespace === "project" && edit.namespace < 4) return false

  const query = filters.query.trim().toLocaleLowerCase()
  if (query && !`${edit.title} ${edit.user} ${edit.comment}`.toLocaleLowerCase().includes(query)) {
    return false
  }
  return true
}

function summarizeEdits(visibleEdits, allEdits) {
  const now = Date.now()
  const rate = allEdits.filter((edit) => edit.time >= now - 60000).length
  return {
    rate,
    netCharacters: visibleEdits.reduce((sum, edit) => sum + edit.delta, 0),
    uniqueEditors: new Set(visibleEdits.map((edit) => edit.user)).size,
  }
}

function sharedTimeExtent(edits) {
  const newest = edits[edits.length - 1]?.time || Date.now()
  const oldest = edits[0]?.time || newest - 60000
  if (oldest === newest) return [oldest - 30000, newest + 1000]
  return [oldest, newest + 1000]
}

function aggregateNetFlow(edits, timeExtent) {
  const binSize = 10000
  const bins = new Map()
  edits.forEach((edit) => {
    const bin = Math.floor(edit.time / binSize) * binSize
    bins.set(bin, (bins.get(bin) || 0) + edit.delta)
  })

  const start = Math.floor(timeExtent[0] / binSize) * binSize
  const end = Math.ceil(timeExtent[1] / binSize) * binSize
  const points = []
  for (let time = start; time <= end; time += binSize) {
    points.push({ id: `net-${time}`, time: time + binSize / 2, value: bins.get(time) || 0 })
  }
  return points
}

function actorPointStyle(edit) {
  const meta = GROUP_META[edit.group] || GROUP_META.other
  const baseRadius = edit.magnitude >= 1000 ? 5.2 : edit.minor ? 3 : 4
  return {
    fill: meta.fill,
    stroke: edit.outOfOrder ? "#ff4fd8" : meta.stroke,
    strokeWidth: edit.outOfOrder ? Math.max(3, meta.strokeWidth + 1.2) : meta.strokeWidth,
    opacity: edit.minor ? 0.55 : 0.88,
    r: edit.outOfOrder ? baseRadius + 1.6 : baseRadius,
  }
}

function directionPointStyle(edit) {
  const orderStyle = edit.outOfOrder
    ? {
        stroke: "#ff4fd8",
        strokeWidth: 3,
        r: edit.magnitude >= 1000 ? 6.3 : 5,
      }
    : null
  if (edit.direction === "remove") {
    // Removals are hollow (stroke-only) so direction never rides on hue alone —
    // filled-vs-hollow stays legible for color-blind readers and in grayscale.
    return {
      fill: "rgba(239, 102, 95, 0.12)",
      stroke: "#ef665f",
      strokeWidth: 1.8,
      opacity: edit.minor ? 0.5 : 0.84,
      r: edit.magnitude >= 1000 ? 5 : 3.7,
      ...(orderStyle || {}),
    }
  }
  if (edit.direction === "add") {
    return {
      fill: "#70c991",
      stroke: "#175a35",
      strokeWidth: 1.4,
      opacity: edit.minor ? 0.5 : 0.84,
      r: edit.magnitude >= 1000 ? 5 : 3.7,
      ...(orderStyle || {}),
    }
  }
  return {
    fill: "#9ca3af",
    stroke: "#4b5563",
    strokeWidth: 1,
    opacity: 0.65,
    r: 3.2,
    ...(orderStyle || {}),
  }
}

function groupColors() {
  return Object.fromEntries(Object.entries(GROUP_META).map(([group, meta]) => [group, meta.fill]))
}

function SwarmCard({ group, data, width, timeExtent, valueExtent, onHover }) {
  const chartRef = useRef(null)
  const meta = GROUP_META[group]
  const net = data.reduce((sum, edit) => sum + edit.delta, 0)

  useSyncedPushData(chartRef, data, { id: "id" })

  return (
    <section className="wiki-realtime-swarm-card">
      <div className="wiki-realtime-swarm-card-heading">
        <div>
          <span style={{ color: meta.fill }}>{meta.label}</span>
          <small>{meta.description}</small>
        </div>
        <div>
          <strong>{data.length}</strong>
          <small>{formatSigned(net)} chars</small>
        </div>
      </div>
      <RealtimeSwarmChart
        ref={chartRef}
        size={[width, 230]}
        margin={{ top: 12, right: 12, bottom: 32, left: 52 }}
        timeAccessor="time"
        valueAccessor="magnitude"
        windowSize={CHART_BUFFER_SIZE}
        timeExtent={timeExtent}
        valueExtent={valueExtent}
        yScaleType="symlog"
        pointStyle={directionPointStyle}
        pointIdAccessor="id"
        enableHover
        onHover={onHover}
        tooltipContent={renderEditTooltip}
        tickFormatTime={formatTime}
        tickFormatValue={formatMagnitude}
        emptyContent={false}
        background="transparent"
        description={`${meta.label} edits by magnitude of character change: filled points added text, hollow points removed it.`}
      />
      <div className="wiki-realtime-direction-key" aria-label="Edit direction legend">
        <span>
          <i className="is-addition" /> text added
        </span>
        <span>
          <i className="is-removal" /> text removed
        </span>
        <span>
          <i className="is-out-of-order" /> out of order
        </span>
      </div>
    </section>
  )
}

function ActorLegend({ counts, active, onSelect }) {
  return (
    <div className="wiki-realtime-actor-legend" aria-label="Editor classification legend">
      {[...GROUPS, "other"].map((group) => {
        const meta = GROUP_META[group]
        return (
          <button
            type="button"
            key={group}
            className={active === group ? "is-active" : ""}
            onClick={() => onSelect(group)}
            title={meta.description}
          >
            <span
              style={{
                background: meta.fill,
                borderColor: meta.stroke,
                borderWidth: meta.strokeWidth,
              }}
            />
            {meta.shortLabel}
            <strong>{counts[group]}</strong>
          </button>
        )
      })}
    </div>
  )
}

function OutOfOrderKey({ count }) {
  return (
    <div className="wiki-realtime-order-key">
      <span>
        <i /> Magenta rings mark records consumed after a newer event-time.
      </span>
      <strong>{count} in the visible window</strong>
    </div>
  )
}

function Inspector({ edit }) {
  if (!edit) {
    return (
      <div className="wiki-realtime-inspector-empty">
        <span>Waiting for the next matching edit</span>
        <small>The stream will populate this readout automatically.</small>
      </div>
    )
  }
  const meta = GROUP_META[edit.group] || GROUP_META.other
  return (
    <>
      <div className="wiki-realtime-inspector-identity">
        <span
          style={{
            background: meta.fill,
            borderColor: meta.stroke,
            borderWidth: meta.strokeWidth,
          }}
        />
        <div>
          <small>
            {meta.label} · {formatTime(edit.time)} UTC
          </small>
          <strong>{edit.user}</strong>
        </div>
      </div>
      <div className="wiki-realtime-inspector-page">
        <small>{namespaceLabel(edit.namespace)}</small>
        <strong>{edit.title}</strong>
        <p>{edit.comment}</p>
      </div>
      <div className="wiki-realtime-inspector-change">
        <span className={edit.delta >= 0 ? "is-addition" : "is-removal"}>
          {formatSigned(edit.delta)}
        </span>
        <small>
          {edit.outOfOrder
            ? `out of order by ${formatDuration(edit.arrivalLagMs)}`
            : edit.minor
              ? "minor edit"
              : "characters"}
        </small>
      </div>
      {edit.diffUrl && (
        <a href={edit.diffUrl} target="_blank" rel="noopener noreferrer">
          Open revision ↗
        </a>
      )}
    </>
  )
}

function renderEditTooltip(hover) {
  const edit = hover?.data || hover
  if (!edit?.title) return null
  const meta = GROUP_META[edit.group] || GROUP_META.other
  return (
    <div className="wiki-realtime-tooltip" data-semiotic-tooltip-chrome>
      <div>
        <span style={{ background: meta.fill, borderColor: meta.stroke }} />
        {meta.shortLabel} · {edit.user}
      </div>
      <strong>{edit.title}</strong>
      <small>
        {formatSigned(edit.delta)} characters · {formatTime(edit.time)} UTC
        {edit.outOfOrder ? ` · out of order by ${formatDuration(edit.arrivalLagMs)}` : ""}
      </small>
    </div>
  )
}

function ChartHeading({ kicker, title, note }) {
  return (
    <div className="wiki-realtime-chart-heading">
      <div>
        <span className="wiki-realtime-kicker">{kicker}</span>
        <h2>{title}</h2>
      </div>
      <span>{note}</span>
    </div>
  )
}

function SummaryCard({ title, note, wide = false, children }) {
  return (
    <section className={`wiki-realtime-summary-card ${wide ? "is-wide" : ""}`}>
      <div>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
      {children}
    </section>
  )
}

function Control({ label, children }) {
  return (
    <label className="wiki-realtime-control">
      <span>{label}</span>
      {children}
    </label>
  )
}

function StatusCell({ value, label }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function StreamStatus({ status }) {
  const labels = {
    live: "Live",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    paused: "Held",
    unsupported: "Unavailable",
  }
  return (
    <span className={`wiki-realtime-live-status is-${status}`}>
      <i aria-hidden="true" />
      {labels[status] || status}
    </span>
  )
}

function namespaceLabel(namespace) {
  if (namespace === 0) return "Article"
  if (namespace === 1) return "Article talk"
  if (namespace === 2) return "User"
  if (namespace === 3) return "User talk"
  if (namespace === 4) return "Wikipedia"
  if (namespace === 5) return "Wikipedia talk"
  if (namespace === 6) return "File"
  if (namespace === 10) return "Template"
  if (namespace === 14) return "Category"
  return namespace % 2 === 1 ? `Talk namespace ${namespace}` : `Namespace ${namespace}`
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
}

function formatMagnitude(value) {
  const absolute = Math.abs(Number(value) || 0)
  if (absolute >= 1000000) return `${(absolute / 1000000).toFixed(1)}m`
  if (absolute >= 1000) return `${(absolute / 1000).toFixed(absolute >= 10000 ? 0 : 1)}k`
  return String(Math.round(absolute))
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0ms"
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${Math.round(ms / 100) / 10}s`
  return `${Math.round(ms / 6000) / 10}m`
}

function formatSigned(value) {
  const number = Number(value) || 0
  return `${number > 0 ? "+" : ""}${formatCompact(number)}`
}

function formatCompact(value) {
  const number = Number(value) || 0
  const sign = number < 0 ? "−" : ""
  const absolute = Math.abs(number)
  if (absolute >= 1000000) return `${sign}${(absolute / 1000000).toFixed(1)}m`
  if (absolute >= 1000) return `${sign}${(absolute / 1000).toFixed(absolute >= 10000 ? 0 : 1)}k`
  return `${sign}${Math.round(absolute)}`
}
