/**
 * Serializable numeric input contracts for chart capabilities.
 *
 * The contract table deliberately lives below the AI/capability registry. It is
 * consumed by `diagnoseConfig` and `ChartContainer`, both of which must stay
 * lightweight, while capability descriptors reference the same objects.
 */

export type NumericFieldRole =
  | "x"
  | "y"
  | "value"
  | "size"
  | "count"
  | "opacity"
  | "time"
  | "lower"
  | "upper"
  | "open"
  | "close"
  | "high"
  | "low"
  | (string & {})

export type NumericRequirement =
  | "finite"
  | "positive"
  | "non-negative"
  | "integer"
  | "unit-interval"

export interface NumericFieldContract {
  /** Semantic role used in findings and dynamic scale checks. */
  readonly role: NumericFieldRole
  /** Name of the chart prop that contains a string/function accessor. */
  readonly accessor: string
  /** Resolve this field only when every named chart prop is present. */
  readonly whenProps?: ReadonlyArray<string>
  /** Accessor used by the chart when the prop is omitted. */
  readonly defaultAccessor?: string
  /** Collection prop to inspect. Defaults to `data`. */
  readonly dataProp?: string
  /** Prop naming a nested row array (for line-object `coordinates`, for example). */
  readonly nestedDataAccessorProp?: string
  /** Nested row-array field used when that prop is omitted. */
  readonly defaultNestedDataAccessor?: string
  /** Every numeric binding is finite by default. */
  readonly requirements?: ReadonlyArray<NumericRequirement>
  /** Temporal coercion supported by the chart: Date only, or Date + date-like strings. */
  readonly temporalValues?: "date" | "date-like"
  /** Permit null/undefined values as intentional gaps. Default false. */
  readonly allowMissing?: boolean
  /** Finite numeric fallback the renderer applies to missing values. */
  readonly missingValue?: number
  /** Whether equal values create a zero-span scale domain. */
  readonly domain?: boolean
}

export interface NumericAggregateContract {
  readonly kind: "positive-total" | "normalized-total"
  /** Numeric field role to aggregate. */
  readonly role: NumericFieldRole
  /** Optional grouping accessor prop (for one normalization total per x/category). */
  readonly groupAccessor?: string
  readonly defaultGroupAccessor?: string
  /** Only enforce the aggregate when this boolean prop is true. */
  readonly whenProp?: string
}

export interface NumericContracts {
  readonly fields: ReadonlyArray<NumericFieldContract>
  readonly aggregates?: ReadonlyArray<NumericAggregateContract>
}

const XY_FIELDS = [
  {
    role: "x",
    accessor: "xAccessor",
    defaultAccessor: "x",
    temporalValues: "date-like",
    domain: true,
  },
  {
    role: "y",
    accessor: "yAccessor",
    defaultAccessor: "y",
    domain: true,
  },
] as const satisfies ReadonlyArray<NumericFieldContract>

const XY_CONTRACT: NumericContracts = { fields: XY_FIELDS }

const SERIES_XY_FIELDS = [
  {
    ...XY_FIELDS[0],
    nestedDataAccessorProp: "lineDataAccessor",
    defaultNestedDataAccessor: "coordinates",
  },
  {
    ...XY_FIELDS[1],
    nestedDataAccessorProp: "lineDataAccessor",
    defaultNestedDataAccessor: "coordinates",
    allowMissing: true,
  },
] as const satisfies ReadonlyArray<NumericFieldContract>

const SERIES_XY_CONTRACT: NumericContracts = { fields: SERIES_XY_FIELDS }

const VALUE_FIELD = {
  role: "value",
  accessor: "valueAccessor",
  defaultAccessor: "value",
} as const satisfies NumericFieldContract

const DISTRIBUTION_VALUE_FIELD = {
  ...VALUE_FIELD,
  domain: true,
} as const satisfies NumericFieldContract

const PART_TO_WHOLE_CONTRACT: NumericContracts = {
  fields: [{ ...VALUE_FIELD, requirements: ["finite", "non-negative"] }],
  aggregates: [{ kind: "positive-total", role: "value" }],
}

const STACKED_BAR_CONTRACT: NumericContracts = {
  fields: [VALUE_FIELD],
  aggregates: [
    {
      kind: "normalized-total",
      role: "value",
      groupAccessor: "categoryAccessor",
      defaultGroupAccessor: "category",
      whenProp: "normalize",
    },
  ],
}

const STACKED_AREA_CONTRACT: NumericContracts = {
  fields: SERIES_XY_FIELDS,
  aggregates: [
    {
      kind: "normalized-total",
      role: "y",
      groupAccessor: "xAccessor",
      defaultGroupAccessor: "x",
      whenProp: "normalize",
    },
  ],
}

const BUBBLE_CONTRACT: NumericContracts = {
  fields: [
    ...XY_FIELDS,
    {
      role: "size",
      accessor: "sizeBy",
      requirements: ["finite", "non-negative"],
    },
  ],
}

const SCATTER_CONTRACT: NumericContracts = {
  fields: [
    ...XY_FIELDS,
    {
      role: "size",
      accessor: "sizeBy",
      requirements: ["finite", "non-negative"],
    },
  ],
}

