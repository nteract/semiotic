import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { BoxPlot, RidgelinePlot } from "semiotic"
import {
  buildReaderGrounding,
  configToJSX,
  getCapability,
  prepareChart,
  profileData,
  proposeVariant,
  registerVariantDiscovery,
  suggestCharts,
  suggestStretchCharts,
  toConfig,
  useConversationArc,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import {
  BIMODAL_PROPOSAL_ID,
  bimodalFixture,
  proposeBimodalRidgeline,
} from "../../talkDemos/bimodalVariant"
import recoveryArc from "../../../public/talk-demo-fixtures/conference-arc.json"
import "./ConferenceDemoPage.css"

const Kstreams = lazy(() => import("../../examples/recipes/Kstreams"))

const ARC_ID = "question-to-defensible-chart"
const CHART_ID = "service-latency"
const INTENT = ["distribution", "compare-categories"]
const VALUE_EXTENT = [0, 350]

const AI_TOOLING_AUDIENCE = {
  name: "AI-tooling developer",
  familiarity: {
    BarChart: 5,
    LineChart: 5,
    BoxPlot: 4,
    ViolinPlot: 3,
    RidgelinePlot: 2,
  },
  targets: {
    RidgelinePlot: {
      direction: "increase",
      weight: 2,
      reason: "the team needs to recognize multimodal latency before trusting a summary",
    },
  },
  exposureLevel: 1,
}

const STEPS = [
  { id: "question", eyebrow: "01 · Ask", title: "Question → candidates" },
  { id: "refuse", eyebrow: "02 · Guard", title: "Refuse the bad proposal" },
  { id: "scale", eyebrow: "03 · Scale", title: "Declare production reality" },
  { id: "audience", eyebrow: "04 · Receive", title: "Name the reader" },
  { id: "variant", eyebrow: "05 · Discover", title: "Reveal the second mode" },
  { id: "custom", eyebrow: "06 · Escape", title: "Keep the custom-chart exit" },
  { id: "proof", eyebrow: "07 · Prove", title: "Attach render evidence" },
  { id: "ground", eyebrow: "08 · Explain", title: "Ground the reader" },
  { id: "export", eyebrow: "09 · Hand off", title: "Export defensible JSX" },
]

const baseChartProps = {
  data: bimodalFixture.data,
  categoryAccessor: bimodalFixture.categoryAccessor,
  valueAccessor: bimodalFixture.valueAccessor,
  valueExtent: VALUE_EXTENT,
  chartId: CHART_ID,
  width: 760,
  height: 360,
}

const refusalInput = {
  component: "Scatterplot",
  props: {
    data: bimodalFixture.data,
    xAccessor: bimodalFixture.categoryAccessor,
    yAccessor: bimodalFixture.valueAccessor,
  },
}

function StatusPill({ tone = "neutral", children }) {
  return <span className={`conference-stage__pill conference-stage__pill--${tone}`}>{children}</span>
}

function CandidateList({ suggestions }) {
  return (
    <ol className="conference-stage__candidate-list" aria-label="Ranked chart candidates">
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.component}>
          <span className="conference-stage__rank">{String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>{suggestion.component}</strong>
            <small>{suggestion.reasons[0] ?? "Fits the profiled distribution."}</small>
          </span>
          <span className="conference-stage__score">{suggestion.score.toFixed(1)}</span>
        </li>
      ))}
    </ol>
  )
}

function EvidenceCard({ evidence, label }) {
  return (
    <div className="conference-stage__evidence-card">
      <span>{label}</span>
      <strong>{evidence.markCount} marks</strong>
      <StatusPill tone={evidence.empty ? "danger" : "success"}>
        {evidence.empty ? "empty" : "non-empty"}
      </StatusPill>
      <StatusPill tone={evidence.warnings.length ? "warning" : "success"}>
        {evidence.warnings.length} warnings
      </StatusPill>
    </div>
  )
}

