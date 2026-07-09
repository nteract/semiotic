import React, { useMemo, useState } from "react"
import { ProcessFlowChart } from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./MergePressureExamplePage.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 720
const FRAME_HEIGHT = 440

const PRESETS = {
  chapter1: {
    id: "chapter1",
    chapter: 1,
    label: "Chapter 1: The Old Bottleneck was Coding",
    short: "1. Coding-Limited",
    description:
      "Before AI assistance, humans wrote code slowly. Review gates were relaxed, and features shipped steadily as PRs emerged slowly enough that review remained under capacity.",
    aiCodingMultiplier: 1.0,
    reviewerCount: 3,
    aiReviewQuality: 0,
    routing: 0.5,
    prsPerFeature: 2,
    ciStrength: 0.6,
    mergeConservatism: 0.5,
    seed: 42,
  },
  chapter2: {
    id: "chapter2",
    chapter: 2,
    label: "Chapter 2: AI Multipliers Surge PR Output",
    short: "2. Emitter Surge",
    description:
      "When developers adopt AI assistants, code generation accelerates. PRs stream in faster and features fragment, causing the review gate to stack up and shipping velocity to stall.",
    aiCodingMultiplier: 3.5,
    reviewerCount: 3,
    aiReviewQuality: 0.1,
    routing: 0.3,
    prsPerFeature: 6,
    ciStrength: 0.5,
    mergeConservatism: 0.7,
    seed: 92,
  },
  chapter3: {
    id: "chapter3",
    chapter: 3,
    label: "Chapter 3: PR Count is Not Product Velocity",
    short: "3. Coordination Debt",
    description:
      "Features fragment into multiple PRs. A feature only ships when ALL its PRs are merged. AI-assisted fragmentation creates a high 'false progress' gap where the app shell stalls.",
    aiCodingMultiplier: 3.5,
    reviewerCount: 3,
    aiReviewQuality: 0.1,
    routing: 0.3,
    prsPerFeature: 5,
    ciStrength: 0.5,
    mergeConservatism: 0.7,
    seed: 123,
  },
  chapter4: {
    id: "chapter4",
    chapter: 4,
    label: "Chapter 4: AI Pre-Review Helps or Adds Noise",
    short: "4. The Pipeline",
    description:
      "Adding AI pre-review can scan and route PRs, but low-precision AI reviews emit noisy comments, creating additional revision loops and drag for human reviewers.",
    aiCodingMultiplier: 3.5,
    reviewerCount: 4,
    aiReviewQuality: 0.4,
    routing: 0.5,
    prsPerFeature: 5,
    ciStrength: 0.7,
    mergeConservatism: 0.6,
    seed: 154,
  },
  chapter5: {
    id: "chapter5",
    chapter: 5,
    label: "Chapter 5: Scaling the System (Sandbox)",
    short: "5. Sandbox",
    description:
      "Widen human review capacity, specialize routing, improve AI reviewer quality, or reduce PR sizes. Balance the system to turn code generation into shippable features.",
    aiCodingMultiplier: 3.5,
    reviewerCount: 6,
    aiReviewQuality: 0.8,
    routing: 0.8,
    prsPerFeature: 4,
    ciStrength: 0.8,
    mergeConservatism: 0.5,
    seed: 200,
  },
}

const PRESET_ORDER = ["chapter1", "chapter2", "chapter3", "chapter4", "chapter5"]

const FEATURES = [
  { id: "auth", label: "Auth", parts: ["backend", "frontend", "tests", "docs"] },
  { id: "billing", label: "Billing", parts: ["schema", "payments", "alerts", "tests"] },
  { id: "search", label: "Search", parts: ["index", "ranking", "UI", "load tests"] },
  { id: "notifications", label: "Notifications", parts: ["queue", "email", "prefs", "observability"] },
  { id: "admin", label: "Admin", parts: ["roles", "audit", "tables", "docs"] },
]

const AUTHOR_TYPES = {
  human: { label: "Human PR", color: "#64748b" },
  human_ai_assisted: { label: "Human + AI PR", color: "#0c7894" },
  ai_agent: { label: "AI-agent PR", color: "#7c3aed" },
}