const CANDLESTICK_CONTRACT: NumericContracts = {
  fields: [
    {
      role: "x",
      accessor: "xAccessor",
      defaultAccessor: "x",
      temporalValues: "date-like",
      domain: true,
    },
    {
      role: "high",
      accessor: "highAccessor",
      defaultAccessor: "high",
      requirements: ["finite"],
    },
    {
      role: "low",
      accessor: "lowAccessor",
      defaultAccessor: "low",
      requirements: ["finite"],
    },
    {
      role: "open",
      accessor: "openAccessor",
      whenProps: ["openAccessor", "closeAccessor"],
      requirements: ["finite"],
    },
    {
      role: "close",
      accessor: "closeAccessor",
      whenProps: ["openAccessor", "closeAccessor"],
      requirements: ["finite"],
    },
  ],
}

const DIFFERENCE_CONTRACT: NumericContracts = {
  fields: [
    {
      role: "x",
      accessor: "xAccessor",
      defaultAccessor: "x",
      temporalValues: "date",
      domain: true,
    },
    {
      role: "value",
      accessor: "seriesAAccessor",
      defaultAccessor: "a",
    },
    {
      role: "value",
      accessor: "seriesBAccessor",
      defaultAccessor: "b",
    },
  ],
}

// Heatmap x/y keys may be categorical; only cell magnitude is intrinsically numeric.
const HEATMAP_CONTRACT: NumericContracts = { fields: [VALUE_FIELD] }

const SANKEY_CONTRACT: NumericContracts = {
  fields: [
    {
      ...VALUE_FIELD,
      dataProp: "edges",
      requirements: ["finite", "non-negative"],
      missingValue: 1,
    },
  ],
}

const PROPORTIONAL_SYMBOL_CONTRACT: NumericContracts = {
  fields: [
    {
      role: "x",
      accessor: "xAccessor",
      defaultAccessor: "lon",
      dataProp: "points",
      requirements: ["finite"],
    },
    {
      role: "y",
      accessor: "yAccessor",
      defaultAccessor: "lat",
      dataProp: "points",
      requirements: ["finite"],
    },
    {
      role: "size",
      accessor: "sizeBy",
      dataProp: "points",
      requirements: ["finite", "non-negative"],
    },
  ],
}

/**
 * Compact built-in table. Shared contract objects are intentionally reused so
 * this adds very little to `semiotic/utils/core` when diagnostics import it.
 */
export const BUILT_IN_NUMERIC_CONTRACTS: Readonly<
  Record<string, NumericContracts>
> = {
  LineChart: SERIES_XY_CONTRACT,
  AreaChart: SERIES_XY_CONTRACT,
  BumpChart: SERIES_XY_CONTRACT,
  Scatterplot: SCATTER_CONTRACT,
  ConnectedScatterplot: XY_CONTRACT,
  QuadrantChart: SCATTER_CONTRACT,
  MinimapChart: SERIES_XY_CONTRACT,
  BubbleChart: BUBBLE_CONTRACT,
  StackedAreaChart: STACKED_AREA_CONTRACT,
  DifferenceChart: DIFFERENCE_CONTRACT,
  CandlestickChart: CANDLESTICK_CONTRACT,
  Heatmap: HEATMAP_CONTRACT,

  BarChart: { fields: [VALUE_FIELD] },
  GroupedBarChart: { fields: [VALUE_FIELD] },
  StackedBarChart: STACKED_BAR_CONTRACT,
  DotPlot: { fields: [DISTRIBUTION_VALUE_FIELD] },
  Histogram: { fields: [DISTRIBUTION_VALUE_FIELD] },
  BoxPlot: { fields: [DISTRIBUTION_VALUE_FIELD] },
  SwarmPlot: {
    fields: [
      DISTRIBUTION_VALUE_FIELD,
      {
        role: "size",
        accessor: "sizeBy",
        requirements: ["finite", "non-negative"],
      },
    ],
  },
  ViolinPlot: { fields: [DISTRIBUTION_VALUE_FIELD] },
  RidgelinePlot: { fields: [DISTRIBUTION_VALUE_FIELD] },
  PieChart: PART_TO_WHOLE_CONTRACT,
  DonutChart: PART_TO_WHOLE_CONTRACT,
  FunnelChart: PART_TO_WHOLE_CONTRACT,

  SankeyDiagram: SANKEY_CONTRACT,
  ChordDiagram: SANKEY_CONTRACT,
  ProportionalSymbolMap: PROPORTIONAL_SYMBOL_CONTRACT,
}

interface NumericContractRegistryStore {
  contracts: Map<string, NumericContracts>
}

const REGISTRY_KEY = Symbol.for("semiotic.numericContractRegistry")

function registryStore(): NumericContractRegistryStore {
  const root = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: NumericContractRegistryStore
  }
  root[REGISTRY_KEY] ??= { contracts: new Map() }
  return root[REGISTRY_KEY]
}

/** Internal hook used by the public capability registry for third-party charts. */
export function registerNumericContracts(
  component: string,
  contracts: NumericContracts | undefined,
): void {
  if (contracts) registryStore().contracts.set(component, contracts)
  else registryStore().contracts.delete(component)
}

/** Internal hook used when a third-party capability is unregistered. */
export function unregisterNumericContracts(component: string): void {
  registryStore().contracts.delete(component)
}

export function getNumericContracts(
  component: string,
): NumericContracts | undefined {
  return (
    registryStore().contracts.get(component) ??
    BUILT_IN_NUMERIC_CONTRACTS[component]
  )
}
