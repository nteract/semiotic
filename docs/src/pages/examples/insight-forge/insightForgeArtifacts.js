import { MINIMUM_OPERATIONAL_VOLUME } from "./insightForgeData"

export const DATA_VERSION = "wayfinder-returns-v1"
export const FORGE_NOW = "2026-07-01T12:00:00.000Z"

export const ARTIFACT_KINDS = [
  "anomaly",
  "segment",
  "path",
  "denominator",
  "context",
  "comparison",
  "filter",
  "hypothesis",
  "counterevidence",
  "insight",
  "false-positive",
  "saved-view",
  "knowledge-view",
  "watcher",
]

export const SCOPE_COLUMNS = ["mark", "cohort", "dataset", "cross-chart"]
export const MATURITY_ROWS = ["raw", "contextualized", "proposed", "operational"]

const KIND_ICON = {
  anomaly: "burst",
  segment: "crate",
  path: "route",
  denominator: "abacus",
  context: "calendar",
  comparison: "scales",
  filter: "sieve",
  hypothesis: "unlit-lantern",
  counterevidence: "shield",
  insight: "lit-lantern",
  "false-positive": "decoy",
  "saved-view": "scroll",
  "knowledge-view": "codex",
  watcher: "bell",
}

function titleCase(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function makeArtifact(overrides) {
  const status =
    overrides.lifecycle?.status ?? (overrides.maturity === "proposed" ? "proposed" : "accepted")
  const artifact = {
    id: overrides.id,
    kind: overrides.kind,
    title: overrides.title,
    summary: overrides.summary,
    icon: overrides.icon ?? KIND_ICON[overrides.kind] ?? "scroll",
    maturity: overrides.maturity ?? "raw",
    scope: overrides.scope ?? "cohort",
    predicate: overrides.predicate,
    stats: overrides.stats,
    source: {
      chartId: overrides.source?.chartId ?? "insight-forge",
      componentName: overrides.source?.componentName ?? "React",
      observationType: overrides.source?.observationType ?? "computed",
      dataVersion: DATA_VERSION,
      config: overrides.source?.config,
      grounding: overrides.source?.grounding,
    },
    evidence: overrides.evidence ?? [],
    lineage: {
      recipeId: overrides.lineage?.recipeId,
      parentIds: overrides.lineage?.parentIds ?? [],
    },
    provenance: {
      stableId: overrides.provenance?.stableId ?? `wayfinder:${overrides.id}`,
      author: overrides.provenance?.author ?? "Wayfinder workbench",
      authorKind: overrides.provenance?.authorKind ?? "human",
      source: overrides.provenance?.source ?? "user",
      basis: overrides.provenance?.basis ?? "human-note",
      confidence: overrides.provenance?.confidence,
      createdAt: overrides.provenance?.createdAt ?? FORGE_NOW,
      dataVersion: DATA_VERSION,
    },
    lifecycle: {
      freshness: overrides.lifecycle?.freshness ?? "fresh",
      status,
      supersedes: overrides.lifecycle?.supersedes,
      ttlHint: overrides.lifecycle?.ttlHint ?? "P90D",
      anchor: overrides.lifecycle?.anchor ?? "semantic",
    },
    audit: { ok: true, findings: [] },
    tags: overrides.tags ?? [],
    payload: overrides.payload,
    collectedAt: overrides.collectedAt ?? FORGE_NOW,
  }
  return { ...artifact, audit: auditArtifact(artifact) }
}

export function auditArtifact(artifact) {
  const findings = []
  const isRate = artifact.stats?.rate != null
  if (isRate && artifact.stats?.denominator == null) {
    findings.push({
      id: "ARTIFACT_NO_DENOMINATOR",
      status: "fail",
      message: "A rate must retain its numerator and denominator.",
      fix: "Collect the denominator from the source chart.",
    })
  } else if (isRate) {
    findings.push({
      id: "ARTIFACT_DENOMINATOR_PRESENT",
      status: "pass",
      message: `Rate is grounded in n = ${artifact.stats.denominator}.`,
    })
  }

  if (
    artifact.stats?.denominator != null &&
    artifact.stats.denominator < MINIMUM_OPERATIONAL_VOLUME
  ) {
    findings.push({
      id: "ARTIFACT_LOW_VOLUME",
      status: "warn",
      message: `Only ${artifact.stats.denominator} observations; below the operational minimum of ${MINIMUM_OPERATIONAL_VOLUME}.`,
      fix: "Classify the alert separately from the underlying unknown risk.",
    })
  }

  if (!artifact.predicate && !["saved-view", "knowledge-view"].includes(artifact.kind)) {
    findings.push({
      id: "ARTIFACT_NON_EXECUTABLE",
      status: "manual",
      message: "This item carries interpretation but no executable predicate.",
    })
  } else if (artifact.predicate) {
    findings.push({
      id: "ARTIFACT_SCOPE_PORTABLE",
      status: "pass",
      message: "Scope is stored as a semantic predicate, not pixels.",
    })
  }

  if (/\bcaus(?:e|ed|al)|root cause\b/i.test(artifact.summary)) {
    findings.push({
      id: "ARTIFACT_CAUSAL_OVERREACH",
      status: "fail",
      message: "Causal wording exceeds the correlational evidence in this case.",
      fix: "Describe concentration and the strongest supported operational explanation.",
    })
  }

  if (artifact.source?.dataVersion !== DATA_VERSION) {
    findings.push({
      id: "ARTIFACT_STALE_DATA",
      status: "warn",
      message: "The source data version does not match the active workbench.",
    })
  } else {
    findings.push({
      id: "ARTIFACT_VERSION_KNOWN",
      status: "pass",
      message: `Source version ${DATA_VERSION} is recorded.`,
    })
  }

  return {
    ok: findings.every((finding) => finding.status !== "fail"),
    findings,
  }
}

export function artifactGridPosition(artifact) {
  const maturity = artifact.maturity === "accepted" ? "operational" : artifact.maturity
  return {
    column: Math.max(0, SCOPE_COLUMNS.indexOf(artifact.scope)),
    row: Math.max(0, MATURITY_ROWS.indexOf(maturity)),
  }
}

export function evidencePips(artifact) {
  const count = Math.max(1, artifact.evidence?.length ?? 0)
  return { shown: Math.min(5, count), overflow: Math.max(0, count - 5) }
}

export const RECIPES = [
  {
    id: "appraise-signal",
    label: "Appraise the Signal",
    description: "Join an anomaly to its denominator and test the operational volume rule.",
    pairs: [["anomaly", "denominator"]],
    resultKind: "false-positive",
    // The same recipe forks on the volume rule: it either calibrates the
    // anomaly or classifies it as a low-volume false positive.
    outcomeKinds: ["false-positive", "anomaly"],
    storyRole:
      "Classifies the tiny Northstar carrier alert as an operational false positive; the same rule calibrates the real incident anomaly.",
  },
  {
    id: "cut-cohort",
    label: "Cut a Cohort",
    description: "Bind a time anomaly to a semantic segment, path, or context item.",
    pairs: [
      ["anomaly", "segment"],
      ["anomaly", "path"],
      ["anomaly", "context"],
    ],
    resultKind: "filter",
    outcomeKinds: ["filter"],
    storyRole:
      "Produces the portable incident cohort filter that survives every chart translation.",
  },
  {
    id: "frame-hypothesis",
    label: "Frame a Hypothesis",
    description: "Turn a portable filter and an operational route into a proposed attribution.",
    pairs: [
      ["filter", "path"],
      ["filter", "segment"],
    ],
    resultKind: "hypothesis",
    outcomeKinds: ["hypothesis"],
    storyRole:
      "Frames the proposed SwiftShip carrier attribution — a dashed claim awaiting a test.",
  },
  {
    id: "test-attribution",
    label: "Test the Attribution",
    description: "Hold a proposed attribution against evidence from its complement.",
    pairs: [["hypothesis", "counterevidence"]],
    resultKind: "insight",
    outcomeKinds: ["insight"],
    storyRole:
      "Retracts the carrier hypothesis and accepts the packaging concentration insight in its place.",
  },
  {
    id: "bind-knowledge-view",
    label: "Bind Knowledge to a View",
    description: "Attach an accepted insight, annotations, and audit snapshot to a saved chart.",
    pairs: [["insight", "saved-view"]],
    resultKind: "knowledge-view",
    outcomeKinds: ["knowledge-view"],
    storyRole:
      "Binds the accepted insight to the product × package heatmap — the final field-guide knowledge view.",
  },
]

/**
 * The canonical crafting tree, ordered from raw clue to preserved knowledge.
 * This is what the Forge *can* make (distinct from the instance lineage of
 * what an analyst *has* made). Each step names its story role so a reader can
 * trace which branch produces the accepted insight, the retracted carrier
 * attribution, the Northstar false positive, and the knowledge heatmap.
 */
export const RECIPE_ATLAS = RECIPES.map((recipe) => ({
  id: recipe.id,
  label: recipe.label,
  description: recipe.description,
  inputKinds: recipe.pairs[0],
  alternateInputs: recipe.pairs.slice(1),
  resultKind: recipe.resultKind,
  outcomeKinds: recipe.outcomeKinds ?? [recipe.resultKind],
  storyRole: recipe.storyRole,
}))

// What each artifact kind can be combined with, phrased for a human. Drives the
// "why is this pair invalid?" explanation before crafting.
const KIND_PARTNERS = {
  anomaly: "a denominator (Appraise the Signal) or a segment, path, or context (Cut a Cohort)",
  denominator: "an anomaly (Appraise the Signal)",
  segment: "an anomaly (Cut a Cohort) or a filter (Frame a Hypothesis)",
  path: "an anomaly (Cut a Cohort) or a filter (Frame a Hypothesis)",
  context: "an anomaly (Cut a Cohort)",
  filter: "a path or a segment (Frame a Hypothesis)",
  hypothesis: "counterevidence (Test the Attribution)",
  counterevidence: "a hypothesis (Test the Attribution)",
  insight: "a saved view (Bind Knowledge to a View)",
  "saved-view": "an accepted insight (Bind Knowledge to a View)",
}

/**
 * Explain, before crafting, why a two-slot pair is or is not compatible.
 * Returns `{ compatible, recipe?, resultKind?, reason }`. The reason is always
 * a full sentence suitable for the recipe-preview surface and screen readers.
 */
export function explainCompatibility(inputs) {
  const filled = inputs.filter(Boolean)
  if (filled.length < 2) {
    return {
      compatible: false,
      reason: "Choose two satchel items. Ingredients are referenced, never consumed.",
    }
  }
  if (filled.some((artifact) => artifact.lifecycle?.status === "retracted")) {
    return {
      compatible: false,
      reason: "A retracted artifact cannot be an ingredient. Restore it or pick another item.",
    }
  }

  const recipe = compatibleRecipe(inputs)
  if (recipe) {
    return {
      compatible: true,
      recipe,
      resultKind: recipe.resultKind,
      reason: `${recipe.label}: ${recipe.description}`,
    }
  }

  const [a, b] = filled
  // Special case: the one pairing that is type-valid but blocked on status.
  const kinds = filled.map((artifact) => artifact.kind).sort()
  if (kinds[0] === "insight" && kinds[1] === "saved-view") {
    return {
      compatible: false,
      reason:
        "The insight must be accepted before it can be bound to a knowledge view. Test its attribution first.",
    }
  }

  const partner = KIND_PARTNERS[a.kind]
  const reason = partner
    ? `${titleCase(a.kind)} combines with ${partner}. A ${titleCase(b.kind).toLowerCase()} does not complete a recipe with it.`
    : "These items do not share a typed recipe. Their predicates remain unchanged."
  return { compatible: false, reason }
}

/**
 * A present artifact is "superseded" when another present, non-retracted
 * artifact declares it via `lifecycle.supersedes` (a stableId reference).
 */
export function isSuperseded(artifact, allArtifacts) {
  const stableId = artifact.provenance?.stableId
  if (!stableId) return false
  return allArtifacts.some(
    (other) =>
      other.id !== artifact.id &&
      other.lifecycle?.status !== "retracted" &&
      other.lifecycle?.supersedes === stableId,
  )
}

function pairMatches(pair, artifacts) {
  if (artifacts.length !== 2 || artifacts.some((artifact) => !artifact)) return false
  const actual = artifacts.map((artifact) => artifact.kind).sort()
  return actual[0] === [...pair].sort()[0] && actual[1] === [...pair].sort()[1]
}

export function compatibleRecipe(artifacts) {
  if (artifacts.some((artifact) => artifact?.lifecycle?.status === "retracted")) return null
  return (
    RECIPES.find((recipe) => {
      if (!recipe.pairs.some((pair) => pairMatches(pair, artifacts))) return false
      if (recipe.id !== "bind-knowledge-view") return true
      return artifactOfKind(artifacts, "insight")?.lifecycle?.status === "accepted"
    }) ?? null
  )
}

function artifactOfKind(artifacts, kind) {
  return artifacts.find((artifact) => artifact.kind === kind)
}

function combinePredicates(...predicates) {
  const clauses = predicates.filter(Boolean)
  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { op: "and", clauses }
}

function recipeArtifactId(recipe, inputs) {
  return `${recipe.id}:${inputs
    .map((artifact) => artifact.id)
    .sort()
    .join("+")}`
}

export function craftArtifacts(inputs, context = {}) {
  const recipe = compatibleRecipe(inputs)
  if (!recipe) {
    return {
      ok: false,
      warnings: ["No two-slot recipe recognizes this pair."],
      explanation: "Try an anomaly with a segment, or a hypothesis with counterevidence.",
    }
  }

  const base = {
    id: recipeArtifactId(recipe, inputs),
    source: {
      chartId: "insight-forge",
      componentName: "InsightRecipe",
      observationType: "artifact-crafted",
      grounding: {
        description: recipe.description,
        intent: "preserve analytical meaning across chart families",
      },
    },
    evidence: inputs.map((artifact) => ({ artifactId: artifact.id, relation: "derives-from" })),
    lineage: { recipeId: recipe.id, parentIds: inputs.map((artifact) => artifact.id) },
    provenance: {
      author: "Deterministic recipe engine",
      authorKind: "system",
      source: "computed",
      basis: "rule",
    },
  }

  if (recipe.id === "appraise-signal") {
    const anomaly = artifactOfKind(inputs, "anomaly")
    const denominator = artifactOfKind(inputs, "denominator")
    const stats = denominator?.stats ?? anomaly?.stats ?? {}
    const lowVolume =
      (stats.denominator ?? 0) < (context.minimumOperationalVolume ?? MINIMUM_OPERATIONAL_VOLUME)
    if (lowVolume) {
      const artifact = makeArtifact({
        ...base,
        kind: "false-positive",
        title: "Low-volume alert classified",
        summary: `This alert is a false positive under the minimum-volume policy: ${stats.numerator ?? 1} damaged return among ${stats.denominator ?? 5} shipments. The underlying risk is unknown, not proven harmless.`,
        maturity: "operational",
        scope: "cross-chart",
        predicate: anomaly?.predicate ?? denominator?.predicate,
        stats,
        tags: ["minimum-volume", "alert-classification"],
      })
      return {
        ok: true,
        artifact,
        parentUpdates: [{ id: anomaly.id, status: "retracted" }],
        warnings: ["The alert is retracted; the raw point remains visible."],
        explanation:
          "The policy can reject the alert without pretending the five-shipment cohort is safe.",
      }
    }
    const artifact = makeArtifact({
      ...base,
      kind: "anomaly",
      title: "Calibrated incident anomaly",
      summary: "The incident window remains well above baseline after its denominator is attached.",
      maturity: "contextualized",
      scope: "dataset",
      predicate: anomaly?.predicate,
      stats,
      tags: ["calibrated"],
    })
    return {
      ok: true,
      artifact,
      parentUpdates: [],
      warnings: [],
      explanation: "The signal clears the volume rule.",
    }
  }

  if (recipe.id === "cut-cohort") {
    const anomaly = artifactOfKind(inputs, "anomaly")
    const companion = inputs.find((artifact) => artifact.id !== anomaly.id)
    const artifact = makeArtifact({
      ...base,
      kind: "filter",
      title: "Incident damage cohort",
      summary: `Carry ${anomaly.title.toLowerCase()} together with ${companion.title.toLowerCase()} into any chart room.`,
      maturity: "contextualized",
      scope: "cross-chart",
      predicate: combinePredicates(anomaly.predicate, companion.predicate),
      tags: ["portable-filter", "incident"],
    })
    return {
      ok: true,
      artifact,
      parentUpdates: [],
      warnings: [],
      explanation: "Both semantic clauses are retained with AND.",
    }
  }

  if (recipe.id === "frame-hypothesis") {
    const filter = artifactOfKind(inputs, "filter")
    const route = inputs.find((artifact) => artifact.id !== filter.id)
    const artifact = makeArtifact({
      ...base,
      kind: "hypothesis",
      title: "SwiftShip attribution",
      summary:
        "Proposed: SwiftShip is the primary explanation for damage on the Reno → Insert B route.",
      maturity: "proposed",
      scope: "cross-chart",
      predicate: combinePredicates(filter.predicate, route.predicate),
      lifecycle: { status: "proposed", anchor: "semantic" },
      tags: ["carrier", "requires-test"],
    })
    return {
      ok: true,
      artifact,
      parentUpdates: [],
      warnings: ["This is a proposed attribution, not an accepted claim."],
      explanation: "The dashed status remains until counterevidence is tested.",
    }
  }

  if (recipe.id === "test-attribution") {
    const hypothesis = artifactOfKind(inputs, "hypothesis")
    const counterevidence = artifactOfKind(inputs, "counterevidence")
    const artifact = makeArtifact({
      ...base,
      kind: "insight",
      title: "Packaging concentration accepted",
      summary:
        "The May damage spike is concentrated in Starlight Lanterns packed at Reno with Corrugated Insert B. It appears across carriers, while SwiftShip’s other packaging remains near baseline. The evidence favors investigating the insert rollout over a carrier-first attribution.",
      maturity: "operational",
      scope: "cross-chart",
      predicate: context.insightPredicate ?? combinePredicates(counterevidence.predicate),
      stats: counterevidence.stats,
      lifecycle: {
        status: "accepted",
        supersedes: hypothesis.provenance.stableId,
        anchor: "semantic",
      },
      provenance: { ...base.provenance, confidence: 0.88 },
      tags: ["accepted", "packaging", "carrier-false-attribution"],
    })
    return {
      ok: true,
      artifact,
      parentUpdates: [{ id: hypothesis.id, status: "retracted" }],
      warnings: ["Concentration supports investigation, not automatic causal proof."],
      explanation:
        "Across-carrier evidence and the SwiftShip complement refute the carrier-first account.",
    }
  }

  const insight = artifactOfKind(inputs, "insight")
  const savedView = artifactOfKind(inputs, "saved-view")
  if (!context.knowledgeConfig || context.knowledgeConfig.component !== "Heatmap") {
    return {
      ok: false,
      warnings: ["A serializable Heatmap config is required to bind this knowledge view."],
      explanation: "Capture the derived Heatmap configuration before binding the accepted insight.",
    }
  }
  const artifact = makeArtifact({
    ...base,
    kind: "knowledge-view",
    title: "Lantern packaging field guide",
    summary:
      "A product × package heatmap carrying the accepted packaging insight, semantic annotation, audit snapshot, and full lineage.",
    maturity: "operational",
    scope: "cross-chart",
    predicate: insight.predicate,
    lifecycle: { status: "accepted", anchor: "semantic" },
    payload: {
      config: context.knowledgeConfig,
      sourceConfig: savedView.payload?.config,
      component: "Heatmap",
      applications: [{ artifactId: insight.id, mode: "annotate" }],
      interpretation: insight.summary,
      insightArtifactId: insight.id,
      auditSnapshot: context.knowledgeAudit,
    },
    tags: ["knowledge-view", "round-trip"],
  })
  return {
    ok: true,
    artifact,
    parentUpdates: [],
    warnings: [],
    explanation:
      "The view references its source config and insight; it does not duplicate the raw dataset.",
  }
}

export function recipePreview(inputs) {
  const recipe = compatibleRecipe(inputs)
  if (!recipe) {
    if (inputs.filter(Boolean).length < 2)
      return "Choose two artifacts. Inputs are referenced, never consumed."
    return "These items do not share a typed recipe. Their predicates remain unchanged."
  }
  return `${recipe.label}: ${inputs.map((artifact) => artifact.title).join(" + ")} → ${titleCase(recipe.resultKind)}`
}

export function setArtifactStatus(artifact, status) {
  const previousMaturity = artifact.lifecycle?.previousMaturity
  const maturity =
    status === "retracted"
      ? "retired"
      : artifact.maturity === "retired"
        ? (previousMaturity ?? (artifact.kind === "hypothesis" ? "proposed" : "operational"))
        : artifact.maturity
  return {
    ...artifact,
    lifecycle: {
      ...artifact.lifecycle,
      status,
      previousMaturity:
        status === "retracted" && artifact.maturity !== "retired"
          ? artifact.maturity
          : previousMaturity,
    },
    maturity,
  }
}
