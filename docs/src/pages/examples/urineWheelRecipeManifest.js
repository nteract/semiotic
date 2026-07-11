import { defineChartRecipe, registerChartRecipe } from "semiotic/ai"

function describeUrineWheel({ data }) {
  const colors = data.filter((datum) => datum.kind === "color")
  const diagnoses = data.filter((datum) => datum.kind === "diagnosis")
  const levels = {
    l1: `A custom radial network connecting ${colors.length} named urine colors to ${diagnoses.length} stages of digestion.`,
    l2: "Color nodes form a continuous white-to-gold-to-black ring; diagnosis nodes sit at the mean angle of the colors connected to them.",
    l3: "Gold and ruddy colors gather around perfect digestion, while pale colors lead toward indigestion and dark colors toward burning and mortification.",
    l4: "This is a situated explanatory chart: its historical wheel idiom teaches the medieval diagnostic worldview while interaction and text scaffolds keep that unfamiliar form receivable.",
  }
  return { levels, text: [levels.l1, levels.l2, levels.l3, levels.l4].join(" ") }
}

function navigateUrineWheel({ data }) {
  const colors = data.filter((datum) => datum.kind === "color")
  const diagnoses = data.filter((datum) => datum.kind === "diagnosis")
  const description = describeUrineWheel({ data })
  return {
    id: "root",
    role: "chart",
    label: description.text,
    level: 1,
    children: [
      {
        id: "colors",
        role: "series",
        label: `Urine colors: ${colors.length} named colors ordered around the wheel.`,
        level: 2,
        children: colors.map((datum, index) => ({
          id: `color-${index}`,
          role: "datum",
          level: 3,
          label: `${datum.id}, ${datum.english}; ${datum.simileEnglish}; connected to ${datum.diagnosisLabel}.`,
          datum,
        })),
      },
      {
        id: "diagnoses",
        role: "series",
        label: `Stages of digestion: ${diagnoses.length} diagnoses.`,
        level: 2,
        children: diagnoses.map((datum, index) => ({
          id: `diagnosis-${index}`,
          role: "datum",
          level: 3,
          label: `${datum.short}: ${datum.english}. ${datum.meaning}`,
          datum,
        })),
      },
    ],
  }
}

/**
 * High-flavor v0 manifest kept beside the Urine Wheel example. Its purpose is
 * to make the reception case inspectable: the historical visual idiom is part
 * of the meaning, not decoration applied to a generic comparison.
 */
