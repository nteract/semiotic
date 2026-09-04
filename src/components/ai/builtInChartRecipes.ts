import type { Datum } from "../charts/shared/datumTypes"
import { registerChartRecipe } from "./chartRecipeRegistry"
import {
  defineChartRecipe,
  type ChartRecipe,
  type SerializableSchema
} from "./chartRecipes"

export const PARALLEL_COORDINATES_RECIPE_ID = "ParallelCoordinatesRecipe"
export const CALENDAR_HEATMAP_RECIPE_ID = "CalendarHeatmapRecipe"

export const PARALLEL_COORDINATES_LAYOUT_ID = "semiotic.parallel-coordinates"
export const CALENDAR_HEATMAP_LAYOUT_ID = "semiotic.calendar-heatmap"

export const PARALLEL_COORDINATES_CONFIG_SCHEMA: SerializableSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fields"],
  properties: {
    fields: {
      type: "array",
      minItems: 2,
      maxItems: 12,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
      description: "Ordered numeric fields rendered as parallel axes."
    },
    colorBy: {
      type: "string",
      minLength: 1,
      description: "Optional categorical field used to color records."
    },
    domains: {
      type: "object",
      additionalProperties: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: { type: "number" }
      },
      description: "Optional fixed [minimum, maximum] domain by field."
    },
    opacity: { type: "number", minimum: 0, maximum: 1, default: 0.45 },
    strokeWidth: { type: "number", exclusiveMinimum: 0, default: 1.25 },
    showPoints: { type: "boolean", default: false },
    showAxes: { type: "boolean", default: true },
    axisLabelPadding: { type: "number", minimum: 0, default: 24 },
    dimmedOpacity: { type: "number", minimum: 0, maximum: 1, default: 0.08 }
  }
}

export const CALENDAR_HEATMAP_CONFIG_SCHEMA: SerializableSchema = {
  type: "object",
  additionalProperties: false,
  required: ["dateAccessor", "valueAccessor"],
  properties: {
    dateAccessor: {
      type: "string",
      minLength: 1,
      description:
        "Field containing an ISO date, Date-compatible string, or epoch value."
    },
    valueAccessor: {
      type: "string",
      minLength: 1,
      description: "Numeric field aggregated and encoded by daily cell color."
    },
    colorRamp: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string", minLength: 1 },
      description: "Low and high colors for the daily value ramp."
    },
    year: { type: "integer", minimum: 1, maximum: 9999 },
    gutter: { type: "number", minimum: 0, default: 2 },
    labelInset: { type: "number", minimum: 0, default: 0 }
  }
}