function mulberry32(seed) {
  let value = seed
  return function nextRandom() {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function effectiveScenario(settings) {
  const codingVelocity = 8 * settings.aiCodingMultiplier
  const aiWorkReduction = settings.aiReviewQuality * 0.33
  const routingLift = 0.78 + settings.routing * 0.44
  const humanCapacity = settings.reviewerCount * 4.7
  const aiReviewCapacity = settings.aiReviewQuality * 11
  const reviewCapacity = humanCapacity * routingLift + aiReviewCapacity
  const fragmentationLoad = 0.72 + settings.prsPerFeature * 0.13
  const ciLoad = 1.08 - settings.ciStrength * 0.2
  const reviewDemand = codingVelocity * fragmentationLoad * ciLoad * (1 - aiWorkReduction)
  const reviewPressure = reviewDemand / Math.max(1, reviewCapacity)
  const noisyComments = Math.max(
    0,
    settings.aiReviewQuality > 0
      ? (1 - settings.aiReviewQuality) * settings.aiCodingMultiplier * settings.prsPerFeature * 0.32
      : 0,
  )
  const reworkRate = clamp(
    0.08 + reviewPressure * 0.12 + noisyComments * 0.035 - settings.ciStrength * 0.08 - settings.routing * 0.05,
    0.03,
    0.72,
  )
  const reviewVelocity = Math.min(reviewDemand, reviewCapacity) * (1 - reworkRate * 0.22)
  const integrationPenalty = settings.mergeConservatism * 0.12 + Math.max(0, reviewPressure - 1) * 0.18
  const mergeVelocity = Math.max(1, Math.min(codingVelocity, reviewVelocity) * (1 - integrationPenalty))
  return {
    ...settings,
    aiReviewCapacity,
    codingVelocity,
    humanCapacity,
    integrationPenalty,
    noisyComments,
    reviewCapacity,
    reviewDemand,
    reviewPressure,
    reviewVelocity,
    mergeVelocity,
    reworkRate,
  }
}

function authorForScenario(scenario, index) {
  if (scenario.aiCodingMultiplier <= 1.15) return "human"
  if (scenario.chapter === 3 && index % 7 === 0) return "human"
  if (scenario.aiReviewQuality > 0.55 && index % 3 === 0) return "ai_agent"
  return index % 2 === 0 ? "human_ai_assisted" : "ai_agent"
}

/**
 * Stage assignment encodes the narrative: coding-limited systems pile up early;
 * review-limited systems pile at review; chapter 3 leaves feature members almost
 * merged so the all-members completion rule is visible.
 */
function stageForPR(featureMode, prIndex, prCount, scenario, random) {
  if (featureMode === "blocked-almost") {
    if (prIndex === prCount - 1) return random() < 0.55 ? "review" : "revision"
    return "merged"
  }
  if (featureMode === "complete") return "merged"

  const pressure = scenario.reviewPressure
  const roll = random()
  if (pressure < 0.85) {
    if (roll < 0.22) return "coding"
    if (roll < 0.4) return "ci"
    if (roll < 0.62) return "review"
    if (roll < 0.72) return "revision"
    return "merged"
  }
  if (roll < 0.12) return "coding"
  if (roll < 0.28) return "ci"
  if (roll < 0.28 + Math.min(0.45, 0.2 + pressure * 0.18)) return "review"
  if (roll < 0.78) return "revision"
  return "merged"
}

function featurePlan(scenario) {
  if (scenario.chapter === 3) {
    return FEATURES.map((feature) => {
      if (feature.id === "auth" || feature.id === "billing" || feature.id === "search") {
        return { ...feature, mode: "blocked-almost" }
      }
      return { ...feature, mode: "in-progress" }
    })
  }
  const completionPotential = clamp(
    0.18 + (scenario.mergeVelocity / Math.max(1, scenario.codingVelocity)) * 0.78 - Math.max(0, scenario.reviewPressure - 1) * 0.22,
    0,
    0.94,
  )
  const completedFeatures = Math.floor(FEATURES.length * completionPotential)
  return FEATURES.map((feature, index) => ({
    ...feature,
    mode: index < completedFeatures ? "complete" : "in-progress",
  }))
}

function buildPullRequests(scenario) {
  const random = mulberry32(scenario.seed + 17)
  const plan = featurePlan(scenario)
  const prs = []
  let globalIndex = 0

  for (const feature of plan) {
    const count =
      feature.mode === "blocked-almost" && feature.id === "auth"
        ? 1
        : feature.mode === "blocked-almost" && feature.id === "search"
          ? Math.max(scenario.prsPerFeature, 8)
          : Math.max(1, Math.round(scenario.prsPerFeature + (random() - 0.5) * 1.4))

    for (let prIndex = 0; prIndex < count; prIndex += 1) {
      const authorType = authorForScenario(scenario, globalIndex)
      const stage = stageForPR(feature.mode, prIndex, count, scenario, random)
      const part = feature.parts[prIndex % feature.parts.length]
      const reviewWork =
        (authorType === "ai_agent" ? 0.7 : authorType === "human_ai_assisted" ? 1.05 : 1.25) *
        (0.75 + random() * 0.9) *
        (1 + scenario.reviewPressure * 0.08)
      prs.push({
        id: `${feature.id}-pr-${prIndex}`,
        featureId: feature.id,
        featureLabel: feature.label,
        part,
        stage,
        authorType,
        reviewWork,
        risk: clamp(0.2 + random() * 0.7 + (authorType === "ai_agent" ? 0.12 : 0), 0.05, 1),
        radius: authorType === "ai_agent" ? 5.5 : authorType === "human_ai_assisted" ? 6.5 : 7.2,
      })
      globalIndex += 1
    }
  }
  return prs
}

function buildStages(scenario) {
  const reviewCapacity = scenario.reviewCapacity
  return [
    {
      id: "coding",
      label: "Coding",
      description: "PRs emerge from human and AI-assisted authors.",
      force: 10 + scenario.aiCodingMultiplier * 4,
      share: 1.1,
    },
    {
      id: "ci",
      label: "CI",
      description: "Automated checks. Stronger CI lowers downstream rework.",
      force: 12 + scenario.ciStrength * 10,
      damping: 0.06 - scenario.ciStrength * 0.02,
      share: 0.9,
    },
    {
      id: "review",
      label: "Review",
      description: "Capacitated human + AI review. Pressure rises when demand exceeds capacity.",
      capacity: { unitsPerSecond: reviewCapacity, unitAccessor: "reviewWork" },
      pressure: {
        pressure: scenario.reviewPressure,
        baseDamping: 0.08 + scenario.noisyComments * 0.01,
        dampingPerUnit: 0.1,
        energyPerUnit: 0.4,
      },
      force: 8 + scenario.routing * 18,
      share: 1.35,
    },
    {
      id: "revision",
      label: "Revision",
      description: "Rejected work loops back toward coding.",
      portal: { targetStageId: "coding", force: { x: -48, y: -8 } },
      damping: 0.1,
      share: 0.85,
    },
    {
      id: "merged",
      label: "Merged",
      description: "Absorbing basin. A feature ships only when every member PR is here.",
      absorb: true,
      force: 26,
      share: 1.0,
    },
  ]
}

function deriveMetrics(scenario, prs) {
  const byStage = Object.fromEntries(
    ["coding", "ci", "review", "revision", "merged"].map((id) => [id, 0]),
  )
  const byFeature = new Map()
  for (const pr of prs) {
    byStage[pr.stage] = (byStage[pr.stage] ?? 0) + 1
    const bag = byFeature.get(pr.featureId) ?? { total: 0, merged: 0, label: pr.featureLabel }
    bag.total += 1
    if (pr.stage === "merged") bag.merged += 1
    byFeature.set(pr.featureId, bag)
  }
  const features = Array.from(byFeature.entries()).map(([id, bag]) => ({
    id,
    label: bag.label,
    total: bag.total,
    merged: bag.merged,
    complete: bag.total > 0 && bag.merged === bag.total,
    almost: bag.merged / Math.max(1, bag.total) >= 0.75 && bag.merged < bag.total,
  }))
  const shipped = features.filter((feature) => feature.complete).length
  const almost = features.filter((feature) => feature.almost).length
  return {
    byStage,
    features,
    shipped,
    almost,
    prCount: prs.length,
    mergedShare: prs.length ? byStage.merged / prs.length : 0,
    falseProgress: almost > 0 && shipped < features.length,
  }
}

const implementationCode = `import { ProcessFlowChart } from "semiotic/physics"

// Work items (PRs) + ordered stages. Features complete only when every
// member reaches the absorb stage — average progress is not enough.
const stages = [
  { id: "coding", label: "Coding", force: 14 },
  { id: "ci", label: "CI", force: 16 },
  {
    id: "review",
    label: "Review",
    capacity: { unitsPerSecond: reviewCapacity, unitAccessor: "reviewWork" },
    pressure: { pressure: reviewPressure },
  },
  { id: "revision", label: "Revision", portal: { targetStageId: "coding" } },
  { id: "merged", label: "Merged", absorb: true },
]

<ProcessFlowChart
  data={prs}
  idAccessor="id"
  stageAccessor="stage"
  groupBy="featureId"
  groupLabelAccessor="featureLabel"
  workAccessor="reviewWork"
  colorBy="authorType"
  stages={stages}
  groupCompletion="allAbsorbed"
  showChrome
  showProjection
/>
`

export default function MergePressureExamplePage() {
  const [width, hostRef] = useResponsiveWidth(MIN_WIDTH, MAX_WIDTH)
  const [settings, setSettings] = useState(PRESETS.chapter1)
  const [runId, setRunId] = useState(0)
  const [capacityStats, setCapacityStats] = useState([])

  const isLocked = settings.chapter !== 5
  const scenario = useMemo(() => effectiveScenario(settings), [settings])
  const prs = useMemo(() => buildPullRequests(scenario), [scenario, runId])
  const stages = useMemo(() => buildStages(scenario), [scenario])
  const metrics = useMemo(() => deriveMetrics(scenario, prs), [scenario, prs])
  const chartWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      id: "sandbox",
      chapter: 5,
      label: "Chapter 5: Scaling the System (Sandbox)",
      short: "5. Sandbox",
      description: PRESETS.chapter5.description,
      [key]: value,
    }))
    setRunId((current) => current + 1)
  }

  return (
    <ExamplePageLayout title="Merge Pressure" code={implementationCode}>
      <div className="merge-pressure" ref={hostRef}>
        <section className="merge-pressure__hero">
          <div>
            <span className="merge-pressure__kicker">ProcessFlowChart · capacitated workflow</span>
            <p className="merge-pressure__lede">
              Software delivery as a physical production system. PRs are bodies. Stages are
              regions with force, capacity, pressure, and portals. Features are body groups that
              complete only when <strong>every</strong> member PR is absorbed into merge — so
              “almost done” stays visible as coordination debt, not average progress.
            </p>
          </div>
          <div className="merge-pressure__source-card">
            <strong>Built on</strong>
            <a href="/charts/process-flow-chart">ProcessFlowChart</a>
            <span>process recipe kit · stage layout · absorb completion</span>
            <button type="button" onClick={() => setRunId((current) => current + 1)}>
              Replay scene
            </button>
          </div>
        </section>

        <section className="merge-pressure__presets" aria-label="Narrative chapters">
          {PRESET_ORDER.map((id) => {
            const preset = PRESETS[id]
            const active = settings.id === id || (settings.chapter === preset.chapter && settings.id === "sandbox" && id === "chapter5")
            return (
              <button
                key={id}
                type="button"
                className={settings.chapter === preset.chapter ? "is-active" : ""}
                aria-pressed={settings.chapter === preset.chapter}
                onClick={() => {
                  setSettings(preset)
                  setRunId((current) => current + 1)
                }}
              >
                <strong>{preset.short}</strong>
                <span>{preset.label.split(": ")[1] ?? preset.label}</span>
              </button>
            )
          })}
        </section>

        <section className="merge-pressure__controls" aria-label="System knobs">
          <Control
            label="AI coding multiplier"
            value={settings.aiCodingMultiplier}
            min={1}
            max={5}
            step={0.1}
            onChange={(value) => updateSetting("aiCodingMultiplier", value)}
            suffix="×"
            disabled={isLocked && settings.chapter !== 5}
          />
          <Control
            label="Reviewers"
            value={settings.reviewerCount}
            min={1}
            max={12}
            step={1}
            onChange={(value) => updateSetting("reviewerCount", value)}
            disabled={isLocked && settings.chapter !== 5}
          />
          <Control
            label="AI review quality"
            value={settings.aiReviewQuality}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => updateSetting("aiReviewQuality", value)}
            percent
            disabled={isLocked && settings.chapter !== 5}
          />
          <Control
            label="Routing"
            value={settings.routing}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => updateSetting("routing", value)}
            percent
            disabled={isLocked && settings.chapter !== 5}
          />
          <Control
            label="PRs per feature"
            value={settings.prsPerFeature}
            min={1}
            max={10}
            step={1}
            onChange={(value) => updateSetting("prsPerFeature", value)}
            disabled={isLocked && settings.chapter !== 5}
          />
          <Control
            label="CI strength"
            value={settings.ciStrength}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => updateSetting("ciStrength", value)}
            percent
            disabled={isLocked && settings.chapter !== 5}
          />
        </section>

        <section className="merge-pressure__workbench">
          <div className="merge-pressure__chart-shell" style={{ width: chartWidth }}>
            <ProcessFlowChart
              key={`${settings.id}-${runId}-${chartWidth}`}
              className="merge-pressure__chart"
              title={`${settings.label} merge pressure simulation`}
              summary={`${settings.label}: ${metrics.prCount} PRs, review pressure ${scenario.reviewPressure.toFixed(2)}, ${metrics.shipped} features complete, ${metrics.almost} almost complete.`}
              description="Pull requests move through coding, CI, capacitated review, revision portals, and merge. Feature anchors show all-members completion."
              size={[chartWidth, FRAME_HEIGHT]}
              data={prs}
              idAccessor="id"
              stageAccessor="stage"
              groupBy="featureId"
              groupLabelAccessor="featureLabel"
              workAccessor="reviewWork"
              radiusAccessor="radius"
              colorBy="authorType"
              stages={stages}
              groupCompletion="allAbsorbed"
              groupAnchorAlong={0.58}
              seed={scenario.seed + runId}
              showChrome
              showProjection
              liveCapacity
              bodyLimit={280}
              onCapacityChange={setCapacityStats}
              gravityX={scenario.reviewPressure > 1.15 ? 10 : 22}
              accessibleTable
              hoverRadius={16}
              settle={false}
              frameProps={{
                continuous: true,
                bodyStyle: (body) => {
                  const datum = body.datum ?? {}
                  const author = AUTHOR_TYPES[datum.authorType] ?? AUTHOR_TYPES.human
                  const featureColor =
                    datum.featureId === "auth"
                      ? "var(--mp-feature-auth)"
                      : datum.featureId === "billing"
                        ? "var(--mp-feature-billing)"
                        : datum.featureId === "search"
                          ? "var(--mp-feature-search)"
                          : datum.featureId === "notifications"
                            ? "var(--mp-feature-notifications)"
                            : "var(--mp-feature-admin)"
                  const mark =
                    datum.authorType === "ai_agent"
                      ? "faceted"
                      : datum.authorType === "human_ai_assisted"
                        ? "halo"
                        : "circle"
                  return {
                    fill: author.color,
                    stroke: featureColor,
                    strokeWidth: 1.5,
                    opacity: datum.stage === "merged" ? 0.7 : 0.96,
                    mark,
                  }
                },
                tooltipContent: (hover) => {
                  const datum = hover.data ?? hover.datum ?? {}
                  return (
                    <div
                      className="semiotic-tooltip merge-pressure__tooltip"
                      style={{
                        background: "var(--mp-tooltip-bg, rgba(15, 23, 42, 0.94))",
                        color: "var(--mp-tooltip-text, #f8fafc)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--mp-tooltip-border, #334155)",
                        boxShadow: "var(--semiotic-tooltip-shadow)",
                        minWidth: 160,
                      }}
                    >
                      <strong>
                        {datum.featureLabel} / {datum.part}
                      </strong>
                      <div>{AUTHOR_TYPES[datum.authorType]?.label ?? "PR"}</div>
                      <div>Stage: {datum.stage}</div>
                      <div>Review work: {Number(datum.reviewWork ?? 0).toFixed(1)}</div>
                    </div>
                  )
                },
              }}
            />
          </div>

          <aside className="merge-pressure__readout">
            <span className="merge-pressure__kicker">Current regime</span>
            <h2>{settings.label.split(":")[1] || settings.label}</h2>
            <p className="merge-pressure__regime-desc">{settings.description}</p>

            <div className="merge-pressure__metrics">
              <Metric label="coding velocity" value={scenario.codingVelocity.toFixed(1)} detail="PRs/week" />
              <Metric label="review capacity" value={scenario.reviewCapacity.toFixed(1)} detail="units/week" />
              <Metric
                label="review pressure"
                value={scenario.reviewPressure.toFixed(2)}
                detail={scenario.reviewPressure > 1 ? "over capacity" : "under capacity"}
                warn={scenario.reviewPressure > 1}
              />
              <Metric label="merge velocity" value={scenario.mergeVelocity.toFixed(1)} detail="effective ship rate" />
              <Metric label="PRs" value={metrics.prCount} detail={`${Math.round(metrics.mergedShare * 100)}% merged`} />
              <Metric
                label="features shipped"
                value={`${metrics.shipped}/${metrics.features.length}`}
                detail={metrics.almost ? `${metrics.almost} almost` : "all-or-nothing"}
                warn={metrics.falseProgress}
              />
              <Metric
                label="review queue"
                value={
                  capacityStats.find((s) => s.regionId.includes("review"))?.queueDepth ?? "—"
                }
                detail={
                  capacityStats.find((s) => s.regionId.includes("review"))
                    ? `processed ${capacityStats.find((s) => s.regionId.includes("review")).processedCount}`
                    : "live capacity"
                }
                warn={(capacityStats.find((s) => s.regionId.includes("review"))?.queueDepth ?? 0) > 8}
              />
            </div>

            <div className="merge-pressure__feature-list" aria-label="Feature completion">
              {metrics.features.map((feature) => (
                <div
                  key={feature.id}
                  className={
                    feature.complete
                      ? "is-complete"
                      : feature.almost
                        ? "is-almost"
                        : ""
                  }
                >
                  <strong>{feature.label}</strong>
                  <span>
                    {feature.merged}/{feature.total}
                    {feature.complete ? " shipped" : feature.almost ? " almost" : " in flight"}
                  </span>
                </div>
              ))}
            </div>

            <div className="merge-pressure__legend">
              {Object.entries(AUTHOR_TYPES).map(([id, author]) => (
                <span key={id}>
                  <i style={{ background: author.color }} />
                  {author.label}
                </span>
              ))}
            </div>
          </aside>
        </section>

        <section className="merge-pressure__explanation">
          <div>
            <span className="merge-pressure__kicker">Why ProcessFlowChart</span>
            <h2>Multi-body workflow is not a gauntlet.</h2>
          </div>
          <p>
            GauntletChart is the right abstraction for one compound plan degraded by gate events
            (see Not in MY Backyard). Merge pressure is many independent work items, capacitated
            stages, rework portals, and feature groups with all-members completion. That is{" "}
            <code>ProcessFlowChart</code>: declarative stages, <code>groupBy</code>, and a settled
            stage-count projection.
          </p>
          <div className="merge-pressure__needs-grid">
            <Need
              title="stages"
              body="coding → CI → review (capacity + pressure) → revision (portal) → merged (absorb)."
            />
            <Need
              title="groupBy + absorb"
              body="Feature anchors complete only when every member PR is absorbed — false progress stays visible."
            />
            <Need
              title="scenario knobs"
              body="Chapters and sandbox controls change capacity and stage occupancy data, not hand-built colliders."
            />
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function Control({ label, value, min, max, step, onChange, suffix = "", percent = false, disabled = false }) {
  const display = percent ? `${Math.round(value * 100)}%` : `${value}${suffix}`
  return (
    <label className={disabled ? "is-disabled" : ""}>
      <span>{label}</span>
      <strong>{display}</strong>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Metric({ label, value, detail, warn = false }) {
  return (
    <div className={warn ? "is-warn" : ""}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  )
}

function Need({ title, body }) {
  return (
    <div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}
