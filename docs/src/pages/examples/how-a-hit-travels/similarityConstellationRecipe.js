import { defineChartRecipe, registerChartRecipe, registerRecipeLayout } from "semiotic/ai"
import { similarityConstellationLayout } from "./SimilarityConstellation"

export const SIMILARITY_CONSTELLATION_LAYOUT_ID = "semiotic.layout.similarity-constellation.v1"
export const SIMILARITY_CONSTELLATION_RECIPE_ID = "semiotic.recipe.similarity-constellation.v1"

registerRecipeLayout(SIMILARITY_CONSTELLATION_LAYOUT_ID, similarityConstellationLayout, {
  version: "1",
})

export const similarityConstellationRecipe = defineChartRecipe({
  id: SIMILARITY_CONSTELLATION_RECIPE_ID,
  name: "Similarity Constellation",
  version: "1",
  frameFamily: "NetworkCustomChart",
  portability: "portable",
  layout: {
    id: SIMILARITY_CONSTELLATION_LAYOUT_ID,
    version: "1",
    importPath: "./SimilarityConstellation",
    exportName: "similarityConstellationLayout",
  },
  layoutConfigSchema: {
    type: "object",
    properties: {
      layoutMode: { enum: ["map", "constellation"] },
      positions: { type: "object" },
      cursor: { type: "number", minimum: 0 },
      selectedCountryId: { type: ["string", "null"] },
      reducedMotion: { type: "boolean" },
      nodeGlowId: { type: "string" },
    },
    required: ["layoutMode", "positions", "cursor"],
  },
  dataRoles: [
    {
      role: "entity-id",
      field: "id",
      required: true,
      semanticType: "identifier",
      source: "nodes",
      description: "Stable identity preserved between geographic and similarity positions.",
    },
    {
      role: "geographic-position",
      field: "longitude, latitude",
      required: true,
      semanticType: "geographic",
      source: "nodes",
    },
    {
      role: "similarity-position",
      field: "positions[id]",
      required: true,
      semanticType: "quantitative",
      source: "config",
    },
    {
      role: "relationship",
      field: "similarity",
      required: true,
      semanticType: "quantitative",
      source: "edges",
    },
  ],
  encodings: [
    {
      channel: "position",
      role: ["geographic-position", "similarity-position"],
      meaning:
        "The same entity moves between geographic location and approximate similarity location.",
      redundantWith: ["mode label", "country label", "relationship table"],
    },
    {
      channel: "connection",
      role: "relationship",
      meaning:
        "A sparse edge marks a mutual nearest-neighbor relationship, not influence or transmission.",
      redundantWith: ["selected-country relationship list"],
    },
    {
      channel: "size",
      role: "temporal activation",
      meaning: "Larger marks are active at the current time cursor.",
      redundantWith: ["fill", "text status"],
    },
  ],
  intents: [
    { id: "correlation", strength: "primary", score: 5 },
    { id: "geo", strength: "supporting", score: 4 },
    { id: "change-detection", strength: "supporting", score: 3 },
  ],
  audience: {
    primary: "general-reader",
    familiarity: { pointMap: "high", similarityNetwork: "low" },
    literacyTargets: [
      {
        concept: "similarity is descriptive, approximate, and specification-dependent",
        rationale: "Position and connection must not be read as a causal path.",
      },
    ],
  },
  reception: {
    channels: ["visual", "interactive", "screen-reader", "agent"],
    strengths: ["identity-preserving", "exploratory", "comparable"],
    risks: ["approximate distance can look precise", "edges can be mistaken for influence"],
    scaffolds: ["mode label", "plain-language definition", "relationship list", "accessible table"],
    memorableForm: true,
  },
  designContract: {
    whyCustom:
      "One stable entity must move between geographic and computed similarity positions while retaining selection, time state, and an ordinary relationship table.",
    whyThisForm:
      "The identity-preserving transition makes the difference between physical proximity and shared observations legible.",
    whyNotDefault:
      "A live force graph would move on every filter and a map alone cannot reveal non-geographic similarity.",
    defaultAlternative: "Pairwise similarity table",
    tradeoff:
      "Screen distance is approximate, so exact scores and contributing observations remain available beside the chart.",
    misuse: [
      "drawing directional arrows",
      "describing edges as influence or transmission",
      "recomputing positions silently during exploration",
      "presenting clusters as natural cultural categories",
    ],
  },
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
      { field: "name", label: "Country" },
      { field: "region", label: "Region" },
      { field: "firstWeek", label: "First observed week", format: "date" },
      { field: "bestRank", label: "Best rank", format: "number" },
    ],
    redundantEncodings: ["node state", "live status", "country table", "relationship list"],
    requirements: [
      "Every visible country has a stable interactive scene node.",
      "The description states that edges are similarity, not causal pathways.",
      "Reduced motion snaps between complete labeled states.",
    ],
  },
  mobile: {
    strategy: "summary-cards",
    supportsResponsiveLayout: true,
    breakpoints: [320, 390, 768],
    maxMarks: 40,
    maxAnnotations: 2,
    minimumHitTarget: 44,
    summary: true,
    interaction: {
      primary: "tap",
      alternatives: ["country list", "relationship table"],
      hoverFallback: "tap-to-lock",
    },
    labels: { strategy: "external", minFontSize: 12 },
    custom: {
      dataBearingSceneNodes: true,
      stableIds: true,
      navigationGranularity: "group",
    },
  },
  description: ({ data, config }) => {
    const mode = config?.layoutMode === "map" ? "geographic map" : "similarity constellation"
    return {
      text: `${data.length} entities in a ${mode}. Country identity is stable between modes; connections describe shared ranking observations and do not show influence.`,
    }
  },
  navigation: ({ data }) => ({
    id: "similarity-constellation",
    role: "chart",
    label: `Similarity constellation with ${data.length} countries.`,
    level: 1,
    children: [...new Set(data.map((country) => country.region))].map((region) => ({
      id: `region-${region}`,
      role: "series",
      label: region,
      level: 2,
      children: data
        .filter((country) => country.region === region)
        .map((country) => ({
          id: `country-${country.id}`,
          role: "datum",
          label: country.name,
          level: 3,
          datum: country,
        })),
    })),
  }),
  audit: {
    maxMarks: 120,
    minimumHitTargetSize: 24,
    requireStableIds: true,
    requireDatumCoverage: true,
    expectedSceneNodeTypes: ["circle"],
    checks: [
      "Every edge resolves to two existing country ids and clears the published minimum similarity.",
      "The same country id survives every display mode.",
      "No directed edge or causal-language annotation is emitted.",
    ],
  },
  caveats: [
    "Layout distance is approximate.",
    "Similarity depends on the selected corpus, time window, and weighting mode.",
  ],
  examples: [
    {
      name: "How a Hit Travels",
      description:
        "Country similarity and title arrival in Netflix's published weekly Top 10 lists.",
      path: "/examples/how-a-hit-travels",
    },
  ],
})

registerChartRecipe(similarityConstellationRecipe)

export const serializedSimilarityConstellation = {
  recipe: SIMILARITY_CONSTELLATION_RECIPE_ID,
  recipeVersion: 1,
  parameters: {
    layoutMode: "constellation",
    weightingMode: "distinctive-rank",
    edgeCount: 4,
  },
}
