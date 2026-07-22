import React from "react"
import { Link } from "react-router-dom"
import { CrucibleChart, buildCrucibleProductEvents } from "semiotic/physics"

import ChartGrounding from "../../components/ChartGrounding"
import ComponentMeta from "../../components/ComponentMeta"
import PageLayout from "../../components/PageLayout"
import PropTable from "../../components/PropTable"
import AlloyCrucibleExample from "./AlloyCrucibleExample.jsx"
import EntityResolutionCrucibleExample from "./EntityResolutionCrucibleExample.jsx"
import TeamWorkshopExample from "./TeamWorkshopExample.jsx"

const publicApiCharge = [
  { id: "deploy-log", label: "Deploy log", kind: "record" },
  { id: "trace", label: "Request trace", kind: "telemetry" },
  { id: "rollback", label: "Rollback result", kind: "experiment" },
  { id: "traffic-spike", label: "Traffic spike", kind: "counterclaim" },
]

const publicApiPhases = [
  { id: "charge", label: "Charge", duration: 1, motion: "charge", intensity: 0.25 },
  { id: "test", label: "Test mechanism", duration: 2.4, motion: "mix", intensity: 0.8 },
  { id: "publish", label: "Publish finding", duration: 1.6, motion: "pour", intensity: 0.35 },
]

const publicApiProducts = [
  {
    id: "supported-finding",
    label: "Deploy caused regression",
    category: "finding",
    outletId: "finding",
  },
]

const publicApiEvents = [
  ...buildCrucibleProductEvents({
    productId: "supported-finding",
    form: {
      at: { phaseId: "test", progress: 0.28 },
      sourceIds: ["deploy-log", "trace"],
      label: "Chronology and mechanism agree",
    },
    contributions: [
      {
        at: { phaseId: "test", progress: 0.7 },
        sourceIds: ["rollback"],
        label: "Rollback supplies the counterfactual",
      },
    ],
    complete: {
      at: { phaseId: "publish", progress: 0.58 },
      outletId: "finding",
      reason: "Three authored observations support the finding",
      label: "Close the finding",
    },
  }),
  {
    id: "reject-traffic-spike",
    at: { phaseId: "test", progress: 0.82 },
    label: "Contradicted counterclaim",
    effects: [
      {
        type: "eject",
        select: { ids: ["traffic-spike"] },
        outletId: "contradicted",
        reason: "The regression persists at ordinary traffic levels",
      },
    ],
  },
]

const publicApiOutlets = [
  { id: "finding", label: "Supported finding", side: "bottom", order: 0 },
  { id: "contradicted", label: "Contradicted", side: "right", order: 1 },
]

const publicApiGroundingProps = {
  data: publicApiCharge,
  phases: publicApiPhases,
  products: publicApiProducts,
  events: publicApiEvents,
  outlets: publicApiOutlets,
  idAccessor: "id",
  labelAccessor: "label",
  categoryAccessor: "kind",
  projection: { groupBy: "outlet", measure: "count" },
  title: "Incident evidence crucible",
}