export const urineWheelRecipeManifest = defineChartRecipe({
  id: "semiotic.recipe.urine-wheel.v0",
  name: "Rota Urinarum",
  version: "0",
  frameFamily: "NetworkCustomChart",
  portability: "local",
  dataRoles: [
    {
      role: "node-id",
      field: "id",
      required: true,
      semanticType: "identifier",
      description: "Stable identity for each color or diagnosis.",
      source: "nodes",
    },
    {
      role: "node-kind",
      field: "kind",
      required: true,
      semanticType: "nominal",
      description: "Distinguishes urine colors from diagnostic stages.",
      source: "nodes",
    },
    {
      role: "color-order",
      field: "order",
      required: true,
      semanticType: "ordinal",
      description: "Places urine colors along the historical coction spectrum.",
      source: "nodes",
    },
    {
      role: "edge-source",
      field: "source",
      required: true,
      semanticType: "identifier",
      description: "The urine color being interpreted.",
      source: "edges",
    },
    {
      role: "edge-target",
      field: "target",
      required: true,
      semanticType: "identifier",
      description: "The stage of digestion signified by the color.",
      source: "edges",
    },
  ],
  encodings: [
    {
      channel: "angle",
      role: "color-order",
      meaning: "Clockwise order recreates the historical spectrum from raw white through healthy gold to burnt black.",
      redundantWith: ["color name", "text description"],
    },
    {
      channel: "connection",
      role: ["edge-source", "edge-target"],
      meaning: "A spoke states which stage of digestion a urine color was believed to signify.",
      redundantWith: ["diagnosis label", "accessible navigation group"],
    },
    {
      channel: "color",
      role: "node-kind",
      meaning: "The flask liquid preserves the historical named color while diagnosis accents distinguish stages.",
      redundantWith: ["position", "label", "connection"],
    },
    {
      channel: "position",
      role: "node-kind",
      meaning: "Colors occupy the outer ring and diagnoses the inner ring, teaching how observations map to interpretations.",
      redundantWith: ["shape", "navigation group"],
    },
  ],
  intents: [
    {
      id: "explanation",
      strength: "primary",
      score: 5,
      rationale: "The diagram explains a historical diagnostic system rather than ranking isolated values.",
    },
    {
      id: "relationship",
      strength: "primary",
      score: 5,
      rationale: "The important evidence is the color-to-diagnosis relationship.",
    },
    {
      id: "situated-reading",
      strength: "primary",
      score: 5,
      rationale: "The wheel's idiom places the reader inside the historical model being explained.",
    },
  ],
  audience: {
    primary: "general-cultural",
    familiarity: {
      radialNetwork: "low",
      diagnosticWheel: "low",
      colorSpectrum: "high",
    },
    literacyTargets: [
      {
        concept: "historically situated evidence",
        rationale: "Readers learn both the relationships and the worldview that organized them.",
      },
    ],
  },
  audienceFit: [
    {
      audience: "general-cultural",
      fit: "strong",
      rationale: "The unfamiliar idiom is justified by its explanatory and mnemonic value.",
    },
  ],
  reception: {
    channels: ["visual", "interactive", "screen-reader", "agent"],
    strengths: ["memorable", "situated", "exploratory", "teaching-friendly"],
    risks: ["unfamiliar form", "historical color semantics can be mistaken for modern medical evidence"],
    scaffolds: ["legend", "layered description", "provenance annotations", "accessible table", "grouped navigation"],
    memorableForm: true,
  },
  designContract: {
    whyCustom: "The wheel preserves a historical diagnostic idiom whose circular spectrum and spokes teach how medieval physicians organized observation into prognosis.",
    whyThisForm: "The historical wheel idiom teaches both the relationships and the worldview that organized them.",
    whyNotDefault: "A bar chart would enumerate colors or diagnoses but erase the spectrum, the many-to-one relationships, and the situated act of reading the wheel.",
    defaultAlternative: "Adjacency list",
    tradeoff: "The wheel is less familiar and requires orientation plus historical provenance.",
    misuse: [
      "presenting historical associations as modern medical claims",
      "removing textual provenance",
      "using color without names and connections",
      "flattening the wheel into decorative radial placement",
    ],
  },
  mobile: {
    strategy: "guided-exploration",
    supportsResponsiveLayout: true,
    breakpoints: [320, 390, 768],
    maxMarks: 44,
    maxAnnotations: 2,
    minimumHitTarget: 44,
    summary: true,
    interaction: {
      primary: "tap",
      alternatives: ["group navigation", "details panel"],
      hoverFallback: "tap-to-lock",
    },
    labels: { strategy: "external", minFontSize: 12 },
    custom: {
      dataBearingSceneNodes: true,
      stableIds: true,
      navigationGranularity: "group",
    },
  },
  description: describeUrineWheel,
  navigation: navigateUrineWheel,
  accessibility: {
    keyboardNavigation: "required",
    accessibleTable: "required",
    description: "required",
    navigationGranularity: "group",
    dataBearingSceneNodes: "required",
    fallbackTable: true,
    requiresTitle: true,
    requiresSummary: true,
    requiresAccessibleTable: true,
    minimumHitTarget: 24,
    tableFields: [
      { role: "node-id", label: "Identifier" },
      { field: "english", label: "English label" },
      { field: "diagnosisLabel", label: "Diagnosis" },
    ],
    redundantEncodings: ["node labels", "radial position", "spoke connections", "grouped navigation"],
    requirements: [
      "Every visible flask and diagnosis must have a matching network hit target.",
      "The description must distinguish historical belief from current medical evidence.",
      "Color names and diagnosis relationships must be available without perceiving color.",
    ],
  },
  audit: {
    maxMarks: 50,
    minimumHitTargetSize: 24,
    requireStableIds: true,
    requireDatumCoverage: true,
    expectedSceneNodeTypes: ["circle"],
    checks: [
      "Visible overlay marks and invisible scene hit targets remain one-to-one.",
      "All color-to-diagnosis edges resolve to existing node ids.",
      "Historical provenance is present in annotations and description.",
    ],
  },
  caveats: [
    "The idiom requires orientation before first use.",
    "A conventional adjacency list remains the precision fallback for relationship lookup.",
  ],
  examples: [
    {
      name: "The Wheel of Urines",
      description: "Twenty named colors connected to seven stages of coction.",
      path: "/examples/urine-wheel",
    },
  ],
})

registerChartRecipe(urineWheelRecipeManifest)
