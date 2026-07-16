import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { SentenceFilter } from "semiotic/controls"
import { resolveReferenceGeography } from "semiotic/geo"
import { useReducedMotion } from "semiotic/utils"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  REPLAY_DATES,
  REPLAY_WINDOW,
  SERVICE_SYSTEMS,
  SOURCE_MANIFEST,
  THRESHOLDS,
  deriveSnapshot,
  ledgerRowsFor,
  networksFor,
  observationEvents,
  pulseSeriesFor,
} from "./living-ledger/livingLedgerData"
import {
  ALERT_META,
  DependencyEvidenceWeb,
  EvidenceLog,
  ExposureLabel,
  LivingLedgerMatrix,
  ObservationPipeline,
  PolicySignalBand,
  ServicePulse,
  ServiceSystemTable,
  ServiceFlowerBand,
  ServiceWeatherMap,
  ScienceEvidenceBand,
  StatusGlyph,
  TriageField,
  policyAction,
  serviceSystemId,
  systemLabel,
  systemRiskLevel,
} from "./living-ledger/LivingLedgerViews"
import "./LivingLedgerExamplePage.css"

const REPLAY_LENGTH = REPLAY_WINDOW?.days ?? REPLAY_DATES?.length ?? 180
const LAST_DAY = REPLAY_LENGTH - 1
const LEVEL_ORDER = ["observe", "watch", "warning", "action", "critical"]
const FLAGSHIP_PATTERNS = Object.freeze({
  coral: /coral|reef/i,
  forest: /forest|congo/i,
  pollination: /pollinat|central-valley/i,
})

const GUIDED_SCENES = Object.freeze([
  {
    id: "one-score",
    number: "01",
    day: 30,
    title: "The world is not one score",
    note: "Condition and adequacy begin in different places. The map never averages them into an Earth grade.",
    target: "coral",
    networkMode: "dependency",
  },
  {
    id: "observations",
    number: "02",
    day: 99,
    title: "Before there is a warning, there is an observation",
    note: "One late record waits. One failed unit check goes to quarantine. Monitoring has its own weather.",
    target: "coral",
    networkMode: "evidence",
  },
  {
    id: "threshold",
    number: "03",
    day: 112,
    title: "This threshold has an owner",
    note: "The reef crosses 4 °C-weeks. The line has units, scope, and an authority; it is not a red line drawn by vibes.",
    target: "coral",
    networkMode: "evidence",
  },
  {
    id: "disturbance",
    number: "04",
    day: 137,
    title: "Disturbance is evidence, not a conclusion",
    note: "The forest alert is credible. A climate-regulation failure is not yet observed, so the claim stops there.",
    target: "forest",
    networkMode: "evidence",
  },
  {
    id: "uncertainty",
    number: "05",
    day: 165,
    title: "Uncertainty does not mean unimportant",
    note: "Crop demand rises while habitat capacity declines. Managed hives cover part of the gap; the Watch stays modeled.",
    target: "pollination",
    networkMode: "dependency",
  },
  {
    id: "claim",
    number: "06",
    day: LAST_DAY,
    title: "Follow the claim in both directions",
    note: "Consequences run toward beneficiaries. Evidence runs back through observations, models, and the threshold registry.",
    target: "coral",
    networkMode: "evidence",
  },
])

const AUDIENCE_COPY = Object.freeze({
  public: {
    label: "Public",
    selectedEyebrow: "What changed",
    methodLabel: "Why the warning exists",
  },
  policy: {
    label: "Policy",
    selectedEyebrow: "Decision brief",
    methodLabel: "Decision basis",
  },
  science: {
    label: "Science",
    selectedEyebrow: "Selected serviceSystemId",
    methodLabel: "Evidence and threshold basis",
  },
})

const LENS_PANEL_COPY = Object.freeze({
  public: {
    triage: {
      code: "AT A GLANCE / 02",
      eyebrow: "Service balance",
      title: "Is nature still keeping up?",
      note: "Each mark compares the condition of nature with whether the service is keeping up for people.",
      footnote: "Mark size shows how many people or livelihoods are exposed. Color shows the alert level.",
    },
    pulse: {
      code: "WHAT CHANGED / 03",
      eyebrow: "Service story",
      title: "What has changed over time?",
      note: "Recorded values tell a clearer story than a single score. The alert line is a rule, not proof that the whole service has failed.",
    },
    pipeline: {
      code: "BEFORE A CLAIM / 06",
      eyebrow: "A careful evidence journey",
      title: "How a signal earns a claim",
      note: "A reading is checked before it can inform an indicator. Any unresolved record keeps the statement limited.",
    },
  },
  policy: {
    triage: {
      code: "DECISION POSTURE / 02",
      eyebrow: "Policy field",
      title: "Where should support go next?",
      note: "The four regions translate condition and adequacy into a decision posture. Exposure makes the reach visible without creating a global priority score.",
      footnote: "Point area is exposed reach. Outline weight is human supplementation. The tail shows the recent condition direction.",
    },
    pulse: {
      code: "DECISION HORIZON / 03",
      eyebrow: "Recorded signal and forecast",
      title: "What could require action next?",
      note: "Keep recorded values distinct from the forecast. The forecast can inform preparation, but it does not count as an observed outcome.",
    },
    pipeline: {
      code: "EVIDENCE OPERATIONS / 06",
      eyebrow: "Exception queue",
      title: "What needs attention before a decision?",
      note: "The queue separates records ready for an indicator from review, data-quality, and freshness work.",
    },
  },
  science: {
    triage: {
      code: "DIAGNOSTIC / 02",
      eyebrow: "Condition–adequacy evidence",
      title: "What does the evidence support?",
      note: "Confidence-scaled whiskers show condition uncertainty and tails show recent movement. Non-comparable services remain explicitly non-comparable.",
      footnote: "Whisker width reflects confidence, not a formal confidence interval. Symbols identify the evidence type behind the active signal.",
    },
    pulse: {
      code: "EVIDENCE TRAJECTORY / 03",
      eyebrow: "Observations, models, and gaps",
      title: "What does the indicator actually show?",
      note: "Observations, modeled values, forecasts, uncertainty, reference ranges, and stale periods stay separated so their roles can be inspected.",
    },
    pipeline: {
      code: "RECORD PROVENANCE / 06",
      eyebrow: "Selected-service event trace",
      title: "Which records support this claim?",
      note: "Each row traces one record through its actual gates, preserving source, unit, timing, and any review or failure.",
    },
  },
})