export const parallelCoordinatesRecipe = defineChartRecipe({
  id: PARALLEL_COORDINATES_RECIPE_ID,
  name: "Parallel Coordinates",
  version: "1",
  frameFamily: "OrdinalCustomChart",
  portability: "portable",
  layout: {
    id: PARALLEL_COORDINATES_LAYOUT_ID,
    version: "1",
    importPath: "semiotic/recipes",
    exportName: "parallelCoordinatesLayout"
  },
  layoutConfigSchema: PARALLEL_COORDINATES_CONFIG_SCHEMA,
  dataRoles: [
    {
      role: "dimensions",
      accessor: "fields",
      required: true,
      semanticType: "quantitative",
      multiple: true,
      minimum: 2,
      maximum: 12,
      description:
        "Two or more numeric measures compared across the same records."
    },
    {
      role: "category",
      accessor: "colorBy",
      required: false,
      semanticType: "nominal",
      description: "Optional record category used as a redundant grouping cue."
    },
    {
      role: "record-id",
      required: false,
      semanticType: "identifier",
      description:
        "Optional stable record identifier used by keyboard navigation."
    }
  ],
  encodings: [
    {
      channel: "position",
      role: "dimensions",
      meaning: "Each numeric field has an independently scaled vertical axis."
    },
    {
      channel: "connection",
      role: "dimensions",
      meaning: "A polyline connects one record's values across every axis."
    },
    {
      channel: "color",
      role: "category",
      meaning: "Optional color distinguishes record groups.",
      redundantWith: ["connection"]
    }
  ],
  intents: [
    {
      id: "correlation",
      strength: "primary",
      rationale:
        "Crossing and parallel trajectories reveal multivariate relationships."
    },
    {
      id: "outlier-detection",
      strength: "primary",
      rationale:
        "Unusual profiles remain visible across several measures at once."
    },
    { id: "compare-series", strength: "secondary" }
  ],
  audience: {
    primary: "analytical readers comparing multivariate records",
    familiarity: { general: "low", technical: "medium" },
    literacyTargets: [
      {
        concept: "Each axis uses its own scale.",
        rationale:
          "Polyline slope is not a shared-unit magnitude and should not be read as one."
      }
    ]
  },
  reception: {
    channels: ["visual", "screen-reader", "agent"],
    strengths: [
      "Keeps a whole multivariate profile visible without collapsing it to one score."
    ],
    risks: [
      "Overplotting can hide density and individual paths as row count grows.",
      "Independent axis scales make line slopes unsuitable for direct magnitude comparison."
    ],
    scaffolds: [
      "Keep axis labels visible and provide the accessible data table."
    ]
  },
  designContract: {
    whyCustom:
      "The task is to compare whole multivariate profiles, not isolated pairwise projections.",
    whyNotDefault:
      "A scatterplot exposes only two dimensions at a time; a table hides profile shape.",
    defaultAlternative: "Scatterplot matrix",
    tradeoff:
      "Parallel coordinates preserve profile continuity but trade away familiar shared-axis reading.",
    misuse: [
      "Do not imply that segment slope compares like units across adjacent axes.",
      "Do not use an unreadable wall of paths without filtering, sampling, or aggregation."
    ]
  },
  accessibility: {
    keyboardNavigation: "recommended",
    accessibleTable: "required",
    description: "required",
    navigationGranularity: "datum",
    dataBearingSceneNodes: "required",
    fallbackTable: true,
    redundantEncodings: ["record path", "optional category color"],
    requiresTitle: true,
    requiresSummary: true,
    requiresAccessibleTable: true
  },
  mobile: {
    strategy: "summary-first",
    responsive: true,
    maxMarks: 120,
    summary: true,
    interaction: {
      primary: "tap",
      alternatives: ["accessible table"],
      hoverFallback: "tap-to-lock",
      targetSize: 44
    },
    labels: { strategy: "external", minFontSize: 12 },
    custom: {
      dataBearingSceneNodes: true,
      stableIds: false,
      navigationGranularity: "datum"
    }
  },
  navigation: {
    groupByRole: "category",
    idRole: "record-id",
    itemLabelTemplate: "Record {record-id}",
    summaryTemplate:
      "Parallel coordinates: {count} records across configured numeric dimensions."
  },
  audit: {
    maxMarks: 250,
    requireStableIds: false,
    requireDatumCoverage: true,
    expectedSceneNodeTypes: ["connector"]
  },
  examples: [
    {
      name: "Vehicle profiles",
      description:
        "Compare fuel economy, power, weight, and acceleration by origin.",
      path: "/custom-charts#parallel-coordinates"
    }
  ]
})

export const calendarHeatmapRecipe = defineChartRecipe({
  id: CALENDAR_HEATMAP_RECIPE_ID,
  name: "Calendar Heatmap",
  version: "1",
  frameFamily: "XYCustomChart",
  portability: "portable",
  layout: {
    id: CALENDAR_HEATMAP_LAYOUT_ID,
    version: "1",
    importPath: "semiotic/recipes",
    exportName: "calendarLayout"
  },
  layoutConfigSchema: CALENDAR_HEATMAP_CONFIG_SCHEMA,
  dataRoles: [
    {
      role: "date",
      accessor: "dateAccessor",
      required: true,
      semanticType: "temporal",
      description: "Calendar date for each observation."
    },
    {
      role: "value",
      accessor: "valueAccessor",
      required: true,
      semanticType: "quantitative",
      description: "Daily magnitude encoded by cell color."
    }
  ],
  encodings: [
    {
      channel: "position",
      role: "date",
      meaning: "Week runs left to right and weekday runs top to bottom."
    },
    {
      channel: "color",
      role: "value",
      meaning: "Cell color encodes the aggregated value for one calendar day.",
      redundantWith: ["accessible table"]
    }
  ],
  intents: [
    {
      id: "trend",
      strength: "primary",
      rationale:
        "Calendar position reveals weekly, seasonal, and day-of-week patterns."
    },
    { id: "change-detection", strength: "secondary" },
    { id: "distribution", strength: "supporting" }
  ],
  audience: {
    primary: "readers scanning daily activity over one year",
    familiarity: { general: "medium", technical: "high" },
    literacyTargets: [
      {
        concept:
          "Blank and zero-valued days are distinct inputs even when the low color is shared.",
        rationale:
          "The accessible table preserves authored observations and their values."
      }
    ]
  },
  reception: {
    channels: ["visual", "screen-reader", "agent"],
    strengths: [
      "Makes weekly rhythm and seasonal bursts visible in one compact year."
    ],
    risks: [
      "Color is less precise than position for comparing exact daily values.",
      "Multiple years require small multiples rather than one continuous calendar grid."
    ],
    scaffolds: ["State the year and value meaning in the title or description."]
  },
  designContract: {
    whyCustom:
      "The analytical structure is the calendar itself: week, weekday, and seasonal position all matter.",
    whyNotDefault:
      "A line chart preserves chronology but obscures recurring weekday and calendar-week patterns.",
    defaultAlternative: "LineChart",
    tradeoff:
      "Calendar position improves pattern recognition while reducing exact-value precision.",
    misuse: [
      "Do not combine multiple years in one grid.",
      "Do not use a sequential ramp for values whose meaningful center requires a diverging scale."
    ]
  },
  accessibility: {
    keyboardNavigation: "recommended",
    accessibleTable: "required",
    description: "required",
    navigationGranularity: "datum",
    dataBearingSceneNodes: "required",
    fallbackTable: true,
    tableFields: [
      { role: "date", label: "Date", format: "date" },
      { role: "value", label: "Value", format: "number" }
    ],
    redundantEncodings: ["calendar position", "accessible date/value table"],
    requiresTitle: true,
    requiresSummary: true,
    requiresAccessibleTable: true
  },
  mobile: {
    strategy: "responsive",
    responsive: true,
    minViewportWidth: 320,
    maxMarks: 366,
    summary: true,
    interaction: {
      primary: "tap",
      alternatives: ["accessible table"],
      hoverFallback: "tap-to-lock",
      targetSize: 44
    },
    labels: { strategy: "external", minFontSize: 12 },
    custom: {
      dataBearingSceneNodes: true,
      stableIds: false,
      navigationGranularity: "datum"
    }
  },
  navigation: {
    itemLabelTemplate: "{date}: {value}",
    summaryTemplate: "Calendar heatmap: {count} authored daily observations."
  },
  audit: {
    maxMarks: 366,
    requireStableIds: false,
    requireDatumCoverage: false,
    expectedSceneNodeTypes: ["rect"]
  },
  examples: [
    {
      name: "Daily activity calendar",
      description:
        "Scan a single year of daily values for recurring and seasonal patterns.",
      path: "/custom-charts#calendar-heatmap"
    }
  ]
})