const crucibleChartProps = [
  {
    name: "data",
    type: "array",
    required: true,
    default: null,
    description: "The bounded, controlled source charge. CrucibleChart has no live push mode.",
  },
  {
    name: "phases",
    type: "array",
    required: true,
    default: null,
    description:
      "Ordered authored treatment phases with finite positive durations and optional motion, intensity, color, and display metrics.",
  },
  {
    name: "products",
    type: "array",
    required: false,
    default: "[]",
    description:
      "Declared product molds referenced by combine, contribute, complete-product, and split effects.",
  },
  {
    name: "events",
    type: "array",
    required: false,
    default: "[]",
    description:
      "Serializable authored semantic events: state, relation, combine, contribute, complete-product, split, eject, metric, or outcome changes.",
  },
  {
    name: "outlets",
    type: "array",
    required: false,
    default: "product, retained, residue, failed, recovered",
    description:
      "Named product or component destinations. Supplying it replaces the default outlet list.",
  },
  {
    name: "idAccessor",
    type: "string | function",
    required: false,
    default: "datum.id, then component-{index}",
    description: "Stable source-component id.",
  },
  {
    name: "labelAccessor",
    type: "string | function",
    required: false,
    default: "datum.label, datum.name, then id",
    description: "Human-readable component label.",
  },
  {
    name: "categoryAccessor",
    type: "string | function",
    required: false,
    default: '"component"',
    description: "Component category used by grouping and color.",
  },
  {
    name: "amountAccessor",
    type: "string | function",
    required: false,
    default: "1",
    description:
      "Authored amount for projection and conservation; never inferred from body mass or area.",
  },
  {
    name: "initialStateAccessor",
    type: "string | function",
    required: false,
    default: '"active"',
    description: "Initial ledger status for a component.",
  },
  {
    name: "metricsAccessor",
    type: "string | function",
    required: false,
    default: null,
    description: "Named, externally supplied numeric metrics for each source component.",
  },
  {
    name: "metrics",
    type: "object",
    required: false,
    default: "{}",
    description: "Authored run-level numeric metrics; physics never calculates domain evidence.",
  },
  {
    name: "amountLabel",
    type: "string",
    required: false,
    default: null,
    description: "Display unit for amount values, such as kg.",
  },
  {
    name: "conservation",
    type: "boolean | object",
    required: false,
    default: "false",
    description:
      "Optional authored amount or metric balance check with field, tolerance, and warn/error behavior.",
  },
  {
    name: "projection",
    type: "object",
    required: false,
    default: "by status",
    description: "Projection grouping, measure, ordering, input baseline, and delta display.",
  },
  {
    name: "snapshotAt",
    type: "number | { phaseId, progress? }",
    required: false,
    default: "terminal boundary for snapshot playback",
    description: "Logical time shown in a deterministic static snapshot.",
  },
  {
    name: "playback",
    type: '"replay" | "snapshot"',
    required: false,
    default: '"replay"',
    description: "Replay the authored program or render a chosen settled snapshot.",
  },
  {
    name: "controls",
    type: "boolean | object",
    required: false,
    default: "false",
    description: "Show selected play/pause, reset, step-phase, timeline, and speed controls.",
  },
  {
    name: "bodyRadius",
    type: "number",
    required: false,
    default: "7",
    description: "Fallback visual radius for component bodies.",
  },
  {
    name: "radiusRange",
    type: "[number, number]",
    required: false,
    default: "[5, 18]",
    description: "Visual radius range when amount is encoded by body size.",
  },
  {
    name: "colorBy",
    type: '"category" | "status" | "outlet" | "product" | accessor',
    required: false,
    default: '"category"',
    description: "Semantic field used to color components and products.",
  },
  {
    name: "showBonds",
    type: "boolean",
    required: false,
    default: "true",
    description: "Show lineage bonds between a derived product and its source members.",
  },
  {
    name: "showChrome",
    type: "boolean",
    required: false,
    default: "true",
    description: "Show vessel, phase rail, and outlet chrome.",
  },
  {
    name: "showProjection",
    type: "boolean",
    required: false,
    default: "true",
    description: "Show the settled composition and outcome projection.",
  },
  {
    name: "initialSpawnPacing",
    type: "object",
    required: false,
    default: "immediate",
    description: "Optional visual pacing for the bounded initial source charge.",
  },
  {
    name: "seed",
    type: "number | string",
    required: false,
    default: "1",
    description: "Deterministic visual placement seed; it cannot change semantic event results.",
  },
  {
    name: "paused",
    type: "boolean",
    required: false,
    default: "false",
    description: "Pause replay without changing the authored ledger.",
  },
  {
    name: "playbackRate",
    type: "number",
    required: false,
    default: "1",
    description:
      "Presentation-only replay multiplier. Values below 1 slow every authored phase without changing event order or outcomes.",
  },
  {
    name: "rerunMS",
    type: "number | null",
    required: false,
    default: "null",
    description:
      "Replay from the deterministic initial state this many milliseconds after terminal materialization settles; 0 reruns on the next timer turn.",
  },
  {
    name: "responsiveWidth",
    type: "boolean",
    required: false,
    default: "false",
    description: "Resize the chart to its container width.",
  },
  {
    name: "responsiveHeight",
    type: "boolean",
    required: false,
    default: "false",
    description: "Resize the chart to its container height.",
  },
  {
    name: "size",
    type: "[number, number]",
    required: false,
    default: "[900, 420]",
    description: "Full chart dimensions in pixels.",
  },
  {
    name: "onStateChange",
    type: "function",
    required: false,
    default: null,
    description: "Receive the authoritative run state after authored changes.",
  },
  {
    name: "onCrucibleObservation",
    type: "function",
    required: false,
    default: null,
    description:
      "Receive high-level phase, transformation, product, conservation, and completion observations.",
  },
  {
    name: "onDiagnostic",
    type: "function",
    required: false,
    default: null,
    description: "Receive compile or event diagnostics without consulting physical positions.",
  },
  {
    name: "onConservation",
    type: "function",
    required: false,
    default: null,
    description: "Receive the authored amount or metric conservation result.",
  },
  {
    name: "onClick",
    type: "function",
    required: false,
    default: null,
    description: "Receive a source datum or documented derived-product datum on click.",
  },
  {
    name: "tooltip",
    type: "boolean | function | object",
    required: false,
    default: "true",
    description: "Enable the default semantic tooltip, provide a custom renderer, or disable it.",
  },
  {
    name: "frameProps",
    type: "object",
    required: false,
    default: null,
    description:
      "Advanced StreamPhysicsFrame props, excluding the curated body-forces implementation.",
  },
]