const SOURCE_MANIFEST_VALUE = SOURCE_MANIFEST ?? {}

export default function LivingLedgerExamplePage() {
  return (
    <ExamplePageLayout title="The Living Ledger">
      <LivingLedgerObservatory />
    </ExamplePageLayout>
  )
}

export function LivingLedgerObservatory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const reducedMotion = useReducedMotion()
  const initialSystemId =
    validSystemId(searchParams.get("system")) ??
    findFlagshipId("coral") ??
    serviceSystemId(SERVICE_SYSTEMS[0])
  const [dayIndex, setDayIndex] = useState(() =>
    clampDay(Number(searchParams.get("day") ?? LAST_DAY)),
  )
  const [selectedId, setSelectedId] = useState(initialSystemId)
  const [audience, setAudience] = useState(() => {
    const requestedAudience = searchParams.get("audience")
    if (requestedAudience === "operator") return "policy"
    return AUDIENCE_COPY[requestedAudience] ? requestedAudience : "public"
  })
  const [networkMode, setNetworkMode] = useState(() =>
    searchParams.get("web") === "evidence" ? "evidence" : "dependency",
  )
  const [filters, setFilters] = useState({
    count: searchParams.get("count") === "top3" ? "top3" : "all",
    serviceClass: searchParams.get("class") ?? "all",
    riskLevel: searchParams.get("risk") ?? "all",
    regionScope: searchParams.get("scope") ?? "all",
    period: Number(searchParams.get("period") ?? 180),
  })
  const [playing, setPlaying] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(-1)
  const [worldAreas, setWorldAreas] = useState(null)
  const [mapError, setMapError] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const previousAlertsRef = useRef(null)

  useEffect(() => {
    let alive = true
    resolveReferenceGeography("world-110m")
      .then((features) => {
        if (alive) setWorldAreas(features)
      })
      .catch(() => {
        if (alive) setMapError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setDayIndex((current) => {
        if (current >= LAST_DAY) {
          setPlaying(false)
          return LAST_DAY
        }
        return Math.min(LAST_DAY, current + 2)
      })
    }, 180)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set("system", selectedId)
        next.set("day", String(dayIndex))
        next.set("audience", audience)
        next.set("web", networkMode)
        next.set("count", filters.count)
        next.set("class", filters.serviceClass)
        next.set("risk", filters.riskLevel)
        next.set("scope", filters.regionScope)
        next.set("period", String(filters.period))
        return next
      },
      { replace: true },
    )
  }, [audience, dayIndex, filters, networkMode, selectedId, setSearchParams])

  const snapshot = useMemo(() => deriveSnapshot(dayIndex), [dayIndex])
  const allSystems = useMemo(() => snapshot.systems ?? snapshot.serviceSystems ?? [], [snapshot])

  useEffect(() => {
    const current = new Map(
      allSystems.map((system) => [serviceSystemId(system), systemRiskLevel(system)]),
    )
    const previous = previousAlertsRef.current
    previousAlertsRef.current = current
    if (!playing || !previous) return

    const changed = allSystems.find((system) => {
      const id = serviceSystemId(system)
      return previous.has(id) && previous.get(id) !== current.get(id)
    })
    if (!changed) return
    const id = serviceSystemId(changed)
    const from = ALERT_META[previous.get(id)]?.label ?? previous.get(id)
    const to = ALERT_META[current.get(id)]?.label ?? current.get(id)
    setAnnouncement(`${systemLabel(changed)} moved from ${from} to ${to}.`)
  }, [allSystems, playing])
  const preCountSystems = useMemo(
    () => filterServiceSystems(allSystems, filters),
    [allSystems, filters],
  )
  const visibleSystems = useMemo(() => {
    const sorted = [...preCountSystems].sort((a, b) => {
      const levelDelta =
        LEVEL_ORDER.indexOf(systemRiskLevel(b)) - LEVEL_ORDER.indexOf(systemRiskLevel(a))
      if (levelDelta) return levelDelta
      return (
        Number(b.risk?.exposure?.value ?? b.exposure?.value ?? b.exposed ?? 0) -
        Number(a.risk?.exposure?.value ?? a.exposure?.value ?? a.exposed ?? 0)
      )
    })
    return filters.count === "top3" ? sorted.slice(0, 3) : sorted
  }, [filters.count, preCountSystems])

  const selectedSystem =
    allSystems.find((system) => serviceSystemId(system) === selectedId) ?? allSystems[0]
  const selectedPulse = useMemo(
    () => pulseSeriesFor(serviceSystemId(selectedSystem), dayIndex),
    [dayIndex, selectedSystem],
  )
  const selectedLedger = useMemo(() => {
    const id = serviceSystemId(selectedSystem)
    const rows = ledgerRowsFor(id, dayIndex)
    const comparisonDay = Math.max(0, dayIndex - 30)
    const previous = new Map(ledgerRowsFor(id, comparisonDay).map((row) => [row.dimension, row]))
    return rows.map((row) => ({
      ...row,
      trend: ledgerTrend(
        row.estimate,
        previous.get(row.dimension)?.estimate,
        dayIndex - comparisonDay,
      ),
    }))
  }, [dayIndex, selectedSystem])
  const selectedNetworks = useMemo(
    () => networksFor(serviceSystemId(selectedSystem)),
    [selectedSystem],
  )
  const selectedThresholds = useMemo(
    () => selectedPulse?.thresholds ?? thresholdsForSystem(selectedSystem),
    [selectedPulse, selectedSystem],
  )
  const currentEvents =
    snapshot.events ??
    observationEvents.filter(
      (event) =>
        Number(event.arrivalDay ?? event.observedDay ?? event.dayIndex ?? event.day ?? 0) <=
        dayIndex,
    )
  const selectedSources = useMemo(() => sourcesForSystem(selectedSystem), [selectedSystem])
  const activeGraph =
    networkMode === "evidence"
      ? (selectedNetworks.evidence ?? selectedNetworks.howWeKnow ?? { nodes: [], edges: [] })
      : (selectedNetworks.dependency ??
        selectedNetworks.dependencies ??
        selectedNetworks.whatDepends ?? { nodes: [], edges: [] })
  const currentDate = REPLAY_DATES?.[dayIndex] ?? snapshot.date ?? ""
  const attentionCount = allSystems.filter((system) =>
    ["watch", "warning", "action", "critical"].includes(systemRiskLevel(system)),
  ).length
  const regionCount = new Set(
    visibleSystems.map((system) => system.bioregionName ?? system.regionName ?? system.bioregion),
  ).size
  const filterDefinitions = useMemo(
    () => sentenceDefinitions(preCountSystems.length, attentionCount, allSystems),
    [allSystems, attentionCount, preCountSystems.length],
  )

  const selectSystem = useCallback(
    (id, source = "control") => {
      if (!id) return
      setSelectedId(id)
      const system = allSystems.find((candidate) => serviceSystemId(candidate) === id)
      setAnnouncement(`${system ? systemLabel(system) : id} selected from ${source}.`)
    },
    [allSystems],
  )

  const chooseScene = useCallback((index) => {
    const scene = GUIDED_SCENES[index]
    if (!scene) return
    setPlaying(false)
    setSceneIndex(index)
    setDayIndex(clampDay(scene.day))
    setNetworkMode(scene.networkMode)
    const targetId = findFlagshipId(scene.target)
    if (targetId) setSelectedId(targetId)
    setAnnouncement(`Scene ${index + 1}: ${scene.title}. ${scene.note}`)
  }, [])

  const startReplay = useCallback(() => {
    setSceneIndex(-1)
    if (reducedMotion) {
      setDayIndex(LAST_DAY)
      setAnnouncement("Reduced motion is on. The replay moved directly to the end state.")
      return
    }
    if (dayIndex >= LAST_DAY) {
      previousAlertsRef.current = null
      setDayIndex(0)
    }
    setPlaying(true)
  }, [dayIndex, reducedMotion])

  const updateFilters = useCallback((nextFilters) => {
    setFilters({
      count: nextFilters.count,
      serviceClass: nextFilters.serviceClass,
      riskLevel: nextFilters.riskLevel,
      regionScope: nextFilters.regionScope,
      period: Number(nextFilters.period),
    })
  }, [])

  const selectAudience = useCallback((nextAudience) => {
    setAudience(nextAudience)
    if (nextAudience === "policy") setNetworkMode("dependency")
    if (nextAudience === "science") setNetworkMode("evidence")
    setAnnouncement(`${AUDIENCE_COPY[nextAudience].label} lens selected.`)
  }, [])

  if (!selectedSystem) {
    return <p role="alert">The bundled Living Ledger replay could not be read.</p>
  }

  const level = systemRiskLevel(selectedSystem)
  const alertMeta = ALERT_META[level] ?? ALERT_META.unknown
  const progress = Math.round(((dayIndex + 1) / REPLAY_LENGTH) * 100)
  const networkTitle = networkMode === "evidence" ? "How do we know?" : "What depends on this?"
  const panelCopy = LENS_PANEL_COPY[audience]
  const alertDeskTitle =
    audience === "policy"
      ? "The decisions that need an owner"
      : audience === "science"
        ? "The active claims to inspect"
        : "The claims that currently need attention"
  const alertDeskNote =
    audience === "policy"
      ? `${attentionCount} service systems are at Watch or higher. Each signal carries a next step, not a claim of outcome.`
      : audience === "science"
        ? `${attentionCount} service systems are at Watch or higher. Evidence freshness and confidence remain visible.`
        : `${attentionCount} service systems are at Watch or higher. Data-quality alerts stay separate.`

  return (
    <div
      className="living-ledger"
      data-audience={audience}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <header className="ll-masthead">
        <div className="ll-masthead-copy">
          <p className="ll-kicker">Ecosystem services / curated 180-day replay</p>
          <h2>The Living Ledger</h2>
          <p className="ll-deck">
            You think you&apos;re looking at a map of nature. You&apos;re not. You&apos;re looking
            at the work ecosystems do, who depends on it, and how sure we are that it is changing.
          </p>
          <p className="ll-deck-secondary">
            A forest can remain standing while a service declines. A service can keep working only
            because people and infrastructure are propping it up. And sometimes a satellite has seen
            a disturbance but nobody can honestly say yet what service has failed.
          </p>
        </div>
        <div className="ll-field-plate" aria-label="Replay status">
          <span>Field ledger 07 / 12</span>
          <strong>{formatReplayDate(currentDate)}</strong>
          <i>{String(progress).padStart(3, "0")}%</i>
          <p>A deterministic teaching dataset. It does not report current conditions.</p>
        </div>
      </header>

      <div className="ll-sticky-deck">
        {audience === "public" ? (
          <ServiceFlowerBand
            systems={visibleSystems}
            selectedId={selectedId}
            onSelect={selectSystem}
          />
        ) : audience === "policy" ? (
          <PolicySignalBand
            systems={visibleSystems}
            selectedId={selectedId}
            onSelect={selectSystem}
          />
        ) : (
          <ScienceEvidenceBand
            systems={visibleSystems}
            selectedId={selectedId}
            onSelect={selectSystem}
          />
        )}
        <section className="ll-control-deck" aria-label="Observatory controls">
          <div className="ll-transport">
            <button type="button" onClick={playing ? () => setPlaying(false) : startReplay}>
              {playing
                ? "Pause replay"
                : reducedMotion
                  ? "Show end state"
                  : dayIndex >= LAST_DAY
                    ? "Replay 180 days"
                    : "Continue replay"}
            </button>
            <button
              type="button"
              className="is-quiet"
              onClick={() => {
                setPlaying(false)
                setDayIndex(LAST_DAY)
                setSceneIndex(-1)
              }}
            >
              End state
            </button>
          </div>
          <label className="ll-scrubber">
            <span>
              Day {dayIndex + 1} / {REPLAY_LENGTH}
            </span>
            <input
              type="range"
              min="0"
              max={LAST_DAY}
              value={dayIndex}
              onChange={(event) => {
                setPlaying(false)
                setSceneIndex(-1)
                setDayIndex(Number(event.target.value))
              }}
            />
            <output>{formatReplayDate(currentDate)}</output>
          </label>
          <div className="ll-audience" role="group" aria-label="Audience mode">
            {Object.entries(AUDIENCE_COPY).map(([id, copy]) => (
              <button
                key={id}
                type="button"
                aria-pressed={audience === id}
                onClick={() => selectAudience(id)}
              >
                {copy.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <LedgerPanel className="ll-panel--map" header={false}>
        {mapError ? (
          <p role="alert" className="ll-map-error">
            The reference coastline did not load. The service-system table below still carries the
            same evidence.
          </p>
        ) : null}
        <ServiceWeatherMap
          areas={worldAreas}
          systems={visibleSystems}
          selectedId={selectedId}
          onSelect={selectSystem}
          audience={audience}
        />
        <MapLegend />
      </LedgerPanel>

      <AudienceBrief
        audience={audience}
        system={selectedSystem}
        sources={selectedSources}
        thresholds={selectedThresholds}
      />

      <div className="ll-sentence-dock">
        <span className="ll-sentence-label">Service sentence</span>
        <SentenceFilter
          as="h3"
          className="ll-sentence-filter"
          sentence="Show {count} {serviceClass} at {riskLevel} across {regionScope} during {period}."
          filters={filters}
          definitions={filterDefinitions}
          onChange={updateFilters}
          size="inherit"
          wrap
        />
        <p aria-live="polite">
          {visibleSystems.length} visible · {regionCount}{" "}
          {regionCount === 1 ? "bioregion" : "bioregions"}
        </p>
      </div>

      <nav className="ll-scene-rail" aria-label="Guided demonstration">
        <div className="ll-scene-rail-heading">
          <span>Optional field tour</span>
          <strong>
            {sceneIndex >= 0
              ? `Scene ${sceneIndex + 1} / ${GUIDED_SCENES.length}`
              : "Choose a claim"}
          </strong>
        </div>
        <ol>
          {GUIDED_SCENES.map((scene, index) => (
            <li key={scene.id}>
              <button
                type="button"
                className={sceneIndex === index ? "is-active" : ""}
                aria-current={sceneIndex === index ? "step" : undefined}
                onClick={() => chooseScene(index)}
              >
                <span>{scene.number}</span>
                <strong>{scene.title}</strong>
              </button>
            </li>
          ))}
        </ol>
        {sceneIndex >= 0 ? (
          <div className="ll-scene-note">
            <p>{GUIDED_SCENES[sceneIndex].note}</p>
            <button
              type="button"
              onClick={() => chooseScene((sceneIndex + 1) % GUIDED_SCENES.length)}
            >
              Next scene →
            </button>
          </div>
        ) : null}
      </nav>

      <section className="ll-selected-claim" aria-labelledby="ll-selected-title">
        <div className="ll-selected-mark">
          <StatusGlyph level={level} size={42} title={`${alertMeta.label} alert`} />
          <span>{alertMeta.label}</span>
        </div>
        <div className="ll-selected-copy">
          <span>{AUDIENCE_COPY[audience].selectedEyebrow}</span>
          <h3 id="ll-selected-title">{systemLabel(selectedSystem)}</h3>
          <p>{claimForAudience(selectedSystem, audience)}</p>
        </div>
        <dl className="ll-claim-facts">
          <div>
            <dt>Where</dt>
            <dd>
              {selectedSystem.bioregionName ??
                selectedSystem.regionName ??
                selectedSystem.bioregion}
            </dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>
              {selectedSystem.warningKindLabel ??
                formatIdentifier(
                  selectedSystem.alert?.warningKind ??
                    selectedSystem.warningKind ??
                    selectedSystem.alert?.kind,
                )}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{selectedSystem.risk?.confidence ?? selectedSystem.confidence ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Exposed</dt>
            <dd>
              <ExposureLabel system={selectedSystem} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="ll-alert-desk" aria-labelledby="ll-alert-desk-title">
        <header>
          <span>Alert desk</span>
          <h3 id="ll-alert-desk-title">{alertDeskTitle}</h3>
          <p>{alertDeskNote}</p>
        </header>
        <div className="ll-alert-list">
          {visibleSystems
            .filter((system) => systemRiskLevel(system) !== "observe")
            .map((system) => {
              const id = serviceSystemId(system)
              const systemLevel = systemRiskLevel(system)
              return (
                <button
                  key={id}
                  type="button"
                  className={id === selectedId ? "is-active" : ""}
                  aria-pressed={id === selectedId}
                  onClick={() => selectSystem(id, "alert desk")}
                >
                  <StatusGlyph level={systemLevel} size={20} />
                  <span>
                    <strong>{systemLabel(system)}</strong>
                    <small>{system.bioregionName ?? system.regionName ?? system.bioregion}</small>
                  </span>
                  <b>
                    {audience === "policy"
                      ? policyAction(system)
                      : audience === "science"
                        ? system.risk?.confidence ?? system.confidence ?? "low confidence"
                        : ALERT_META[systemLevel]?.label}
                  </b>
                </button>
              )
            })}
          {visibleSystems.every((system) => systemRiskLevel(system) === "observe") ? (
            <p>No visible service system is above Observe under this sentence.</p>
          ) : null}
        </div>
      </section>

      <div className="ll-hero-grid">
        <LedgerPanel
          className="ll-panel--triage"
          code={panelCopy.triage.code}
          eyebrow={panelCopy.triage.eyebrow}
          title={panelCopy.triage.title}
          note={panelCopy.triage.note}
        >
          <TriageField
            systems={visibleSystems}
            selectedId={selectedId}
            onSelect={selectSystem}
            audience={audience}
          />
          <p className="ll-chart-footnote">{panelCopy.triage.footnote}</p>
        </LedgerPanel>
      </div>

      <div className="ll-detail-grid">
        <LedgerPanel
          className="ll-panel--pulse"
          code={panelCopy.pulse.code}
          eyebrow={panelCopy.pulse.eyebrow}
          title={panelCopy.pulse.title}
          note={panelCopy.pulse.note}
        >
          <ServicePulse system={selectedSystem} pulse={selectedPulse} audience={audience} />
          <PulseKey audience={audience} />
        </LedgerPanel>

        <LedgerPanel
          className="ll-panel--ledger"
          code="SIX PARTS / 04"
          eyebrow="The Living Ledger"
          title="The service is not one number"
          note="Supply, demand, use, and value are related. They are not interchangeable. When the units do not line up, there is no ratio."
        >
          <LivingLedgerMatrix rows={selectedLedger} audience={audience} />
          <div className="ll-refusal-note">
            <span aria-hidden="true">≠</span>
            <p>
              {selectedSystem.supplyDemandComparable === false
                ? "Supply and demand use different units. No ratio calculated."
                : "Any adequacy ratio shown here is defined only inside this service model and is not transferable."}
            </p>
          </div>
        </LedgerPanel>
      </div>

      <div className="ll-evidence-grid">
        <LedgerPanel
          className="ll-panel--network"
          code="FORWARD / BACKWARD / 05"
          eyebrow="Dependency / Evidence Web"
          title={networkTitle}
          note="One network follows consequences forward. The other follows the claim backward."
          actions={
            <div className="ll-mode-switch" role="group" aria-label="Network question">
              <button
                type="button"
                aria-pressed={networkMode === "dependency"}
                onClick={() => setNetworkMode("dependency")}
              >
                What depends on this?
              </button>
              <button
                type="button"
                aria-pressed={networkMode === "evidence"}
                onClick={() => setNetworkMode("evidence")}
              >
                How do we know?
              </button>
            </div>
          }
        >
          <DependencyEvidenceWeb
            graph={activeGraph}
            mode={networkMode}
            reducedMotion={reducedMotion}
          />
        </LedgerPanel>

        <LedgerPanel
          className="ll-panel--pipeline"
          code={panelCopy.pipeline.code}
          eyebrow={panelCopy.pipeline.eyebrow}
          title={panelCopy.pipeline.title}
          note={panelCopy.pipeline.note}
        >
          <ObservationPipeline
            events={currentEvents}
            audience={audience}
            selectedId={selectedId}
          />
          <details className="ll-event-log" open={audience === "science"}>
            <summary>
              {audience === "science"
                ? "Read the selected-service records"
                : "Read the latest pipeline events"}
            </summary>
            <EvidenceLog
              events={
                audience === "science"
                  ? currentEvents.filter((event) => event.serviceSystemId === selectedId)
                  : currentEvents
              }
            />
          </details>
        </LedgerPanel>
      </div>

      <section className="ll-case-contrast" aria-labelledby="ll-case-contrast-title">
        <header>
          <span>Three warnings, three different claims</span>
          <h3 id="ll-case-contrast-title">This contrast is the point</h3>
        </header>
        <div>
          <CaseCard
            number="A"
            title="Heat stress crossed a line somebody can defend."
            kind="Registered threshold"
            body="Degree Heating Weeks reached a NOAA operational threshold. The accumulated heat is observed. Its effect on coastal protection is modeled, and the interface keeps that distinction visible."
            active={matchesFlagship(selectedId, "coral")}
            onClick={() => selectSystem(findFlagshipId("coral"), "case contrast")}
          />
          <CaseCard
            number="B"
            title="A tree-cover alert is not a service failure."
            kind="Disturbance event"
            body="Satellite observations found recent canopy disturbance. The event is high-confidence. What it means for climate regulation is not yet directly observed."
            active={matchesFlagship(selectedId, "forest")}
            onClick={() => selectSystem(findFlagshipId("forest"), "case contrast")}
          />
          <CaseCard
            number="C"
            title="The deficit is partly hidden by managed hives."
            kind="Modeled service gap"
            body="Crop demand rose while wild-pollinator habitat declined. Managed hives are carrying more of the load, so delivery looks steadier than ecological capacity."
            active={matchesFlagship(selectedId, "pollination")}
            onClick={() => selectSystem(findFlagshipId("pollination"), "case contrast")}
          />
        </div>
      </section>

      <section className="ll-method-grid">
        <details className="ll-provenance" open={audience === "science"}>
          <summary>Inspect the claim</summary>
          <div className="ll-provenance-body">
            <div>
              <span>{AUDIENCE_COPY[audience].methodLabel}</span>
              <h3>
                {selectedSystem.alert?.claim ??
                  selectedSystem.explanation ??
                  selectedSystem.claim ??
                  "This warning has a bounded evidence claim."}
              </h3>
              <p>
                {selectedSystem.alert?.caution ??
                  selectedSystem.caveat ??
                  "The replay keeps observed, modeled, and inferred links separate. It is illustrative, not a report of current conditions."}
              </p>
            </div>
            <ThresholdProvenance thresholds={selectedThresholds} />
            <SourceProvenance sources={selectedSources} />
          </div>
        </details>

        <details className="ll-accessible-projection">
          <summary>Read the service systems as a table</summary>
          <ServiceSystemTable
            systems={visibleSystems}
            selectedId={selectedId}
            onSelect={selectSystem}
          />
        </details>

        <div className="ll-download-row">
          <div>
            <span>Snapshot {SOURCE_MANIFEST_VALUE.snapshot ?? "living-ledger-2026-07"}</span>
            <p>
              Every source declares its role. A pressure does not get quietly renamed as an outcome.
            </p>
          </div>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(SOURCE_MANIFEST_VALUE, null, 2))}`}
            download="living-ledger-source-manifest.json"
          >
            Download source manifest
          </a>
        </div>
      </section>

      <footer className="ll-footer">
        <span>Field note 180</span>
        <p>No global health score. No gray-as-good. No pressure relabeled as outcome.</p>
      </footer>

      <p className="ll-live-announcement" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}

function LedgerPanel({
  code,
  eyebrow,
  title,
  note,
  actions,
  className = "",
  children,
  header = true,
}) {
  return (
    <section className={`ll-panel ${className}`.trim()}>
      {header ? (
        <header className="ll-panel-header">
          <div>
            <span>{code}</span>
            <p>{eyebrow}</p>
            <h3>{title}</h3>
            <small>{note}</small>
          </div>
          {actions}
        </header>
      ) : null}
      <div className="ll-panel-body">{children}</div>
    </section>
  )
}

function CaseCard({ number, kind, title, body, active, onClick }) {
  return (
    <article className={active ? "is-active" : ""}>
      <button type="button" onClick={onClick} aria-pressed={active}>
        <span>{number}</span>
        <small>{kind}</small>
        <h4>{title}</h4>
        <p>{body}</p>
        <b>Inspect this claim →</b>
      </button>
    </article>
  )
}

function AudienceBrief({ audience, system, sources, thresholds }) {
  const level = systemRiskLevel(system)
  const confidence = system.risk?.confidence ?? system.confidence ?? "low"
  const freshness = system.freshness ?? system.risk?.freshness ?? "unknown"
  if (audience === "policy") {
    return (
      <section className="ll-lens-brief ll-lens-brief--policy" aria-label="Policy decision brief">
        <div>
          <span>Policy lens</span>
          <h3>Move from warning to a named decision</h3>
          <p>
            The signal is a prioritization aid. It does not turn a pressure or a model into a
            confirmed outcome.
          </p>
        </div>
        <dl>
          <div>
            <dt>Next step</dt>
            <dd>{policyAction(system)}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{ALERT_META[level]?.label ?? level}</dd>
          </div>
          <div>
            <dt>Reach</dt>
            <dd>
              <ExposureLabel system={system} />
            </dd>
          </div>
        </dl>
      </section>
    )
  }

  if (audience === "science") {
    return (
      <section className="ll-lens-brief ll-lens-brief--science" aria-label="Scientific evidence brief">
        <div>
          <span>Science lens</span>
          <h3>Inspect the estimate before extending the claim</h3>
          <p>
            The compact profile above shows the condition estimate and its uncertainty range;
            inspect the evidence chain before treating an alert as a service failure.
          </p>
        </div>
        <dl>
          <div>
            <dt>Evidence</dt>
            <dd>{confidence} confidence · {freshness}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{sources.length} in scope</dd>
          </div>
          <div>
            <dt>Thresholds</dt>
            <dd>{thresholds.length || "None"} registered</dd>
          </div>
        </dl>
      </section>
    )
  }

  return (
    <section className="ll-lens-brief ll-lens-brief--public" aria-label="Public reading guide">
      <div>
        <span>Public lens</span>
        <h3>Start with the service people rely on</h3>
        <p>
          The flowers are service stations, not a score for nature. Choose one to see what is
          changing, where it matters, and how sure the evidence is.
        </p>
      </div>
      <dl>
        <div>
          <dt>Selected</dt>
          <dd>{systemLabel(system)}</dd>
        </div>
        <div>
          <dt>Who is affected</dt>
          <dd>
            <ExposureLabel system={system} />
          </dd>
        </div>
        <div>
          <dt>How sure</dt>
          <dd>{confidence}</dd>
        </div>
      </dl>
    </section>
  )
}

function MapLegend() {
  return (
    <div className="ll-map-legend" aria-label="Map encoding legend">
      <div>
        <i className="is-regulating" />
        Regulation + maintenance
      </div>
      <div>
        <i className="is-provisioning" />
        Provisioning
      </div>
      <div>
        <i className="is-relational" />
        Non-material
      </div>
      <div>
        <StatusGlyph level="watch" size={15} />
        Watch
      </div>
      <div>
        <StatusGlyph level="warning" size={15} />
        Warning
      </div>
      <div>
        <StatusGlyph level="action" size={15} />
        Action
      </div>
      <div>
        <StatusGlyph level="unknown" size={15} />
        Stale / unknown
      </div>
    </div>
  )
}

function PulseKey({ audience = "public" }) {
  const items =
    audience === "science"
      ? [
          ["is-observed", "observed"],
          ["is-modeled", "modeled"],
          ["is-forecast", "forecast"],
          ["is-reference", "reference envelope"],
          ["is-gap", "gap / stale"],
        ]
      : audience === "policy"
        ? [
            ["is-observed", "recorded signal"],
            ["is-forecast", "planning forecast"],
            ["is-threshold", "decision rule"],
          ]
        : [
            ["is-observed", "recorded change"],
            ["is-threshold", "alert rule"],
          ]
  return (
    <div className="ll-pulse-key" aria-label="Service Pulse legend">
      {items.map(([className, label]) => (
        <span key={className}>
          <i className={className} />
          {label}
        </span>
      ))}
    </div>
  )
}

function ThresholdProvenance({ thresholds }) {
  if (!thresholds.length) {
    return (
      <div className="ll-provenance-section">
        <span>Threshold registry</span>
        <p>
          No transferable hard threshold is registered for this system. Critical is unavailable
          here.
        </p>
      </div>
    )
  }
  return (
    <div className="ll-provenance-section">
      <span>Threshold registry</span>
      {thresholds.map((threshold) => (
        <dl key={threshold.id}>
          <div>
            <dt>Definition</dt>
            <dd>{threshold.label ?? threshold.id}</dd>
          </div>
          <div>
            <dt>Authority</dt>
            <dd>{threshold.provenance?.authority ?? "not supplied"}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>
              {threshold.scope?.ecosystemType ?? threshold.appliesTo?.ecosystemType ?? "local"}
            </dd>
          </div>
          <div>
            <dt>Aggregation</dt>
            <dd>
              {threshold.scope?.temporalAggregation ??
                threshold.appliesTo?.temporalAggregation ??
                "not supplied"}
            </dd>
          </div>
          <div>
            <dt>Transferable</dt>
            <dd>{threshold.provenance?.nonTransferable === false ? "yes" : "no, by default"}</dd>
          </div>
        </dl>
      ))}
    </div>
  )
}

function SourceProvenance({ sources }) {
  return (
    <div className="ll-provenance-section">
      <span>Evidence sources</span>
      <ul>
        {sources.length ? (
          sources.map((source) => (
            <li key={source.id}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.name ?? source.id}
                </a>
              ) : (
                <strong>{source.name ?? source.id}</strong>
              )}
              <small>
                {source.role ?? source.evidenceRole ?? source.evidenceRoles?.join(", ") ?? "source"}{" "}
                · {source.cadence ?? "bundled snapshot"}
              </small>
            </li>
          ))
        ) : (
          <li>No external source is assigned to this illustrative system.</li>
        )}
      </ul>
    </div>
  )
}

function sentenceDefinitions(preCount, attentionCount, systems) {
  const regions = new Set(
    systems.map((system) => system.bioregionName ?? system.regionName ?? system.bioregion),
  ).size
  return {
    count: {
      type: "select",
      label: "How many systems",
      options: [
        {
          value: "all",
          label: `all ${preCount}`,
          description: "Keep every system matching the rest of the sentence.",
        },
        {
          value: "top3",
          label: `the first ${Math.min(3, preCount)}`,
          description: "Keep the three highest triage levels, then exposure.",
        },
      ],
    },
    serviceClass: {
      type: "select",
      label: "Service family",
      options: [
        { value: "all", label: "service systems" },
        { value: "regulation-maintenance", label: "regulating services" },
        { value: "provisioning", label: "provisioning services" },
        { value: "non-material", label: "non-material services" },
      ],
    },
    riskLevel: {
      type: "select",
      label: "Alert level",
      options: [
        {
          value: "attention",
          label: `Watch or higher`,
          description: `${attentionCount} systems currently need attention.`,
        },
        { value: "watch", label: "Watch" },
        { value: "warning", label: "Warning" },
        { value: "action", label: "Action" },
        { value: "all", label: "all alert levels" },
        { value: "unknown", label: "unknown or stale" },
      ],
    },
    regionScope: {
      type: "select",
      label: "Geographic scope",
      options: [
        { value: "all", label: `${regions} bioregions` },
        { value: "flagship", label: "the three teaching regions" },
      ],
    },
    period: {
      type: "select",
      label: "Replay period",
      options: [
        { value: 30, label: "the last 30 days" },
        { value: 90, label: "the last 90 days" },
        { value: 180, label: "the full 180-day replay" },
      ],
    },
  }
}

function filterServiceSystems(systems, filters) {
  return systems.filter((system) => {
    const family =
      system.serviceDefinition?.section ??
      system.section ??
      (["regulation-maintenance", "provisioning", "non-material"].includes(system.serviceFamily)
        ? system.serviceFamily
        : "regulation-maintenance")
    if (filters.serviceClass !== "all" && family !== filters.serviceClass) return false
    const level = systemRiskLevel(system)
    if (
      filters.riskLevel === "attention" &&
      !["watch", "warning", "action", "critical"].includes(level)
    )
      return false
    if (
      filters.riskLevel !== "all" &&
      filters.riskLevel !== "attention" &&
      level !== filters.riskLevel
    )
      return false
    if (
      filters.regionScope === "flagship" &&
      !Object.keys(FLAGSHIP_PATTERNS).some((key) => matchesFlagship(serviceSystemId(system), key))
    )
      return false
    const evidenceAge = Number(system.evidenceAgeDays)
    return !Number.isFinite(evidenceAge) || evidenceAge < Number(filters.period ?? 180)
  })
}

function thresholdsForSystem(system) {
  const ids = new Set([
    ...(system?.thresholdIds ?? []),
    ...(system?.thresholds ?? []).map((threshold) =>
      typeof threshold === "string" ? threshold : threshold.id,
    ),
    ...(system?.thresholdEvaluations ?? []).map((evaluation) => evaluation.thresholdId),
  ])
  const serviceId = system?.serviceId
  return THRESHOLDS.filter(
    (threshold) =>
      ids.has(threshold.id) ||
      threshold.serviceSystemId === serviceSystemId(system) ||
      threshold.serviceId === serviceId ||
      threshold.indicatorId === system?.indicatorId,
  )
}

function sourcesForSystem(system) {
  const rolesBySource = new Map()
  const estimates = [
    system?.ecosystemCondition,
    ...Object.values(system?.eesv ?? {}),
    system?.risk?.exposure,
    system?.risk?.velocity,
  ].filter(Boolean)
  for (const estimate of estimates) {
    for (const sourceId of estimate.sourceIds ?? []) {
      const roles = rolesBySource.get(sourceId) ?? new Set()
      roles.add(estimate.evidenceRole)
      rolesBySource.set(sourceId, roles)
    }
  }
  return (SOURCE_MANIFEST_VALUE.sources ?? [])
    .filter((source) =>
      rolesBySource.size
        ? rolesBySource.has(source.id)
        : (source.serviceSystemIds ?? []).includes(serviceSystemId(system)),
    )
    .map((source) => ({
      ...source,
      evidenceRoles: [...(rolesBySource.get(source.id) ?? source.evidenceRoles ?? [])],
    }))
}

function claimForAudience(system, audience) {
  const claim = system.alert?.claim ?? system.claim ?? system.explanation
  if (audience === "science") {
    return (
      system.scientistClaim ??
      `${claim ?? "The claim is bounded by the evidence roles shown below."} ${system.alert?.serviceFailure ? "The claimed failure is directly observed." : "The claimed outcome remains bounded by the available evidence."}`
    )
  }
  if (audience === "policy") {
    return (
      system.policyClaim ??
      `${policyAction(system)}. ${claim ?? "Inspect persistence, exposure, and source freshness before acting."}`
    )
  }
  return (
    system.publicClaim ?? claim ?? "Select the evidence web to inspect how this warning was made."
  )
}

function findFlagshipId(key) {
  const pattern = FLAGSHIP_PATTERNS[key]
  if (!pattern) return null
  return (
    serviceSystemId(
      SERVICE_SYSTEMS.find((system) =>
        pattern.test(
          `${serviceSystemId(system)} ${systemLabel(system)} ${system.bioregionName ?? system.regionName ?? ""}`,
        ),
      ),
    ) || null
  )
}

function matchesFlagship(id, key) {
  const pattern = FLAGSHIP_PATTERNS[key]
  return pattern ? pattern.test(String(id)) || id === findFlagshipId(key) : false
}

function validSystemId(id) {
  return SERVICE_SYSTEMS.some((system) => serviceSystemId(system) === id) ? id : null
}

function clampDay(value) {
  return Math.max(0, Math.min(LAST_DAY, Number.isFinite(value) ? Math.round(value) : LAST_DAY))
}

function formatReplayDate(value) {
  if (!value) return "Replay date unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
}

function formatIdentifier(value) {
  return String(value ?? "not classified").replaceAll("-", " ")
}

function ledgerTrend(current, previous, period) {
  if (!current) return "not assessed"
  if (current.qualitative) {
    return current.qualitative === previous?.qualitative ? "qualitative record" : "record updated"
  }
  if (!Number.isFinite(current.value) || !Number.isFinite(previous?.value) || !period) {
    return "baseline observation"
  }
  const change = current.value - previous.value
  const percentage = previous.value
    ? Math.round((Math.abs(change) / Math.abs(previous.value)) * 100)
    : 0
  if (percentage < 1) return `steady / ${period} days`
  return `${change > 0 ? "↑" : "↓"} ${percentage}% / ${period} days`
}