export const BUILT_IN_CHART_RECIPES = [
  parallelCoordinatesRecipe,
  calendarHeatmapRecipe
] as const satisfies ReadonlyArray<ChartRecipe<Datum>>

export function registerBuiltInChartRecipeManifests(): void {
  for (const recipe of BUILT_IN_CHART_RECIPES) registerChartRecipe(recipe)
}

interface RecipeSchemaFunction {
  name: string
  description: string
  parameters: SerializableSchema
  "x-semiotic-kind": "recipe"
  "x-semiotic-renderer": "ChartRecipe"
  "x-semiotic-layout": ChartRecipe["layout"]
}

export interface BuiltInRecipeSchemaTool {
  type: "function"
  function: RecipeSchemaFunction
}

const COMMON_RECIPE_PROPERTIES = {
  data: {
    type: "array",
    minItems: 1,
    items: { type: "object", additionalProperties: true },
    description:
      "Static row data. Required for serialized, MCP, and server rendering."
  },
  width: { type: "number", exclusiveMinimum: 0, default: 600 },
  height: { type: "number", exclusiveMinimum: 0, default: 400 },
  margin: {
    type: ["number", "object"],
    description: "Uniform numeric margin or a partial margin object."
  },
  title: {
    type: "string",
    description: "Visible chart title and accessible name."
  },
  description: {
    type: "string",
    description:
      "Concise accessible description of the chart and its encodings."
  },
  summary: {
    type: "string",
    description:
      "Screen-reader summary of the key takeaway and interaction guidance."
  },
  accessibleTable: {
    type: "boolean",
    default: true,
    description: "Expose the authored data through an accessible table."
  },
  className: { type: "string" }
} as const

function recipeSchemaTool(recipe: ChartRecipe): BuiltInRecipeSchemaTool {
  return {
    type: "function",
    function: {
      name: recipe.id,
      description: `${recipe.name}. ${recipe.designContract.whyCustom}`,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["data", "layoutConfig", "title", "description", "summary"],
        properties: {
          recipeId: {
            type: "string",
            const: recipe.id,
            default: recipe.id,
            description:
              "Portable recipe identifier used by the React ChartRecipe renderer."
          },
          ...COMMON_RECIPE_PROPERTIES,
          layoutConfig: recipe.layoutConfigSchema
        }
      },
      "x-semiotic-kind": "recipe",
      "x-semiotic-renderer": "ChartRecipe",
      "x-semiotic-layout": recipe.layout
    }
  }
}

export function generateBuiltInRecipeSchemaTools(): BuiltInRecipeSchemaTool[] {
  return BUILT_IN_CHART_RECIPES.map(recipeSchemaTool)
}
