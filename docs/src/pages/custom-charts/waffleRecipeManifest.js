import * as SemioticAI from "semiotic/ai"
import { waffleLayout } from "semiotic/recipes"
import {
  registerChartRecipe as registerSourceChartRecipe,
  registerRecipeLayout as registerSourceRecipeLayout,
} from "../../../../src/components/ai/chartRecipeRegistry"

const { defineChartRecipe } = SemioticAI
const registerChartRecipe =
  SemioticAI.registerChartRecipe || registerSourceChartRecipe
const registerRecipeLayout =
  SemioticAI.registerRecipeLayout || registerSourceRecipeLayout

function aggregateWaffle(data, config) {
  const categoryField = config.categoryAccessor || "category"
  const valueField = config.valueAccessor || "value"
  const rows = config.rows || 10
  const columns = config.columns || 10
  const unitCount = rows * columns
  const totals = new Map()

  for (const datum of data) {
    const category = String(datum?.[categoryField] ?? "Uncategorized")
    const raw = Number(datum?.[valueField])
    const value = Number.isFinite(raw) ? Math.max(0, raw) : 0
    totals.set(category, (totals.get(category) || 0) + value)
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0)
  if (total <= 0) return { total: 0, unitCount, categories: [] }

  const categories = [...totals].map(([category, value], index) => {
    const exactUnits = (value / total) * unitCount
    const units = Math.floor(exactUnits)
    return {
      category,
      value,
      share: value / total,
      exactUnits,
      units,
      remainder: exactUnits - units,
      index,
    }
  })

  let remaining = unitCount - categories.reduce((sum, category) => sum + category.units, 0)
  const byRemainder = [...categories].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  )
  for (let i = 0; i < remaining; i += 1) {
    byRemainder[i % byRemainder.length].units += 1
  }

  return { total, unitCount, categories }
}

function describeWaffle({ data, config, locale = "en" }) {
  const summary = aggregateWaffle(data, config)
  const format = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 })
  const largest = [...summary.categories].sort((a, b) => b.value - a.value)[0]
  const categoryField = config.categoryAccessor || "category"
  const valueField = config.valueAccessor || "value"

  const levels = {
    l1: `A ${summary.unitCount}-cell waffle chart showing ${valueField} composition by ${categoryField}.`,
    l2: `${summary.categories.length} categories total ${format.format(summary.total)}; each cell represents approximately ${percent.format(1 / Math.max(1, summary.unitCount))} of the whole.`,
    l3: largest
      ? `${largest.category} is the largest category at ${percent.format(largest.share)}, represented by ${largest.units} of ${summary.unitCount} cells.`
      : "No positive values are available to allocate to cells.",
    l4: "This is an apportioning and explanatory chart: repeated units make the composition tangible while category summaries preserve the meaningful reading unit.",
  }

  return { levels, text: [levels.l1, levels.l2, levels.l3, levels.l4].join(" ") }
}

function navigateWaffle({ data, config, locale = "en" }) {
  const summary = aggregateWaffle(data, config)
  const format = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 })
  const description = describeWaffle({ data, config, locale })

  return {
    id: "root",
    role: "chart",
    label: description.text,
    level: 1,
    children: summary.categories.map((category, index) => ({
      id: `category-${index}`,
      role: "series",
      level: 2,
      label: `${category.category}: ${format.format(category.value)}, ${percent.format(category.share)}, ${category.units} of ${summary.unitCount} cells.`,
      value: category.value,
      datum: data.find(
        (datum) => String(datum?.[config.categoryAccessor || "category"]) === category.category,
      ),
    })),
  }
}

/**
 * Manual v0 manifest kept beside the Waffle example. This is intentionally a
 * recipe/example contract, not yet a global recipe registry entry.
 */
