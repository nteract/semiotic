import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  BarChart,
  ChartContainer,
  ForceDirectedGraph,
  ThemeProvider,
  TreeDiagram,
} from "semiotic"
import { BigNumber } from "semiotic/value"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  NODE_COLORS,
  TOPIC_COLORS,
  ZIP_PRESETS,
  buildCivicNetwork,
  buildGovernmentHierarchy,
  civicDatasetUrl,
  cleanHeader,
  collectTopics,
  fetchCivicSignals,
  fetchCounty,
  fetchCountySpending,
  fetchDisasterHistory,
  fetchLegistarActivity,
  fetchLocusLaws,
  filterCivicNetwork,
  getCivicPortal,
  getLegistarCoverage,
  inferTopic,
  resolveZip,
  truncate,
  unwrapChartDatum,
} from "./localGovernmentData"
import "./LocalGovernmentExplorerExamplePage.css"

const EMPTY_ACTIVITY = {
  coverage: null,
  matters: [],
  meetings: [],
  sponsors: [],
  sourceMode: "unavailable",
}

const compactUSD = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)

const fullUSD = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const implementationCode = `const location = await resolveZip(zip)

// Codified law (LOCUS) + current legislative activity (Legistar).
const [lawResult, activity] = await Promise.all([
  fetchLocusLaws(location),
  fetchLegistarActivity(location)
])

// Universal layer — resolves for any U.S. ZIP, no API key. From the county:
//   FEMA disaster history + USAspending federal awards (place of performance).
const county = await fetchCounty(location)
const [disasters, spending] = await Promise.all([
  fetchDisasterHistory(county),
  fetchCountySpending(county)
])

// Local layer — city open-data 311 feed where one is published (Socrata).
const civic = await fetchCivicSignals(location)

<TreeDiagram data={buildGovernmentHierarchy(location, lawResult.laws, activity)}
  layout="cluster" orientation="horizontal" nodeIdAccessor="id" nodeLabel="label" />

<ForceDirectedGraph {...buildCivicNetwork(location, lawResult.laws, activity)}
  nodeIdAccessor="id" sourceAccessor="source" targetAccessor="target" nodeSize="degree" />

<BigNumber value={disasters.total} label="Federal disaster declarations"
  caption={countySpanLabel} trendSlot={<Sparkline series={disasters.byYear} />} />

<BarChart data={disasters.byType} categoryAccessor="label"
  valueAccessor="count" orientation="horizontal" colorBy="label" />`