const crucibleUseCases = [
  {
    title: "Incident evidence",
    operation: "Synthesis under scrutiny",
    question: "Which account survives chronology, mechanism, and rollback evidence?",
    charge: "Logs, traces, deploys, metrics, and experiments",
    ordeal: "Align time → test mechanism → seek counterfactual",
    product: "One supported finding with exact evidence lineage",
    exceptions: "Contradicted signals and unresolved questions",
    decision: "Mitigate, monitor, and publish the postmortem",
    moment: "Corroborating evidence locks together while a vivid red herring is expelled.",
  },
  {
    title: "Semiconductor qualification",
    operation: "Refinement / selection",
    question: "Where did lot yield go, and which device family failed under which stress?",
    charge: "Serialized devices from one observed lot",
    ordeal: "Thermal ramp → voltage stress → hold → cool-down",
    product: "Qualified devices and a retained lot",
    exceptions: "Thermal, electrical, and latent failures",
    decision: "Release, rework, or quarantine the lot",
    moment: "A family-specific failure wave leaves during the exact authored stress phase.",
  },
  {
    title: "Systematic review",
    operation: "Refinement + synthesis",
    question: "Which studies support each finding after the same appraisal program?",
    charge: "Search results and candidate studies",
    ordeal: "Deduplicate → screen → appraise quality → synthesize",
    product: "Finding clusters with study provenance",
    exceptions: "Duplicates and exclusions separated by reason",
    decision: "Synthesize, narrow the claim, or gather more evidence",
    moment: "Several independent studies bind into findings while exclusions remain inspectable.",
  },
  {
    title: "Software build forge",
    operation: "Synthesis",
    question: "Which inputs formed each shipped bundle, and where did the bytes go?",
    charge: "Modules, assets, dependencies, and generated code",
    ordeal: "Resolve → tree-shake → split chunks → minify → compress",
    product: "Deployable bundles with module lineage",
    exceptions: "Unused code, duplicate modules, and build failures",
    decision: "Ship, split, deduplicate, or revisit an import",
    moment: "Modules nucleate into several chunks as dead code peels into a residue tray.",
  },
  {
    title: "Material recovery",
    operation: "Split + refinement",
    question: "What was recovered from a mixed batch, and what remained hazardous?",
    charge: "A weighed batch of electronics or mixed scrap",
    ordeal: "Shred → sort → separate → refine",
    product: "Copper, aluminum, precious-metal, and reusable fractions",
    exceptions: "Hazardous residue and unrecoverable loss",
    decision: "Accept the recovery run and audit its mass balance",
    moment: "One mixed charge visibly separates into several valuable products and residue.",
  },
  {
    title: "Release-scope package",
    operation: "Negotiated synthesis",
    question: "Which commitments form a coherent release under this evidence and capacity?",
    charge: "Requirements, safeguards, dependencies, and open risks",
    ordeal: "Validate need → test dependencies → reconcile capacity → commit",
    product: "A release package plus explicit operating safeguards",
    exceptions: "Deferred scope, unresolved risks, and rejected conflicts",
    decision: "Commit the release or reopen the package",
    moment: "Interdependent commitments bind while an attractive but incompatible item defers.",
  },
  {
    title: "Portfolio scenario",
    operation: "Stress testing",
    question:
      "Which holdings remain resilient, impaired, failed, or recovered under this scenario?",
    charge: "Holdings in one portfolio snapshot",
    ordeal: "Rate shock → liquidity shock → recession → recovery",
    product: "Retained and recovered value by source holding",
    exceptions: "Failed and illiquid positions",
    decision: "Accept exposure, hedge, rebalance, or investigate",
    moment: "Impaired components separate under the shock, then only some visibly recover.",
  },
  {
    title: "Data-migration cutover",
    operation: "Transformation + selection",
    question: "What became canonical, what needs manual mapping, and is cutover safe?",
    charge: "Legacy tables, fields, and source records",
    ordeal: "Normalize → map → validate → reconcile → publish",
    product: "Canonical records grouped by destination schema",
    exceptions: "Invalid rows, unmapped fields, and reconciliation gaps",
    decision: "Cut over, remediate exceptions, or roll back",
    moment: "Validated records lock into destination molds while unmapped rows remain outside.",
  },
]