export const waffleRecipeManifest = defineChartRecipe({
  id: "semiotic.recipe.waffle.v0",
  name: "Waffle chart",
  version: "0",
  frameFamily: "XYCustomChart",
  portability: "portable",
  layout: {
    id: "semiotic.layout.waffle",
    importPath: "semiotic/recipes",
    exportName: "waffleLayout",
  },
  layoutConfigSchema: {
    type: "object",
    properties: {
      rows: { type: "number", minimum: 1, default: 10 },
      columns: { type: "number", minimum: 1, default: 10 },
      gutter: { type: "number", minimum: 0, default: 2 },
      categoryAccessor: { type: "string" },
      valueAccessor: { type: "string" },
      categoryOrder: { type: "array", items: { type: "string" } },
    },
  },
  dataRoles: [
    {
      role: "category",
      field: "region",
      accessor: "categoryAccessor",
      required: true,
      semanticType: "nominal",
      description: "The group represented by a set of unit cells.",
      source: "data",
    },
    {
      role: "value",
      field: "share",
      accessor: "valueAccessor",
      required: true,
      semanticType: "quantitative",
      description: "The magnitude represented by the number of cells.",
      source: "data",
    },
  ],
  encodings: [
    {
      channel: "position",
      role: "category",
      meaning: "Contiguous cells are grouped spatially by category.",
      redundantWith: ["color", "category summary"],
    },
    {
      channel: "count",
      role: "value",
      meaning: "Each visible unit represents one normalized portion of the total.",
      redundantWith: ["category share", "accessible table"],
    },
    {
      channel: "color",
      role: "category",
      meaning: "Color distinguishes categories but is not the sole accessible cue.",
      redundantWith: ["position", "legend", "category label"],
    },
  ],
  intents: [
    {
      id: "part-to-whole",
      strength: "primary",
      score: 5,
      rationale: "Repeated units directly expose how categories compose a total.",
    },
    {
      id: "compare-categories",
      strength: "secondary",
      score: 3,
      rationale: "Unit counts support broad comparisons, though bars remain more precise.",
    },
    {
      id: "explanation",
      strength: "secondary",
      score: 5,
      rationale: "Visible units make normalization and share easy to teach.",
    },
  ],
  audience: {
    primary: "general-technical",
    familiarity: {
      waffleChart: "medium",
      partToWhole: "high",
    },
    literacyTargets: [
      {
        concept: "unit-based composition",
        rationale: "Readers can reason about proportions through repeated visible units.",
      },
    ],
  },
  audienceFit: [
    {
      audience: "general-technical",
      fit: "strong",
      rationale: "The unit metaphor is recognizable with a short legend and summary.",
    },
  ],
  reception: {
    channels: ["visual", "interactive", "screen-reader", "agent"],
    strengths: ["memorable", "glanceable", "explainable", "teaching-friendly"],
    risks: ["precise comparison may be harder than a bar chart", "individual cells can become navigation noise"],
    scaffolds: ["legend", "category summary", "accessible table", "description"],
    memorableForm: true,
  },
  designContract: {
    whyCustom: "A unit grid makes composition more concrete and memorable than an abstract arc or line.",
    whyThisForm: "A unit grid makes composition concrete through repeated, inspectable units.",
    whyNotDefault: "A pie chart would show share but provide less unit-level evidence and less interaction surface.",
    defaultAlternative: "BarChart",
    tradeoff: "A bar chart supports more precise comparison; the waffle favors composition and memorability.",
    misuse: ["too many categories", "too many units", "false precision", "treating each cell as a separate semantic datum"],
  },
  description: describeWaffle,
  navigation: navigateWaffle,
  accessibility: {
    keyboardNavigation: "required",
    accessibleTable: "required",
    description: "required",
    navigationGranularity: "category",
    dataBearingSceneNodes: "required",
    fallbackTable: true,
    requiresTitle: true,
    requiresSummary: true,
    requiresAccessibleTable: true,
    minimumHitTarget: 24,
    tableRoles: ["category", "value"],
    tableFields: [
      { role: "category", label: "Category" },
      { role: "value", label: "Value", format: "number" },
      { field: "share", label: "Share", format: "percent" },
    ],
    redundantEncodings: ["category position", "category summary", "legend"],
    requirements: [
      "Announce category value, share, and allocated unit count.",
      "Aggregate navigation by category so repeated cells do not become meaningless noise.",
    ],
  },
  audit: {
    maxCategories: 8,
    maxMarks: 400,
    requireDatumCoverage: true,
    expectedSceneNodeTypes: ["rect"],
    checks: [
      "Allocated cells equal rows × columns.",
      "Every input category is represented.",
      "Category navigation is available in addition to raw cell hit targets.",
    ],
  },
  caveats: [
    "Rounded cell allocation communicates only the precision supported by the unit count.",
    "Use a ranked bar when exact pairwise comparison is the primary task.",
  ],
  examples: [
    {
      name: "Regional share",
      description: "Four regional shares allocated across a 10 × 10 unit grid.",
      path: "/custom-charts/custom-layouts#waffle-chart",
    },
  ],
})

registerChartRecipe(waffleRecipeManifest)
registerRecipeLayout("semiotic.layout.waffle", waffleLayout)

export { aggregateWaffle }