export default function LocalGovernmentExplorerExamplePage() {
  const [zipInput, setZipInput] = useState("98101")
  const [location, setLocation] = useState(null)
  const [laws, setLaws] = useState([])
  const [activity, setActivity] = useState(EMPTY_ACTIVITY)
  const [county, setCounty] = useState(null)
  const [disasters, setDisasters] = useState(null)
  const [spending, setSpending] = useState(null)
  const [civic, setCivic] = useState(null)
  const [sourceStatus, setSourceStatus] = useState({
    zip: "idle",
    locus: "idle",
    legistar: "idle",
    fema: "idle",
    spending: "idle",
    civic: "idle",
  })
  const [sourceErrors, setSourceErrors] = useState({})
  const [scope, setScope] = useState("all")
  const [topic, setTopic] = useState("All")
  const [query, setQuery] = useState("")
  const [substantiveOnly, setSubstantiveOnly] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [locked, setLocked] = useState(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(920, 1132)
  const [docsTheme] = useDocsTheme()
  const controllerRef = useRef(null)
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  const loadZip = useCallback(async (zip) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setSourceErrors({})
    setSourceStatus({ zip: "loading", locus: "idle", legistar: "idle", fema: "idle", spending: "idle", civic: "idle" })
    setLaws([])
    setActivity(EMPTY_ACTIVITY)
    setCounty(null)
    setDisasters(null)
    setSpending(null)
    setCivic(null)
    setHovered(null)
    setLocked(null)

    let nextLocation
    try {
      nextLocation = await resolveZip(zip, controller.signal)
      if (controller.signal.aborted) return
      setLocation(nextLocation)
      setZipInput(nextLocation.zip)
      setSourceStatus({
        zip: nextLocation.sourceMode,
        locus: "loading",
        legistar: getLegistarCoverage(nextLocation) ? "loading" : "unavailable",
        fema: "loading",
        spending: "loading",
        civic: getCivicPortal(nextLocation) ? "loading" : "unavailable",
      })
    } catch (error) {
      if (error.name === "AbortError") return
      setLocation(null)
      setSourceStatus({ zip: "error", locus: "idle", legistar: "idle", fema: "idle", spending: "idle", civic: "idle" })
      setSourceErrors({ zip: error.message })
      return
    }

    fetchLocusLaws(nextLocation, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setLaws(result.laws)
        setSourceStatus((current) => ({
          ...current,
          locus: result.laws.length ? "live" : "no-match",
        }))
      })
      .catch((error) => {
        if (error.name === "AbortError") return
        setSourceStatus((current) => ({ ...current, locus: "error" }))
        setSourceErrors((current) => ({ ...current, locus: error.message }))
      })

    if (getLegistarCoverage(nextLocation)) {
      fetchLegistarActivity(nextLocation, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setActivity(result)
          setSourceStatus((current) => ({ ...current, legistar: result.sourceMode }))
        })
        .catch((error) => {
          if (error.name === "AbortError") return
          setSourceStatus((current) => ({ ...current, legistar: "error" }))
          setSourceErrors((current) => ({ ...current, legistar: error.message }))
        })
    }

    // Universal layer: one county crosswalk feeds both the federal disaster
    // history and federal spending (both keyed on the resolved county).
    const countyPromise = fetchCounty(nextLocation, controller.signal)
    countyPromise
      .then((nextCounty) => {
        if (controller.signal.aborted) return null
        setCounty(nextCounty)
        return fetchDisasterHistory(nextCounty, controller.signal)
      })
      .then((result) => {
        if (!result || controller.signal.aborted) return
        setDisasters(result)
        setSourceStatus((current) => ({ ...current, fema: result.sourceMode }))
      })
      .catch((error) => {
        if (error.name === "AbortError") return
        setSourceStatus((current) => ({ ...current, fema: "error" }))
        setSourceErrors((current) => ({ ...current, fema: error.message }))
      })
    countyPromise
      .then((nextCounty) => {
        if (!nextCounty || controller.signal.aborted) return null
        return fetchCountySpending(nextCounty, controller.signal)
      })
      .then((result) => {
        if (!result || controller.signal.aborted) return
        setSpending(result)
        setSourceStatus((current) => ({ ...current, spending: result.sourceMode }))
      })
      .catch((error) => {
        if (error.name === "AbortError") return
        setSourceStatus((current) => ({ ...current, spending: "error" }))
        setSourceErrors((current) => ({ ...current, spending: error.message }))
      })

    // Local layer: city open-data 311 feed, where one is published.
    if (getCivicPortal(nextLocation)) {
      fetchCivicSignals(nextLocation, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setCivic(result)
          setSourceStatus((current) => ({ ...current, civic: result.sourceMode }))
        })
        .catch((error) => {
          if (error.name === "AbortError") return
          setSourceStatus((current) => ({ ...current, civic: "error" }))
          setSourceErrors((current) => ({ ...current, civic: error.message }))
        })
    }
  }, [])

  useEffect(() => {
    loadZip("98101")
    return () => controllerRef.current?.abort()
  }, [loadZip])

  const topics = useMemo(
    () => collectTopics(laws, activity.matters),
    [laws, activity.matters],
  )

  useEffect(() => {
    if (topic !== "All" && !topics.includes(topic)) setTopic("All")
  }, [topic, topics])

  const visibleLaws = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return laws.filter((law) => {
      const lawTopic = law.topic || inferTopic(`${law.header} ${law.content}`)
      if (substantiveOnly && !law.substantive) return false
      if (topic !== "All" && lawTopic !== topic) return false
      if (
        normalizedQuery
        && !`${law.header} ${law.content} ${law.function} ${lawTopic}`.toLowerCase().includes(normalizedQuery)
      ) return false
      return true
    })
  }, [laws, query, substantiveOnly, topic])

  const hierarchy = useMemo(
    () => location
      ? buildGovernmentHierarchy(location, visibleLaws, activity)
      : emptyHierarchy(),
    [location, visibleLaws, activity],
  )

  const completeNetwork = useMemo(
    () => location
      ? buildCivicNetwork(location, visibleLaws, activity)
      : { nodes: [], edges: [] },
    [location, visibleLaws, activity],
  )

  const network = useMemo(
    () => filterCivicNetwork(completeNetwork, { scope, topic, query }),
    [completeNetwork, scope, topic, query],
  )

  const active = hovered || locked
  const activeConnections = useMemo(
    () => active ? connectionsFor(active.id, completeNetwork) : [],
    [active, completeNetwork],
  )

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      const datum = unwrapChartDatum(observation.datum)
      setHovered(datum?.id ? datum : null)
    } else if (observation.type === "hover-end") {
      setHovered(null)
    }
  }, [])

  const handleClick = useCallback((datum) => {
    const raw = unwrapChartDatum(datum)
    if (!raw?.id) return
    setLocked((current) => current?.id === raw.id ? null : raw)
  }, [])

  const nodeStyle = useMemo(() => (node) => {
    const raw = unwrapChartDatum(node)
    const selected = active?.id === raw?.id
    return {
      fill: NODE_COLORS[raw?.kind] || NODE_COLORS.branch,
      stroke: selected ? "#f7f2e4" : "#17212b",
      strokeWidth: selected ? 3 : 1.2,
      opacity: active && !selected ? 0.62 : 0.92,
    }
  }, [active])

  const edgeStyle = useMemo(() => (edge) => {
    const raw = unwrapChartDatum(edge)
    const connected = active && (raw?.source === active.id || raw?.target === active.id)
    return {
      stroke: connected ? "#f4bf4f" : "#667482",
      strokeWidth: connected ? 2.4 : 0.8,
      opacity: active ? (connected ? 0.95 : 0.16) : 0.4,
      fill: "none",
    }
  }, [active])

  const submitZip = useCallback((event) => {
    event.preventDefault()
    loadZip(zipInput)
  }, [loadZip, zipInput])

  const coverage = location ? getLegistarCoverage(location) : null
  const isLocating = sourceStatus.zip === "loading"
  const filteredMatterCount = network.nodes.filter((node) => node.kind === "matter").length
  const currentBodies = new Set([
    ...activity.matters.map((matter) => matter.bodyId),
    ...activity.meetings.map((meeting) => meeting.bodyId),
  ]).size

  return (
    <ExamplePageLayout
      title="Your Local Government Explorer"
      prevPage={{ title: "Wikipedia, as it happens", path: "/examples/wikipedia-realtime" }}
      nextPage={{ title: "Where the Boxes Wait", path: "/examples/port-congestion-replay" }}
    >
      <p className="local-gov-lede">
        A ZIP code is not a government boundary, but it is a useful place to
        begin. This explorer resolves the postal place, reads your county's
        federal disaster record and the federal dollars spent there (both answer
        for any U.S. ZIP), pulls live 311 service requests where a city publishes
        them, finds matching municipal code in LOCUS, and layers in public
        legislative activity — then turns the result into linked maps of
        authority, law, people, meetings, and active matters.
      </p>

      <section className="local-gov-search-panel">
        <div className="local-gov-search-copy">
          <span className="local-gov-kicker">Start with a postal place</span>
          <h2>What is your local government doing?</h2>
          <p>
            Enter a five-digit U.S. ZIP code. Results inherit the ambiguity of
            ZIP-to-place matching and always identify their source coverage.
          </p>
        </div>
        <form onSubmit={submitZip} className="local-gov-search-form">
          <label htmlFor="local-government-zip">ZIP code</label>
          <div>
            <input
              id="local-government-zip"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength="5"
              value={zipInput}
              onChange={(event) => setZipInput(event.target.value.replace(/\D/g, "").slice(0, 5))}
              aria-describedby="local-government-zip-note"
            />
            <button type="submit" disabled={isLocating || zipInput.length !== 5}>
              {isLocating ? "Locating…" : "Explore"}
            </button>
          </div>
          <small id="local-government-zip-note">Postal geography is an approximation, not a jurisdiction lookup.</small>
        </form>
        <div className="local-gov-presets" aria-label="Example ZIP codes">
          {ZIP_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.zip}
              onClick={() => {
                setZipInput(preset.zip)
                loadZip(preset.zip)
              }}
            >
              {preset.label} <span>{preset.zip}</span>
            </button>
          ))}
        </div>
      </section>

      {sourceErrors.zip && (
        <div className="local-gov-error" role="alert">
          <strong>Could not resolve that ZIP code.</strong>
          <span>{sourceErrors.zip}</span>
        </div>
      )}

      {location && (
        <>
          <section className="local-gov-place-header">
            <div>
              <span className="local-gov-kicker">ZIP {location.zip} · postal place match</span>
              <h2>{location.city}, {location.stateCode}</h2>
              <p>
                {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
                {location.alternatePlaces.length > 0 && ` · also associated with ${location.alternatePlaces.join(", ")}`}
              </p>
            </div>
            <button type="button" onClick={() => loadZip(location.zip)}>Refresh sources</button>
          </section>

          <div className="local-gov-source-strip" aria-label="Data source status">
            <SourceStatus
              status={sourceStatus.zip}
              title="Postal place"
              detail={location.source}
            />
            <SourceStatus
              status={sourceStatus.locus}
              title="Codified law"
              detail={sourceErrors.locus || `${laws.length} LOCUS provisions loaded`}
            />
            <SourceStatus
              status={sourceStatus.legistar}
              title="Current activity"
              detail={
                sourceErrors.legistar
                || (activity.sourceMode === "snapshot"
                  ? `${coverage?.label} · snapshot ${formatDate(activity.capturedAt)}`
                  : null)
                || coverage?.label
                || "No mapped public Legistar client"
              }
            />
            <SourceStatus
              status={sourceStatus.fema}
              title="County disaster record"
              detail={
                sourceErrors.fema
                || (disasters ? `${disasters.total} federal declarations` : null)
                || (county ? county.countyName : "FCC + OpenFEMA")
              }
            />
            <SourceStatus
              status={sourceStatus.spending}
              title="Federal spending"
              detail={
                sourceErrors.spending
                || (spending ? `${compactUSD(spending.total)} · FY ${spending.fy}` : null)
                || "USAspending.gov"
              }
            />
            <SourceStatus
              status={sourceStatus.civic}
              title="Local 311 signals"
              detail={
                sourceErrors.civic
                || (civic && civic.total ? `${civic.total} recent · ${civic.scope}` : null)
                || (getCivicPortal(location) ? "City open-data portal" : "No open 311 feed")
              }
            />
          </div>

          <div className="local-gov-stat-strip">
            <Stat value={visibleLaws.length} label="law provisions in view" />
            <Stat value={activity.matters.length} label="recently changed matters" />
            <Stat value={activity.meetings.length} label="meetings in feed" />
            <Stat value={activity.sponsors.length} label="sponsor relationships" />
            <Stat value={currentBodies} label="active bodies represented" />
          </div>

          <DisasterRecord
            status={sourceStatus.fema}
            disasters={disasters}
            county={county}
            error={sourceErrors.fema}
            theme={carbonTheme}
          />

          <CivicSignals
            status={sourceStatus.civic}
            civic={civic}
            portal={getCivicPortal(location)}
            error={sourceErrors.civic}
            location={location}
            theme={carbonTheme}
          />

          <FederalSpending
            status={sourceStatus.spending}
            spending={spending}
            county={county}
            error={sourceErrors.spending}
            theme={carbonTheme}
          />

          <section className="local-gov-query-deck" aria-label="Explorer controls">
            <div className="local-gov-query-heading">
              <div>
                <span className="local-gov-kicker">Shape the graph</span>
                <h2>Ask a narrower civic question</h2>
              </div>
              <span>{network.nodes.length} nodes · {network.edges.length} relationships</span>
            </div>
            <div className="local-gov-controls">
              <Control label="Network scope">
                <select value={scope} onChange={(event) => setScope(event.target.value)}>
                  <option value="all">Whole local system</option>
                  <option value="activity">Current activity</option>
                  <option value="law">Law + initiatives</option>
                  <option value="people">People + organizations</option>
                </select>
              </Control>
              <Control label="Topic">
                <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                  <option>All</option>
                  {topics.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Control>
              <Control label="Search text">
                <input
                  type="search"
                  value={query}
                  placeholder="housing, budget, a person…"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Control>
              <label className="local-gov-checkbox">
                <input
                  type="checkbox"
                  checked={substantiveOnly}
                  onChange={(event) => setSubstantiveOnly(event.target.checked)}
                />
                <span>LOCUS substantive rules only</span>
              </label>
              {(scope !== "all" || topic !== "All" || query || substantiveOnly) && (
                <button
                  type="button"
                  className="local-gov-clear"
                  onClick={() => {
                    setScope("all")
                    setTopic("All")
                    setQuery("")
                    setSubstantiveOnly(false)
                  }}
                >
                  Clear question
                </button>
              )}
            </div>
          </section>

          <ThemeProvider theme={carbonTheme}>
            <div ref={chartHostRef} className="local-gov-chart-scroller">
              <div className="local-gov-charts" style={{ width: chartWidth }}>
                <ChartContainer
                  title="Who governs what"
                  subtitle="Authority and law as a horizontal hierarchy"
                  height={650}
                  actions={{ export: true, fullscreen: true }}
                  controls={<ChartHint active={active} locked={locked} />}
                  style={chartContainerStyle}
                >
                  <TreeDiagram
                    chartId="local-government-hierarchy"
                    data={hierarchy}
                    width={chartWidth - 52}
                    height={560}
                    margin={{ top: 22, right: 205, bottom: 22, left: 100 }}
                    layout="cluster"
                    orientation="horizontal"
                    childrenAccessor="children"
                    nodeIdAccessor="id"
                    nodeLabel={(node) => truncate(node.label, 34)}
                    showLabels
                    nodeSize={5}
                    enableHover
                    tooltip={renderGovernmentTooltip}
                    onObservation={handleObservation}
                    onClick={handleClick}
                    description={`Hierarchy of governing bodies, recent matters, meetings, and LOCUS law provisions associated with ${location.city}, ${location.stateCode}.`}
                    accessibleTable
                    frameProps={{
                      nodeStyle,
                      edgeStyle,
                      background: "transparent",
                    }}
                  />
                </ChartContainer>

                <Inspector
                  active={active}
                  connections={activeConnections}
                  onRelease={() => setLocked(null)}
                />

                <ChartContainer
                  title="Who is connected to what"
                  subtitle="Bodies, sponsors, meetings, initiatives, topics, and codified law"
                  height={720}
                  actions={{ export: true, fullscreen: true }}
                  controls={<ChartHint active={active} locked={locked} />}
                  style={chartContainerStyle}
                >
                  <ForceDirectedGraph
                    chartId="local-government-network"
                    nodes={network.nodes}
                    edges={network.edges}
                    width={chartWidth - 52}
                    height={625}
                    margin={{ top: 28, right: 28, bottom: 62, left: 28 }}
                    nodeIdAccessor="id"
                    sourceAccessor="source"
                    targetAccessor="target"
                    nodeLabel={(node) => networkLabel(node)}
                    nodeSize="degree"
                    nodeSizeRange={[5, 18]}
                    edgeWidth={1}
                    iterations={360}
                    forceStrength={0.16}
                    showLabels
                    enableHover
                    tooltip={renderGovernmentTooltip}
                    onObservation={handleObservation}
                    onClick={handleClick}
                    emptyContent={false}
                    description={`Relationship network for ${location.city}, including ${filteredMatterCount} active matters and ${visibleLaws.length} LOCUS law provisions in the current filtered view.`}
                    accessibleTable
                    frameProps={{
                      nodeStyle,
                      edgeStyle,
                      background: "transparent",
                    }}
                  />
                  <NodeLegend />
                </ChartContainer>
              </div>
            </div>
          </ThemeProvider>

          <section className="local-gov-activity-section">
            <div className="local-gov-section-heading">
              <span className="local-gov-kicker">Administrative goings-on</span>
              <h2>Meetings and matters moving now</h2>
              <p>
                {activity.sourceMode === "snapshot"
                  ? `Displayed records are a source-linked Legistar snapshot captured ${formatDate(activity.capturedAt)} because the public API does not permit direct browser requests.`
                  : "These are live public records when this postal place maps to a browser-readable legislative feed."}
                {" "}“Recent” means recently modified in that system, not
                necessarily newly introduced.
              </p>
            </div>
            {activity.sourceMode === "live" || activity.sourceMode === "snapshot" ? (
              <div className="local-gov-activity-grid">
                <div className="local-gov-meetings">
                  <h3>Public meetings</h3>
                  {activity.meetings.slice(0, 7).map((meeting) => (
                    <ActivityRow
                      key={meeting.id}
                      item={meeting}
                      eyebrow={`${formatDate(meeting.date)} · ${meeting.time || "time TBD"}`}
                      title={meeting.title}
                      detail={[meeting.status, firstLine(meeting.location)].filter(Boolean).join(" · ")}
                      onSelect={() => setLocked(meeting)}
                    />
                  ))}
                </div>
                <div className="local-gov-matters">
                  <h3>Legislation and initiatives</h3>
                  {activity.matters.slice(0, 7).map((matter) => (
                    <ActivityRow
                      key={matter.id}
                      item={matter}
                      eyebrow={`${matter.file || matter.type} · ${matter.status || "status unavailable"}`}
                      title={matter.title}
                      detail={`${matter.bodyName} · ${matter.topic}`}
                      onSelect={() => setLocked(matter)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <CoverageEmpty
                status={sourceStatus.legistar}
                title="No browser-readable administrative feed is available for this postal place."
                detail="LOCUS law can still load independently. OpenGov is not used because it does not expose a general public nationwide API; local portals vary by contract and jurisdiction."
              />
            )}
          </section>

          <section className="local-gov-law-section">
            <div className="local-gov-section-heading">
              <span className="local-gov-kicker">Codified municipal law</span>
              <h2>LOCUS provisions in this place match</h2>
              <p>
                LOCUS labels each text chunk by legal function and marks Rules
                and Enforcement as substantive. Topic labels apply only to
                substantive provisions; other topic groupings shown here are
                lightweight keyword inferences for navigation.
              </p>
            </div>
            {visibleLaws.length > 0 ? (
              <div className="local-gov-law-grid">
                {visibleLaws.slice(0, 18).map((law) => {
                  const lawTopic = law.topic || inferTopic(`${law.header} ${law.content}`)
                  return (
                    <button
                      type="button"
                      key={law.id}
                      onClick={() => setLocked(law)}
                      className={locked?.id === law.id ? "is-selected" : ""}
                    >
                      <span
                        className="local-gov-topic-bar"
                        style={{ background: TOPIC_COLORS[lawTopic] || TOPIC_COLORS.Other }}
                      />
                      <span className="local-gov-law-meta">
                        {law.function} · {lawTopic} · {law.substantive ? "substantive" : "context / process"}
                      </span>
                      <strong>{cleanHeader(law.header) || "Untitled provision"}</strong>
                      <p>{truncate(law.content, 210)}</p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <CoverageEmpty
                status={sourceStatus.locus}
                title={sourceStatus.locus === "loading" ? "LOCUS is indexing this query." : "No LOCUS rows are available for this place match."}
                detail={sourceErrors.locus || "Coverage is incomplete and city names are normalized differently across source systems. Try another ZIP or broaden the current filters."}
              />
            )}
          </section>

          <section className="local-gov-method">
            <div>
              <span className="local-gov-kicker">Coverage model</span>
              <h2>What this explorer can—and cannot—claim</h2>
            </div>
            <div className="local-gov-method-grid">
              <MethodItem number="01" title="ZIP is a starting point">
                ZIP codes are delivery routes, not municipal boundaries. The
                returned postal place can differ from the incorporated place,
                county, school district, or special district governing an address.
              </MethodItem>
              <MethodItem number="02" title="LOCUS is a research corpus">
                LOCUS contains roughly 2.21 million city and county law chunks,
                but its authors explicitly say it is not a complete census, a
                fully human-validated benchmark, legal advice, or a substitute
                for reviewing official code.
              </MethodItem>
              <MethodItem number="03" title="Coverage is layered and labeled">
                The county disaster record and federal spending (FCC + OpenFEMA
                + USAspending) resolve for any U.S. ZIP. Live legislative
                activity (Legistar) and 311 service requests (city open data)
                exist only for a handful of cities; everywhere else those panels
                say so. Nothing is synthesized, and each panel names the source
                it actually reached.
              </MethodItem>
            </div>
          </section>

          <section className="local-gov-code">
            <div className="local-gov-section-heading">
              <span className="local-gov-kicker">Core implementation</span>
              <h2>Two source layers, two Semiotic network views</h2>
              <p>
                The hierarchy and relationship graph share normalized IDs and a
                single inspection state. Hover explores; click locks; controls
                rebuild the visible topology without mutating source rows.
              </p>
            </div>
            <CodeBlock code={implementationCode} language="jsx" />
          </section>

          <p className="local-gov-sources">
            Sources:{" "}
            <a href="https://huggingface.co/datasets/LocalLaws/LOCUS-v1" target="_blank" rel="noopener noreferrer">LOCUS v1</a>
            {" · "}
            <a href="https://webapi.legistar.com/Help" target="_blank" rel="noopener noreferrer">Legistar Web API</a>
            {" · "}
            <a href="https://docs.zippopotam.us/docs/getting-started/" target="_blank" rel="noopener noreferrer">Zippopotam.us / GeoNames</a>
            {" · "}
            <a href="https://www.fema.gov/about/openfema/api" target="_blank" rel="noopener noreferrer">OpenFEMA</a>
            {" · "}
            <a href="https://api.usaspending.gov/" target="_blank" rel="noopener noreferrer">USAspending.gov</a>
            {" · "}
            <a href="https://geo.fcc.gov/api/census/" target="_blank" rel="noopener noreferrer">FCC Area API</a>
            {" · "}
            <a href="https://dev.socrata.com/" target="_blank" rel="noopener noreferrer">city open-data portals (Socrata)</a>.
            Verify consequential information against the official municipal code,
            clerk, election authority, or agenda portal.
          </p>
        </>
      )}
    </ExamplePageLayout>
  )
}

function DisasterRecord({ status, disasters, county, error, theme }) {
  const ready = disasters && disasters.total > 0
  return (
    <section className="local-gov-data-section">
      <div className="local-gov-section-heading">
        <span className="local-gov-kicker">Every ZIP, every county</span>
        <h2>The federal disaster record where you live</h2>
        <p>
          Your coordinates resolve to a county through the FCC area service, and
          the federal government keeps a public, browser-readable log of every
          major-disaster, emergency, and fire-management declaration there since
          1953. Unlike the feeds below, this layer answers for any U.S. ZIP.
        </p>
      </div>
      {status === "loading" && !disasters && (
        <div className="local-gov-coverage-empty is-loading">
          <strong>Reading the federal declaration log for your county…</strong>
          <p>Crosswalking your coordinates to a county FIPS code, then querying OpenFEMA.</p>
        </div>
      )}
      {status === "error" && (
        <CoverageEmpty
          status="error"
          title="The federal disaster feed did not respond."
          detail={error || "OpenFEMA may be briefly unavailable. Try refreshing the sources."}
        />
      )}
      {disasters && disasters.total === 0 && status !== "loading" && (
        <CoverageEmpty
          status="no-match"
          title={`No federal disaster declarations are on record for ${county?.countyName || "this county"}.`}
          detail="That is comparatively rare — most U.S. counties carry decades of declarations — and can also mean the coordinates fell just outside a mapped county boundary."
        />
      )}
      {ready && (
        <div className="local-gov-data-band">
          <div className="local-gov-band-figure">
            <ThemeProvider theme={theme}>
              <BigNumber
                value={disasters.total}
                format="number"
                label="Federal disaster declarations"
                caption={`${county?.countyName || "This county"}${county?.stateCode ? `, ${county.stateCode}` : ""} · ${disasters.firstYear}–${disasters.lastYear}`}
                background="transparent"
                borderColor="transparent"
                trendSlot={<MiniSparkline series={disasters.byYear} valueKey="count" />}
              />
            </ThemeProvider>
            <dl className="local-gov-band-facts">
              <div>
                <dt>Most frequent</dt>
                <dd>{disasters.topType}</dd>
              </div>
              <div>
                <dt>Brought direct resident aid</dt>
                <dd>{disasters.iaCount} {disasters.iaCount === 1 ? "time" : "times"}</dd>
              </div>
            </dl>
          </div>
          <div className="local-gov-band-chart">
            <h3>Declarations by incident type</h3>
            <div className="local-gov-chart-frame">
              <ThemeProvider theme={theme}>
                <BarChart
                  data={disasters.byType}
                  categoryAccessor="label"
                  valueAccessor="count"
                  orientation="horizontal"
                  colorBy="label"
                  sort={false}
                  responsiveWidth
                  height={Math.max(150, disasters.byType.length * 34)}
                  margin={{ top: 6, right: 26, bottom: 26, left: 132 }}
                  showLegend={false}
                  frameProps={{ background: "transparent" }}
                  description={`Federal disaster declarations in ${county?.countyName || "this county"} grouped by incident type.`}
                />
              </ThemeProvider>
            </div>
          </div>
          <div className="local-gov-record-rows">
            {disasters.recent.map((item) => (
              <a
                key={item.id}
                className="local-gov-record-row"
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="local-gov-activity-date">
                  {declarationTypeLabel(item.declarationType)} · {formatDate(item.date)}
                </span>
                <strong>{truncate(item.title, 92)}</strong>
                <small>
                  {item.type}{item.individualAssistance ? " · individual assistance" : ""} · {item.declarationString}
                </small>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CivicSignals({ status, civic, portal, error, location, theme }) {
  const ready = civic && civic.total > 0
  return (
    <section className="local-gov-data-section">
      <div className="local-gov-section-heading">
        <span className="local-gov-kicker">On your block</span>
        <h2>What residents are reporting to the city right now</h2>
        <p>
          Where a city publishes an open 311 service-request feed, this layer
          pulls the most recent reports near your ZIP — potholes, graffiti,
          encampments, noise, broken signals — straight from the municipal data
          portal.{portal ? ` Source: ${portal.label}.` : ""}
        </p>
      </div>
      {!portal && (
        <CoverageEmpty
          status="unavailable"
          title="No open, browser-readable 311 feed maps to this place."
          detail="Coverage mirrors the live-activity tier: a handful of cities publish a keyless open-data 311 endpoint. Others have moved to portals (e.g. ArcGIS Hub) that expose no comparable public browser API, so this panel says so rather than guessing."
        />
      )}
      {portal && status === "loading" && !civic && (
        <div className="local-gov-coverage-empty is-loading">
          <strong>Pulling the latest service requests near {location?.zip}…</strong>
          <p>Querying {portal.label} for the most recent reports in your area.</p>
        </div>
      )}
      {portal && status === "error" && (
        <CoverageEmpty
          status="error"
          title="The city 311 feed did not respond."
          detail={error || "The municipal open-data portal may be briefly unavailable."}
        />
      )}
      {portal && civic && civic.total === 0 && status !== "loading" && (
        <CoverageEmpty
          status="no-match"
          title="No recent service requests came back for this area."
          detail="The portal is reachable but returned nothing for the current scope. Try a nearby ZIP within the same city."
        />
      )}
      {ready && (
        <div className="local-gov-data-band">
          <div className="local-gov-band-figure">
            <ThemeProvider theme={theme}>
              <BigNumber
                value={civic.total}
                format="number"
                label="Recent service requests"
                caption={`${civic.scope === "citywide" ? "Citywide" : civic.scope} · latest ${civic.spanDays} day${civic.spanDays === 1 ? "" : "s"}`}
                background="transparent"
                borderColor="transparent"
                trendSlot={<MiniSparkline series={civic.byDay} valueKey="count" />}
              />
            </ThemeProvider>
            <dl className="local-gov-band-facts">
              <div>
                <dt>Most common</dt>
                <dd>{civic.topType}</dd>
              </div>
              <div>
                <dt>Most recent</dt>
                <dd>{formatDate(civic.latest)}</dd>
              </div>
            </dl>
          </div>
          <div className="local-gov-band-chart">
            <h3>Top request types</h3>
            <div className="local-gov-chart-frame">
              <ThemeProvider theme={theme}>
                <BarChart
                  data={civic.byType}
                  categoryAccessor="label"
                  valueAccessor="count"
                  orientation="horizontal"
                  colorBy="label"
                  sort={false}
                  responsiveWidth
                  height={Math.max(150, civic.byType.length * 32)}
                  margin={{ top: 6, right: 26, bottom: 26, left: 150 }}
                  showLegend={false}
                  frameProps={{ background: "transparent" }}
                  description={`Most common 311 request types ${civic.scope === "citywide" ? "citywide" : "near this ZIP"}.`}
                />
              </ThemeProvider>
            </div>
          </div>
          <div className="local-gov-record-rows">
            {civic.recent.map((item) => (
              <div key={item.id} className="local-gov-record-row is-static">
                <span className="local-gov-activity-date">{formatDate(item.date)} · {item.status}</span>
                <strong>{truncate(item.type, 76)}</strong>
                <small>{[item.address, item.agency].filter(Boolean).join(" · ") || "Location withheld"}</small>
              </div>
            ))}
          </div>
          <a
            className="local-gov-band-source"
            href={civicDatasetUrl(portal)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {portal.label} ↗
          </a>
        </div>
      )}
    </section>
  )
}

function FederalSpending({ status, spending, county, error, theme }) {
  const ready = spending && spending.total > 0
  return (
    <section className="local-gov-data-section">
      <div className="local-gov-section-heading">
        <span className="local-gov-kicker">Every ZIP, every county</span>
        <h2>Federal dollars flowing into your county</h2>
        <p>
          Where federal money is actually spent — by place of performance — in{" "}
          {spending?.fy ? `fiscal year ${spending.fy}` : "the latest complete fiscal year"},
          from USAspending.gov. Like the disaster record, this resolves for any
          U.S. ZIP; the bar ranks the largest named recipients.
        </p>
      </div>
      {status === "loading" && !spending && (
        <div className="local-gov-coverage-empty is-loading">
          <strong>Totaling federal awards in your county…</strong>
          <p>Querying USAspending.gov by place of performance for the latest complete fiscal year.</p>
        </div>
      )}
      {status === "error" && (
        <CoverageEmpty
          status="error"
          title="The federal spending feed did not respond."
          detail={error || "USAspending.gov may be briefly unavailable. Try refreshing the sources."}
        />
      )}
      {spending && spending.total === 0 && status !== "loading" && (
        <CoverageEmpty
          status="no-match"
          title={`No federal awards are recorded in ${county?.countyName || "this county"} for that fiscal year.`}
          detail="That is unusual for a populated county and can also reflect coordinates that fell outside a mapped county boundary."
        />
      )}
      {ready && (
        <div className="local-gov-data-band">
          <div className="local-gov-band-figure">
            <ThemeProvider theme={theme}>
              <BigNumber
                value={spending.total}
                format={compactUSD}
                label="Federal spending, place of performance"
                caption={`${county?.countyName || "This county"}${county?.stateCode ? `, ${county.stateCode}` : ""} · FY ${spending.fy}`}
                background="transparent"
                borderColor="transparent"
              />
            </ThemeProvider>
            <dl className="local-gov-band-facts">
              <div>
                <dt>Per resident</dt>
                <dd>{spending.perCapita != null ? fullUSD(spending.perCapita) : "—"}</dd>
              </div>
              <div>
                <dt>Top recipient</dt>
                <dd>{spending.topRecipient || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="local-gov-band-chart">
            <h3>Top recipients by award amount</h3>
            <div className="local-gov-chart-frame">
              <ThemeProvider theme={theme}>
                <BarChart
                  data={spending.topRecipients}
                  categoryAccessor="label"
                  valueAccessor="amount"
                  orientation="horizontal"
                  colorBy="label"
                  sort={false}
                  responsiveWidth
                  height={Math.max(150, spending.topRecipients.length * 32)}
                  margin={{ top: 6, right: 30, bottom: 26, left: 172 }}
                  valueFormat={compactUSD}
                  showLegend={false}
                  frameProps={{ background: "transparent" }}
                  description={`Top federal award recipients in ${county?.countyName || "this county"} for fiscal year ${spending.fy}.`}
                />
              </ThemeProvider>
            </div>
          </div>
          <a
            className="local-gov-band-source"
            href="https://www.usaspending.gov/search"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore federal awards on USAspending.gov ↗
          </a>
        </div>
      )}
    </section>
  )
}

function MiniSparkline({ series, valueKey }) {
  if (!series || series.length < 2) return null
  const width = 100
  const height = 30
  const values = series.map((point) => point[valueKey] || 0)
  const max = Math.max(1, ...values)
  const step = width / (series.length - 1)
  const points = series.map((point, index) => [
    index * step,
    height - 2 - ((point[valueKey] || 0) / max) * (height - 4),
  ])
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg className="local-gov-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="local-gov-sparkline-fill" d={area} />
      <path className="local-gov-sparkline-line" d={line} fill="none" />
    </svg>
  )
}

function declarationTypeLabel(code) {
  return { DR: "Major disaster", EM: "Emergency", FM: "Fire management" }[code] || "Declaration"
}

function SourceStatus({ status, title, detail }) {
  const labels = {
    idle: "Waiting",
    loading: "Loading",
    live: "Live",
    snapshot: "Snapshot",
    fallback: "Fallback",
    unavailable: "No browser feed",
    "no-match": "No match",
    error: "Source error",
  }
  return (
    <div className={`local-gov-source-status is-${status}`}>
      <span><i aria-hidden="true" />{labels[status] || status}</span>
      <strong>{title}</strong>
      <small title={detail}>{detail}</small>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Control({ label, children }) {
  return (
    <label className="local-gov-control">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ChartHint({ active, locked }) {
  return (
    <span className="local-gov-chart-hint">
      {locked ? `Held: ${truncate(locked.label || locked.title, 28)}` : active ? truncate(active.label || active.title, 30) : "Hover to trace · click to hold"}
    </span>
  )
}

function Inspector({ active, connections, onRelease }) {
  if (!active) {
    return (
      <section className="local-gov-inspector is-empty">
        <div>
          <span className="local-gov-kicker">Shared inspector</span>
          <strong>Hover either chart to follow one civic object across the system.</strong>
        </div>
        <p>Click any node to keep its details and connected records in view.</p>
      </section>
    )
  }
  const topic = active.topic || (active.kind === "law" ? inferTopic(`${active.header} ${active.content}`) : null)
  return (
    <section className="local-gov-inspector">
      <span
        className="local-gov-inspector-mark"
        style={{ background: NODE_COLORS[active.kind] || NODE_COLORS.branch }}
      />
      <div className="local-gov-inspector-copy">
        <span className="local-gov-kicker">{active.kind}{topic ? ` · ${topic}` : ""}</span>
        <h3>{active.label || active.title}</h3>
        <p>{inspectorDetail(active)}</p>
      </div>
      <div className="local-gov-connections">
        <small>{connections.length} direct relationships</small>
        <div>
          {connections.slice(0, 5).map((connection) => (
            <span key={connection.id}>{connection.label}</span>
          ))}
        </div>
      </div>
      <div className="local-gov-inspector-actions">
        {active.sourceUrl && (
          <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a>
        )}
        <button type="button" onClick={onRelease}>Release</button>
      </div>
    </section>
  )
}

function NodeLegend() {
  const entries = [
    ["body", "Body / committee"],
    ["person", "Sponsor / official"],
    ["matter", "Matter / initiative"],
    ["meeting", "Meeting"],
    ["topic", "Topic bridge"],
    ["law", "LOCUS provision"],
  ]
  return (
    <div className="local-gov-node-legend" aria-label="Network node legend">
      {entries.map(([kind, label]) => (
        <span key={kind}><i style={{ background: NODE_COLORS[kind] }} />{label}</span>
      ))}
    </div>
  )
}

function ActivityRow({ item, eyebrow, title, detail, onSelect }) {
  return (
    <div className="local-gov-activity-row">
      <button type="button" onClick={onSelect}>
        <span className="local-gov-activity-date">{eyebrow}</span>
        <strong>{truncate(title, 105)}</strong>
        <small>{detail}</small>
      </button>
      {item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
          Source ↗
        </a>
      )}
    </div>
  )
}

function CoverageEmpty({ status, title, detail }) {
  return (
    <div className={`local-gov-coverage-empty is-${status}`}>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function MethodItem({ number, title, children }) {
  return (
    <div>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

function renderGovernmentTooltip(hover) {
  const datum = unwrapChartDatum(hover?.data || hover)
  if (!datum?.id) return null
  return (
    <div className="local-gov-tooltip">
      <span>{datum.kind}</span>
      <strong>{datum.label || datum.title}</strong>
      <small>{truncate(inspectorDetail(datum), 140)}</small>
    </div>
  )
}

function inspectorDetail(item) {
  if (item.kind === "law") {
    return truncate(item.content, 420) || "LOCUS law provision."
  }
  if (item.kind === "matter") {
    return `${item.status || "Status unavailable"} · ${item.bodyName || "Unassigned body"} · ${truncate(item.title, 320)}`
  }
  if (item.kind === "meeting") {
    return `${formatDate(item.date)} ${item.time || ""} · ${firstLine(item.location) || "Location unavailable"} · ${item.status || "agenda status unavailable"}`
  }
  return item.detail || item.title || item.label || "Local government record"
}

function connectionsFor(id, network) {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]))
  return network.edges.flatMap((edge) => {
    if (edge.source === id) {
      const target = nodes.get(edge.target)
      return target ? [{ ...target, relation: edge.relation }] : []
    }
    if (edge.target === id) {
      const source = nodes.get(edge.source)
      return source ? [{ ...source, relation: edge.relation }] : []
    }
    return []
  })
}

function networkLabel(node) {
  if (node.kind === "matter") return node.file || ""
  if (node.kind === "law") return ""
  if (node.kind === "meeting") return ""
  return truncate(node.label, 24)
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date TBD"
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/)[0]
}

function emptyHierarchy() {
  return {
    id: "empty",
    label: "Enter a ZIP code",
    kind: "jurisdiction",
    children: [],
  }
}

const chartContainerStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  boxShadow: "none",
}