function CrucibleUseCaseAtlas() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
        gap: 12,
        margin: "14px 0 24px",
      }}
    >
      {crucibleUseCases.map((example) => (
        <article
          key={example.title}
          style={{
            border: "1px solid var(--surface-3)",
            borderRadius: 9,
            background: "var(--surface-1)",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              color: "var(--accent)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {example.operation}
          </div>
          <h3 style={{ margin: "4px 0 6px", fontSize: 17 }}>{example.title}</h3>
          <p style={{ margin: "0 0 10px" }}>
            <strong>{example.question}</strong>
          </p>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "72px minmax(0, 1fr)",
              gap: "5px 8px",
              margin: 0,
              fontSize: 12,
            }}
          >
            {[
              ["Charge", example.charge],
              ["Ordeal", example.ordeal],
              ["Product", example.product],
              ["Exceptions", example.exceptions],
              ["Decision", example.decision],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <dt style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{label}</dt>
                <dd style={{ margin: 0 }}>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p
            style={{
              borderTop: "1px solid var(--surface-2)",
              color: "var(--text-secondary)",
              margin: "10px 0 0",
              paddingTop: 9,
              fontSize: 12,
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>Killer beat:</strong> {example.moment}
          </p>
        </article>
      ))}
    </div>
  )
}

export default function CrucibleChartPage() {
  const publicApiRef = React.useRef(null)

  return (
    <PageLayout
      title="CrucibleChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/crucible-chart" },
        { label: "CrucibleChart", path: "/charts/crucible-chart" },
      ]}
      prevPage={{ title: "GauntletChart", path: "/charts/gauntlet-chart" }}
      nextPage={{ title: "PhysicsCustomChart", path: "/charts/physics-custom-chart" }}
    >
      <ComponentMeta
        componentName="CrucibleChart"
        importStatement='import { CrucibleChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/frames/physics-frame"
        related={[
          { name: "GauntletChart", path: "/charts/gauntlet-chart" },
          { name: "ProcessFlowChart", path: "/charts/process-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
          { name: "The Rhetorical Crucible", path: "/examples/rhetorical-crucible" },
          { name: "The Latent Crucible", path: "/examples/latent-crucible" },
        ]}
      />

      <ChartGrounding component="CrucibleChart" props={publicApiGroundingProps} />

      <aside
        aria-label="CrucibleChart public API status"
        style={{
          border: "1px solid var(--surface-3)",
          borderLeft: "4px solid var(--accent)",
          borderRadius: 8,
          background: "var(--surface-1)",
          margin: "0 0 24px",
          padding: "14px 16px",
        }}
      >
        <strong>Public chart API · deterministic, bounded, and projection-first</strong>
        <p style={{ margin: "8px 0 0" }}>
          Import <code>CrucibleChart</code> from <code>semiotic/physics</code>. The examples below
          preserve the design exploration that established its semantics; the public HOC now exposes
          the same bounded phase-and-event program directly.
        </p>
      </aside>

      <p>
        CrucibleChart is the physics chart for peer components exposed to one shared, phased
        treatment. It is useful when that treatment creates products, exposes exceptions, and leaves
        a decision-worthy ledger of where every input went. Its durable reading is the authored
        composition, provenance, and outcome projection—not the trajectory of the bodies in the
        scene.
      </p>

      <p>
        Its strongest claim is not “these things moved.” It is “this bounded ordeal changed what
        these things are <em>together</em>, while every product and exception can still name its
        sources.” Each preview starts at a deliberately slow pace. Changing Pace restarts phase one;
        Auto replay exposes the public <code>rerunMS</code> delay without changing the authored
        result.
      </p>

      <h2 id="public-api-example">Author the product lifecycle, then replay it</h2>

      <p>
        This compact example renders <code>CrucibleChart</code> directly. The caller declares the
        evidence, treatment phases, product mold, and disposition.{" "}
        <code>buildCrucibleProductEvents</code> writes the repetitive{" "}
        <code>combine → contribute → complete-product</code> envelope, but it does not decide which
        evidence belongs together, when any step occurs, or where the result goes. The replay button
        calls the public handle&apos;s <code>replay()</code> method, so it restarts immediately even if a
        run is already underway.
      </p>

      <div
        style={{
          border: "1px solid var(--surface-3)",
          borderRadius: 10,
          background: "var(--surface-1)",
          padding: 12,
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => publicApiRef.current?.replay()}
            style={{
              minHeight: 34,
              border: "1px solid var(--surface-3)",
              borderRadius: 7,
              background: "var(--surface-0)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontWeight: 800,
              padding: "0 12px",
            }}
          >
            Replay authored tape
          </button>
        </div>
        <CrucibleChart
          ref={publicApiRef}
          {...publicApiGroundingProps}
          controls={{ playPause: true, reset: true, stepPhase: true, speed: true }}
          playbackRate={0.8}
          seed="incident-evidence-docs"
          size={[840, 390]}
          responsiveWidth
        />
      </div>

      <h2 id="golden-record-preview">Forge golden records</h2>

      <p>
        Fifteen rows from CRM, billing, support, and event systems enter one reconciliation run.
        Authored match decisions bind related rows into several canonical customer records;
        ambiguous rows leave for manual review and malformed rows leave for quarantine. Switch
        complete authored resolution runs to see the same charge produce a different, fully
        accounted outcome.
      </p>

      <EntityResolutionCrucibleExample />

      <h2 id="why-this-fits">Why this fits a crucible</h2>

      <p>
        The charge is a bounded source batch. Normalize, match, resolve, and publish are the shared
        ordeal. Supplied match evidence is the assay. Golden records are the products, review and
        quarantine are reason-labelled exceptions, and the publish decision is the mold. Multiple
        products nucleate in one chamber, so the durable reading is many-to-one lineage rather than
        workflow occupancy.
      </p>

      <p>
        The resolution selector swaps complete authored event tapes; attraction and collision never
        resolve identity. That separation is deliberate: the physics makes binding, conflict, and
        settlement graspable, while the ledger remains sufficient for audit, reduced motion, and
        export.
      </p>

      <h2 id="alloy-preview">Compare observed sister heats</h2>

      <p>
        Sixteen traced five-kilogram parcels make the same 80 kg remelt recipe. Heat 24A receives a
        skim-only treatment; Heat 24B is degassed and filtered. The R-17 acceptance mold is visible
        before either laboratory panel arrives. Switch observed heat records to compare how
        treatment, assay, and material disposition turn the same kind of charge into a different
        decision.
      </p>

      <AlloyCrucibleExample />

      <h2 id="reading-the-alloy-preview">How to read the alloy fixture</h2>

      <p>
        The skim-only heat exceeds the hydrogen and inclusion limits, so its 65 kg main product goes
        to rework. The treated heat passes every posted observation and casts that lineage as R-17
        billet. The other 15 kg remains accounted for as foundry return, dross, or filter cake.
        Physics stages the treatment and routing; it never invents chemistry or acceptance.
      </p>

      <h2 id="team-workshop-preview">Forge a breaking-change compact</h2>

      <p>
        Twelve requirements from Architecture, Support, SDK, Product, Docs, SRE, and other peers
        enter one facilitated decision. A consensus synthesis and a ship-date floor apply different
        complete decision records to the same charge. Commitments bind into release-evidence,
        migration, and recovery products; unsupported, later, incompatible, and declined
        requirements leave through distinct reason-labelled outlets.
      </p>

      <TeamWorkshopExample />

      <p>
        The memorable throw now carries a precise distinction: Open is retained because the package
        still needs evidence or policy; Deferred is owned later work; Conflict marks rules that
        cannot coexist; Declined has actually failed the publication mold. Ejection is therefore a
        semantic disposition, not merely spectacle.
      </p>

      <p>
        For the public HOC applied to real transcript profiles, see{" "}
        <Link to="/examples/rhetorical-crucible">The Rhetorical Crucible</Link>. It uses two
        synchronized chart instances, incremental product formation, a selectable slow replay, and
        the same complete ledger in motion-reduced and server-rendered states.
      </p>

      <p>
        For a deliberately probabilistic boundary case, see{" "}
        <Link to="/examples/latent-crucible">The Latent Crucible</Link>. Word Trails carries the
        topic-word probability estimates at recorded Gibbs checkpoints while Crucible quenches one
        terminal chain state, preserving the distinction between an inference algorithm and its
        visual explanation.
      </p>

      <h2 id="why-the-metaphor-works">Why the metaphor keeps working</h2>

      <p>
        A Crucible is compelling when motion marks a change in <em>identity</em>, not merely a
        change in position. Peer inputs become a product that did not exist before; exceptions cross
        a reason-labelled boundary; the product locks into an explicit mold; and another complete
        treatment can produce a different, auditable result from the same kind of charge. The
        irreversible beats—binding, breaking, skimming, recovery, and quenching—are where physics
        carries the analytical claim.
      </p>

      <p>
        The three live instruments on this page provide six authored outcomes once their resolution
        or treatment selectors are used. The atlas below shows where the same grammar could earn its
        place next. In every case, an external system supplies the facts; the chart preserves and
        enacts them.
      </p>

      <CrucibleUseCaseAtlas />

      <h2 id="chart-boundary">Chart boundary</h2>

      <p>
        Use <Link to="/charts/gauntlet-chart">GauntletChart</Link> for a compound entity crossing
        sequential gates, <Link to="/charts/process-flow-chart">ProcessFlowChart</Link> for
        independent work items moving through stages, and{" "}
        <Link to="/frames/physics-frame">StreamPhysicsFrame</Link>
        when you need to author a custom scene beyond the bounded CrucibleChart event grammar.
      </p>

      <h2 id="public-props">Public props</h2>

      <p>
        The chart is deliberately controlled: callers provide the complete charge, phases, product
        molds, and event tape. <code>playbackRate</code> changes presentation only;{" "}
        <code>rerunMS</code> repeats the same deterministic program after it settles, while the ref
        handle&apos;s <code>replay()</code> restarts it immediately. Use{" "}
        <code>buildCrucibleProductEvents</code> when a product follows the standard forming,
        contribution, and completion lifecycle. Analysis, membership, event positions, and routing
        remain authored inputs.
      </p>

      <PropTable componentName="CrucibleChart" props={crucibleChartProps} />
    </PageLayout>
  )
}