export default function ConferenceDemoPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [refusal, setRefusal] = useState(null)
  const [declaredScale, setDeclaredScale] = useState(false)
  const [audienceOn, setAudienceOn] = useState(false)
  const [variantOn, setVariantOn] = useState(false)
  const [proofAttached, setProofAttached] = useState(false)
  const [groundingInspected, setGroundingInspected] = useState(false)
  const [exported, setExported] = useState(false)
  const [proposerReady, setProposerReady] = useState(false)
  const initializedArc = useRef(false)
  const { history, record, clear, sessionId } = useConversationArc({
    sessionId: "conference-stage-live",
    capacity: 100,
    disableOnUnmount: true,
  })

  const profile = useMemo(() => profileData(bimodalFixture.data), [])
  const neutralSuggestions = useMemo(
    () =>
      suggestCharts(bimodalFixture.data, {
        intent: INTENT,
        includeVariants: false,
        maxResults: 4,
      }),
    []
  )
  const productionSuggestions = useMemo(
    () =>
      suggestCharts(bimodalFixture.data, {
        intent: INTENT,
        includeVariants: false,
        maxResults: 4,
        scale: { rows: 50000, typicalCardinality: "low" },
      }),
    []
  )
  const audienceSuggestions = useMemo(
    () =>
      suggestCharts(bimodalFixture.data, {
        intent: INTENT,
        audience: AI_TOOLING_AUDIENCE,
        includeVariants: false,
        maxResults: 4,
      }),
    []
  )
  const stretchSuggestions = useMemo(
    () =>
      suggestStretchCharts(bimodalFixture.data, {
        intent: INTENT,
        audience: AI_TOOLING_AUDIENCE,
        maxResults: 2,
      }),
    []
  )

  useEffect(() => {
    const unregister = registerVariantDiscovery(proposeBimodalRidgeline)
    setProposerReady(true)
    return () => unregister()
  }, [])

  const variantProposal = useMemo(() => {
    if (!proposerReady) return null
    const capability = getCapability("BoxPlot")
    if (!capability) return null
    return proposeVariant("BoxPlot", capability, {
      profile,
      intent: "distribution",
      audience: AI_TOOLING_AUDIENCE,
    }).find(({ id }) => id === BIMODAL_PROPOSAL_ID)
  }, [profile, proposerReady])

  const variantProps = useMemo(
    () => variantProposal?.buildProps?.(profile),
    [profile, variantProposal]
  )
  const finalComponent = variantOn ? "RidgelinePlot" : "BoxPlot"
  const finalProps = useMemo(
    () =>
      variantOn
        ? {
            ...variantProps,
            valueExtent: VALUE_EXTENT,
            chartId: CHART_ID,
            width: 760,
            height: 360,
          }
        : baseChartProps,
    [variantOn, variantProps]
  )
  const grounding = useMemo(
    () =>
      buildReaderGrounding(finalComponent, finalProps, {
        audience: audienceOn ? AI_TOOLING_AUDIENCE : undefined,
        capability: getCapability(finalComponent),
      }),
    [audienceOn, finalComponent, finalProps]
  )
  const jsx = useMemo(
    () => configToJSX(toConfig(finalComponent, finalProps)),
    [finalComponent, finalProps]
  )
  const recoveryEvidence = useMemo(
    () =>
      recoveryArc.filter(
        (event) => event.type === "render-evidence"
      ),
    []
  )

  useEffect(() => {
    if (initializedArc.current) return
    initializedArc.current = true
    clear()
    record({
      type: "suggestion-shown",
      arcId: ARC_ID,
      intent: INTENT,
      components: neutralSuggestions.map(({ component }) => component),
      topScore: neutralSuggestions[0]?.score,
      audience: "general",
      meta: { source: "composed-stage" },
    })
  }, [clear, neutralSuggestions, record])

  const chooseBoxPlot = useCallback(() => {
    record({
      type: "suggestion-chosen",
      arcId: ARC_ID,
      component: "BoxPlot",
      rank: neutralSuggestions.findIndex(({ component }) => component === "BoxPlot") + 1,
      source: "user",
    })
    record({
      type: "chart-rendered",
      arcId: ARC_ID,
      component: "BoxPlot",
      chartId: CHART_ID,
    })
  }, [neutralSuggestions, record])

  const runRefusal = useCallback(() => {
    const result = prepareChart(refusalInput, {
      data: bimodalFixture.data,
      intent: INTENT,
    })
    setRefusal(result)
    record({
      type: "proposal-refused",
      arcId: ARC_ID,
      component: refusalInput.component,
      stage: "diagnosis",
      codes: result.diagnostics
        .filter(({ severity }) => severity === "error")
        .map(({ code }) => code),
      alternatives:
        result.repair?.status === "alternative"
          ? result.repair.alternatives.map(({ component }) => component)
          : [],
    })
  }, [record])

  const applyScale = useCallback(() => {
    setDeclaredScale(true)
    record({
      type: "chart-edited",
      arcId: ARC_ID,
      component: "BoxPlot",
      chartId: CHART_ID,
      changedProps: ["valueExtent"],
      meta: {
        beat: "scale",
        decision: "retain-linear-domain",
        declaredRows: 50000,
      },
    })
  }, [record])

  const applyAudience = useCallback(() => {
    setAudienceOn(true)
    record({
      type: "audience-set",
      arcId: ARC_ID,
      audience: "ai-tooling-developer",
      previous: "general",
    })
  }, [record])

  const applyVariant = useCallback(() => {
    setVariantOn(true)
    record({
      type: "chart-replaced",
      arcId: ARC_ID,
      from: "BoxPlot",
      to: "RidgelinePlot",
      reason: "variant-discovery",
      meta: { source: "model", fixture: bimodalFixture.id },
    })
    record({
      type: "chart-rendered",
      arcId: ARC_ID,
      component: "RidgelinePlot",
      chartId: CHART_ID,
    })
  }, [record])

  const attachProof = useCallback(() => {
    setProofAttached(true)
    const evidence = recoveryEvidence.find(
      ({ component }) => component === finalComponent
    )
    if (!evidence) return
    record({
      type: "render-evidence",
      arcId: ARC_ID,
      component: finalComponent,
      chartId: CHART_ID,
      markCount: evidence.markCount,
      empty: evidence.empty,
      warnings: evidence.warnings,
      meta: { source: "server-golden-fixture" },
    })
  }, [finalComponent, record, recoveryEvidence])

  const inspectGrounding = useCallback(() => {
    setGroundingInspected(true)
    record({
      type: "interrogation-asked",
      arcId: ARC_ID,
      component: finalComponent,
      query: bimodalFixture.question,
      contextSize: grounding.text.length,
    })
    record({
      type: "interrogation-answered",
      arcId: ARC_ID,
      component: finalComponent,
      answer: "Ingest and export each split into two separated latency clusters.",
      annotationCount: 0,
      latencyMs: 1300,
      meta: {
        source: "offline-grounding-replay",
        pixelsSeen: false,
      },
    })
  }, [finalComponent, grounding.text, record])

  const recordExport = useCallback(() => {
    setExported(true)
    record({
      type: "chart-exported",
      arcId: ARC_ID,
      component: finalComponent,
      format: "jsx",
    })
  }, [finalComponent, record])

  const downloadLiveArc = useCallback(() => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "conference-stage-live-arc.json"
    link.click()
    URL.revokeObjectURL(url)
  }, [history])

  const step = STEPS[activeStep]
  const suggestions = audienceOn ? audienceSuggestions : neutralSuggestions

  return (
    <PageLayout
      title="From a Question to a Chart You Can Defend"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/capabilities" },
        { label: "Conference Demo", path: "/intelligence/conference-demo" },
      ]}
      prevPage={{ title: "Chart Suggestions", path: "/intelligence/suggestions" }}
      nextPage={{ title: "Conversation Arc", path: "/intelligence/conversation-arc" }}
    >
      <p className="conference-stage__lede">
        The complete offline Stage C talk path, composed on one local surface.
        Every decision uses committed data and Semiotic&apos;s real suggestion,
        refusal, variant, grounding, and serialization APIs. The captured answer
        remains explicitly labeled as a recovery replay, not model evidence.
      </p>

      <aside className="conference-stage__fallback" aria-labelledby="conference-fallback-title">
        <div>
          <span>Recorded recovery package</span>
          <h2 id="conference-fallback-title">The same arc, ready when the room is not</h2>
          <p>
            This MP4 and its three keyframes were captured from the local demo
            while external requests were blocked.
          </p>
          <nav aria-label="Conference demo keyframes">
            <a href="/talk-demo-recordings/keyframe-01-candidates.png">Candidates</a>
            <a href="/talk-demo-recordings/keyframe-02-variant.png">Variant</a>
            <a href="/talk-demo-recordings/keyframe-03-handoff.png">Handoff</a>
          </nav>
        </div>
        <video
          controls
          preload="metadata"
          poster="/talk-demo-recordings/keyframe-01-candidates.png"
        >
          <source
            src="/talk-demo-recordings/conference-stage.mp4"
            type="video/mp4"
          />
        </video>
      </aside>

      <div className="conference-stage" data-demo="conference-stage">
        <header className="conference-stage__header">
          <div>
            <span className="conference-stage__kicker">October 2026 · local stage</span>
            <h2>{step.title}</h2>
          </div>
          <div className="conference-stage__session">
            <span>live arc</span>
            <strong>{history.length} events</strong>
            <small>{sessionId ?? "starting"}</small>
          </div>
        </header>

        <nav className="conference-stage__rail" aria-label="Conference demo beats">
          {STEPS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={index === activeStep ? "is-active" : ""}
              aria-current={index === activeStep ? "step" : undefined}
              onClick={() => setActiveStep(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.title}
            </button>
          ))}
        </nav>

        <main className="conference-stage__body" data-stage-beat={step.id}>
          <div className="conference-stage__eyebrow">{step.eyebrow}</div>

          {step.id === "question" && (
            <section>
              <blockquote>{bimodalFixture.question}</blockquote>
              <div className="conference-stage__split">
                <CandidateList suggestions={suggestions} />
                <div className="conference-stage__preview">
                  <BoxPlot
                    {...baseChartProps}
                    width={520}
                    height={300}
                    title="A defensible baseline"
                  />
                </div>
              </div>
              <div className="conference-stage__actions">
                <button type="button" onClick={chooseBoxPlot}>Choose BoxPlot baseline</button>
                <StatusPill>{profile.rowCount} rows · 3 services</StatusPill>
              </div>
            </section>
          )}

          {step.id === "refuse" && (
            <section>
              <p>
                The generated proposal maps a categorical service name to a
                scatterplot x-axis. The trust loop must stop before paint.
              </p>
              <pre>{`<Scatterplot xAccessor="service" yAccessor="latencyMs" />`}</pre>
              <div className="conference-stage__actions">
                <button type="button" onClick={runRefusal}>Run deterministic refusal</button>
                {refusal && (
                  <StatusPill tone={refusal.ok ? "danger" : "success"}>
                    {refusal.ok ? "unexpectedly accepted" : "blocked · do not paint"}
                  </StatusPill>
                )}
              </div>
              {refusal && (
                <div className="conference-stage__result" role="status">
                  <strong>
                    {refusal.diagnostics
                      .filter(({ severity }) => severity === "error")
                      .map(({ code }) => code)
                      .join(", ")}
                  </strong>
                  <p>{refusal.reasons[0]}</p>
                  <small>
                    Repair route:{" "}
                    {refusal.repair?.status === "alternative"
                      ? refusal.repair.alternatives
                          .slice(0, 3)
                          .map(({ component }) => component)
                          .join(" → ")
                      : "none"}
                  </small>
                </div>
              )}
            </section>
          )}

          {step.id === "scale" && (
            <section>
              <p>
                The rehearsal sample has 36 rows; production declares 50,000.
                The engine re-scores against that declared band, while the chart
                keeps the honest 0–350 ms linear comparison domain.
              </p>
              <div className="conference-stage__scale-grid">
                <div>
                  <span>Measured sample</span>
                  <strong>{neutralSuggestions[0]?.component}</strong>
                  <small>{profile.rowCount} rows</small>
                </div>
                <div>
                  <span>Declared production</span>
                  <strong>{productionSuggestions[0]?.component}</strong>
                  <small>50,000 rows</small>
                </div>
                <div>
                  <span>Comparison domain</span>
                  <strong>0–350 ms</strong>
                  <small>linear · retained</small>
                </div>
              </div>
              <div className="conference-stage__actions">
                <button type="button" onClick={applyScale}>Apply production declaration</button>
                {declaredScale && <StatusPill tone="success">scale decision recorded</StatusPill>}
              </div>
            </section>
          )}

          {step.id === "audience" && (
            <section>
              <p>
                The reader is an AI-tooling developer: comfortable with the
                baseline, deliberately stretching toward multimodal views.
                The policy and its rationale stay inspectable.
              </p>
              <div className="conference-stage__audience-card">
                <span>governed audience profile</span>
                <strong>{AI_TOOLING_AUDIENCE.name}</strong>
                <p>{AI_TOOLING_AUDIENCE.targets.RidgelinePlot.reason}</p>
              </div>
              <CandidateList suggestions={suggestions} />
              {stretchSuggestions[0] && (
                <p className="conference-stage__stretch">
                  Stretch rail: <strong>{stretchSuggestions[0].suggestion.component}</strong>
                  {" — "}
                  {stretchSuggestions[0].rationale}
                </p>
              )}
              <div className="conference-stage__actions">
                <button type="button" onClick={applyAudience}>Target this reader</button>
                {audienceOn && <StatusPill tone="success">audience applied</StatusPill>}
              </div>
            </section>
          )}

          {step.id === "variant" && (
            <section>
              <div className="conference-stage__chart">
                {variantOn && variantProps ? (
                  <RidgelinePlot
                    {...finalProps}
                    width={760}
                    height={360}
                    title="Ridgeline reveals the separated latency modes"
                  />
                ) : (
                  <BoxPlot
                    {...baseChartProps}
                    width={760}
                    height={360}
                    title="BoxPlot baseline"
                  />
                )}
              </div>
              <div className="conference-stage__proposal">
                <StatusPill tone="warning">source: model · committed replay</StatusPill>
                <strong>{variantProposal?.label ?? "Registering proposer…"}</strong>
                <p>{variantProposal?.rationale}</p>
              </div>
              <div className="conference-stage__actions">
                <button
                  type="button"
                  disabled={!variantProps || variantOn}
                  onClick={applyVariant}
                >
                  Render proposed RidgelinePlot
                </button>
                {variantOn && <StatusPill tone="success">variant admitted</StatusPill>}
              </div>
            </section>
          )}

          {step.id === "custom" && (
            <section>
              <p>
                The catalog is not a ceiling. The deterministic Kafka topology
                keeps domain-owned layout, glyphs, linked selection, and
                snapshot morphing on the same chart substrate.
              </p>
              <div className="conference-stage__custom">
                <Suspense fallback={<p>Loading the local custom-chart chunk…</p>}>
                  <Kstreams />
                </Suspense>
              </div>
            </section>
          )}

          {step.id === "proof" && (
            <section>
              <p>
                These recovery values are committed server-render evidence,
                guarded by a fixture test that re-renders each config and
                compares mark count, emptiness, and warning codes.
              </p>
              <div className="conference-stage__evidence-grid">
                {recoveryEvidence.map((event) => (
                  <EvidenceCard
                    key={event.component}
                    evidence={event}
                    label={event.component}
                  />
                ))}
              </div>
              <div className="conference-stage__actions">
                <button type="button" onClick={attachProof}>Attach proof to live arc</button>
                {proofAttached && <StatusPill tone="success">proof attached</StatusPill>}
              </div>
            </section>
          )}

          {step.id === "ground" && (
            <section>
              <p>
                Reader grounding is built live from the surviving chart. The
                answer below is a committed text-only recovery response:
                pixels were not seen, and no benchmark claim is implied.
              </p>
              <div className="conference-stage__grounding">
                <span>grounding.text</span>
                <p>{grounding.text}</p>
              </div>
              <div className="conference-stage__actions">
                <button type="button" onClick={inspectGrounding}>Inspect grounding replay</button>
                {groundingInspected && (
                  <StatusPill tone="warning">offline-grounding-replay · pixelsSeen: false</StatusPill>
                )}
              </div>
              {groundingInspected && (
                <div className="conference-stage__answer" role="status">
                  <strong>Recovered answer</strong>
                  <p>Ingest and export each split into two separated latency clusters.</p>
                </div>
              )}
            </section>
          )}

          {step.id === "export" && (
            <section>
              <p>
                The output is generated from the same surviving config. The
                code, chart, grounding payload, and recorded decisions all name
                one component and one data contract.
              </p>
              <pre className="conference-stage__jsx">{jsx}</pre>
              <div className="conference-stage__actions">
                <button type="button" onClick={recordExport}>Mark JSX exported</button>
                <button
                  type="button"
                  className="conference-stage__secondary"
                  onClick={downloadLiveArc}
                >
                  Download live arc
                </button>
                {exported && <StatusPill tone="success">handoff recorded</StatusPill>}
              </div>
              <p className="conference-stage__recovery-note">
                Recovery is the typed, Playwright-recorded{" "}
                <code>conference-arc.json</code> ({recoveryArc.length} events),
                captured from this exact rehearsal path.
              </p>
            </section>
          )}
        </main>

        <footer className="conference-stage__footer">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((index) => Math.max(0, index - 1))}
          >
            Previous beat
          </button>
          <span>{activeStep + 1} / {STEPS.length}</span>
          <button
            type="button"
            disabled={activeStep === STEPS.length - 1}
            onClick={() =>
              setActiveStep((index) => Math.min(STEPS.length - 1, index + 1))
            }
          >
            Next beat
          </button>
        </footer>
      </div>
    </PageLayout>
  )
}
