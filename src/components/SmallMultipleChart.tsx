"use client"
import * as React from "react"
import type {
  ChartMode,
  LinkedHoverProp,
  MobileInteractionProp,
  SelectionConfig,
} from "./charts/shared/types"
import type { MobileVisualizationContract } from "./charts/shared/auditMobileVisualization"
import {
  LinkedCharts,
  useLinkedChartsActive,
  type LinkedChartsProps,
} from "./LinkedCharts"

export type SmallMultipleExtent = [number, number]

export interface SmallMultipleItem<TDatum = unknown> {
  id: string
  title?: React.ReactNode
  subtitle?: React.ReactNode
  summary?: React.ReactNode
  data?: readonly TDatum[]
  extent?: SmallMultipleExtent
}

export interface SmallMultipleSharedExtent {
  xExtent?: SmallMultipleExtent
  yExtent?: SmallMultipleExtent
  valueExtent?: SmallMultipleExtent
}

export interface SmallMultipleRenderContext<TItem> {
  item: TItem
  index: number
  count: number
  chartProps: Record<string, unknown>
  sharedExtent: SmallMultipleSharedExtent
}

export interface SmallMultipleChartProps<TItem extends SmallMultipleItem = SmallMultipleItem> {
  items?: readonly TItem[]
  children:
    | React.ReactNode
    | ((item: TItem, context: SmallMultipleRenderContext<TItem>) => React.ReactNode)
  /** Columns above the tablet breakpoint. Default 3. */
  columns?: number
  /** Columns between mobile and tablet breakpoints. Default 2. */
  tabletColumns?: number
  /** Columns at the mobile breakpoint. Default 1. */
  mobileColumns?: number
  /** Mobile breakpoint used by the generated CSS. Default 480. */
  mobileBreakpoint?: number
  /** Tablet breakpoint used by the generated CSS. Default 860. */
  tabletBreakpoint?: number
  /** Gap between panels. Default 12. */
  gap?: number
  /** Default child chart mode. Default "mobile". */
  mode?: ChartMode
  /** Default child chart height. Default 220. */
  chartHeight?: number
  /** Share y/value extents across panels. Pass an object for explicit extents. Default true. */
  sharedExtent?: boolean | SmallMultipleSharedExtent
  /** Field or function used to compute the shared y/value extent when sharedExtent is true. */
  valueAccessor?: string | ((datum: unknown) => unknown)
  /** Field or function used to read each item's data array. Default "data". */
  dataAccessor?: string | ((item: TItem) => readonly unknown[] | undefined)
  /** Extent prop names injected into child charts. Default ["yExtent", "valueExtent"]. */
  extentProps?: string[]
  /** Linked hover emitted by each panel. */
  linkedHover?: LinkedHoverProp
  /** Selection consumed by each panel. */
  selection?: SelectionConfig
  /** Convenience config for linked hover + selection using the same name/fields. */
  linkedBy?: string[] | { name?: string; fields?: string[] }
  /** Whether to provide a LinkedCharts wrapper for linked panels. Default "auto". */
  linkProvider?: boolean | "auto"
  /** LinkedCharts selection seed config when SmallMultipleChart provides the wrapper. */
  selections?: LinkedChartsProps["selections"]
  /** Unified legend setting passed to LinkedCharts when SmallMultipleChart provides the wrapper. Default false. */
  showLegend?: LinkedChartsProps["showLegend"]
  legendPosition?: LinkedChartsProps["legendPosition"]
  legendInteraction?: LinkedChartsProps["legendInteraction"]
  legendSelectionName?: LinkedChartsProps["legendSelectionName"]
  legendField?: LinkedChartsProps["legendField"]
  /** Touch-first mobile interaction policy injected into child charts. Default true. */
  mobileInteraction?: MobileInteractionProp
  /** Semantic mobile contract injected into child charts. */
  mobileSemantics?: MobileVisualizationContract
  /** Consistent labeling posture. Panel labels are outside the plot by default. */
  labelMode?: "panel" | "direct" | "legend"
  /** Additional defaults injected into each child chart when the child has not already declared them. */
  chartDefaults?: Record<string, unknown>
  className?: string
  style?: React.CSSProperties
}

function readValue(source: unknown, accessor: string | ((datum: unknown) => unknown) | undefined): unknown {
  if (!accessor) return undefined
  if (typeof accessor === "function") return accessor(source)
  return (source as Record<string, unknown> | null | undefined)?.[accessor]
}

function numericExtent(values: unknown[]): SmallMultipleExtent | undefined {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) continue
    if (numeric < min) min = numeric
    if (numeric > max) max = numeric
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined
  if (min === max) return [min - 1, max + 1]
  return [min, max]
}

function resolveItemData<TItem extends SmallMultipleItem>(
  item: TItem,
  dataAccessor: string | ((item: TItem) => readonly unknown[] | undefined)
): readonly unknown[] {
  const data =
    typeof dataAccessor === "function"
      ? dataAccessor(item)
      : (item as Record<string, unknown>)[dataAccessor]
  return Array.isArray(data) ? data : []
}

function resolveSharedExtent<TItem extends SmallMultipleItem>(
  items: readonly TItem[],
  sharedExtent: boolean | SmallMultipleSharedExtent | undefined,
  dataAccessor: string | ((item: TItem) => readonly unknown[] | undefined),
  valueAccessor: string | ((datum: unknown) => unknown) | undefined
): SmallMultipleSharedExtent {
  if (sharedExtent && typeof sharedExtent === "object") return sharedExtent
  if (sharedExtent === false) return {}

  const explicitItemValues: unknown[] = []
  const dataValues: unknown[] = []
  for (const item of items) {
    if (item.extent) {
      explicitItemValues.push(item.extent[0], item.extent[1])
    }
    if (!valueAccessor) continue
    for (const datum of resolveItemData(item, dataAccessor)) {
      dataValues.push(readValue(datum, valueAccessor))
    }
  }

  const extent = numericExtent(dataValues.length ? dataValues : explicitItemValues)
  return extent ? { yExtent: extent, valueExtent: extent } : {}
}

function defaultMobileSemantics(count: number): MobileVisualizationContract {
  return {
    strategy: "small-multiples",
    responsive: true,
    supportsResponsiveLayout: true,
    summary: `${count} vertically stacked small multiple panel${count === 1 ? "" : "s"} with shared scale guidance.`,
    interaction: {
      primary: "tap",
      alternatives: ["panel summary", "linked selection"],
      hoverFallback: "tap-to-lock",
      targetSize: 44,
    },
    labels: {
      strategy: "external",
      minFontSize: 12,
    },
  }
}

function injectChartProps(
  child: React.ReactNode,
  chartProps: Record<string, unknown>
): React.ReactNode {
  if (!React.isValidElement(child)) return child
  const childProps = child.props as Record<string, unknown>
  const injected: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(chartProps)) {
    if (value !== undefined && childProps[key] == null) injected[key] = value
  }
  return Object.keys(injected).length > 0
    ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, injected)
    : child
}

export function SmallMultipleChart<TItem extends SmallMultipleItem = SmallMultipleItem>({
  items,
  children,
  columns = 3,
  tabletColumns = 2,
  mobileColumns = 1,
  mobileBreakpoint = 480,
  tabletBreakpoint = 860,
  gap = 12,
  mode = "mobile",
  chartHeight = 220,
  sharedExtent = true,
  valueAccessor,
  dataAccessor = "data",
  extentProps = ["yExtent", "valueExtent"],
  linkedHover,
  selection,
  linkedBy,
  linkProvider = "auto",
  selections,
  showLegend = false,
  legendPosition,
  legendInteraction,
  legendSelectionName,
  legendField,
  mobileInteraction = true,
  mobileSemantics,
  labelMode = "panel",
  chartDefaults,
  className,
  style,
}: SmallMultipleChartProps<TItem>) {
  const linkedChartsActive = useLinkedChartsActive()
  const childArray = !items && typeof children !== "function"
    ? React.Children.toArray(children)
    : []
  const resolvedItems: readonly TItem[] =
    items ?? childArray.map((_, index) => ({ id: `panel-${index + 1}` }) as TItem)

  const count = resolvedItems.length
  const resolvedSharedExtent = React.useMemo(
    () => resolveSharedExtent(resolvedItems, sharedExtent, dataAccessor, valueAccessor),
    [resolvedItems, sharedExtent, dataAccessor, valueAccessor]
  )

  const resolvedLinking = React.useMemo(() => {
    if (!linkedBy) {
      return {
        name: undefined as string | undefined,
        fields: undefined as string[] | undefined,
        linkedHover,
        selection,
      }
    }
    const name = Array.isArray(linkedBy) ? "small-multiples" : linkedBy.name || "small-multiples"
    const fields = Array.isArray(linkedBy) ? linkedBy : linkedBy.fields || []
    return {
      name,
      fields,
      linkedHover: linkedHover ?? { name, fields },
      selection: selection ?? { name },
    }
  }, [linkedBy, linkedHover, selection])
  const linkedConfig = React.useMemo(
    () => ({
      linkedHover: resolvedLinking.linkedHover,
      selection: resolvedLinking.selection,
    }),
    [resolvedLinking.linkedHover, resolvedLinking.selection]
  )

  const baseChartDefaults = React.useMemo(() => {
    const defaults: Record<string, unknown> = {
      mode,
      height: chartHeight,
      responsiveWidth: true,
      mobileInteraction,
      mobileSemantics: mobileSemantics ?? defaultMobileSemantics(count),
      ...linkedConfig,
      ...chartDefaults,
    }

    if (labelMode !== "legend") defaults.showLegend = false
    if (labelMode === "direct") defaults.directLabel = true

    for (const prop of extentProps) {
      if (prop in resolvedSharedExtent) {
        defaults[prop] = resolvedSharedExtent[prop as keyof SmallMultipleSharedExtent]
      }
    }

    return defaults
  }, [
    mode,
    chartHeight,
    mobileInteraction,
    mobileSemantics,
    count,
    linkedConfig,
    chartDefaults,
    labelMode,
    extentProps,
    resolvedSharedExtent,
  ])

  const grid = (
    <section
      className={["semiotic-small-multiple-chart", className].filter(Boolean).join(" ")}
      style={style}
      data-semiotic-small-multiple="true"
    >
      <style>{`
        .semiotic-small-multiple-chart {
          --semiotic-small-multiple-columns: ${columns};
          --semiotic-small-multiple-gap: ${gap}px;
          display: grid;
          grid-template-columns: repeat(var(--semiotic-small-multiple-columns), minmax(0, 1fr));
          gap: var(--semiotic-small-multiple-gap);
          width: 100%;
        }
        .semiotic-small-multiple-panel {
          min-width: 0;
          border: 1px solid var(--semiotic-border, #d8d8d8);
          border-radius: 16px;
          background: var(--semiotic-bg, #fff);
          overflow: hidden;
        }
        .semiotic-small-multiple-heading {
          display: grid;
          gap: 3px;
          padding: 10px 12px 0;
        }
        .semiotic-small-multiple-title {
          margin: 0;
          color: var(--semiotic-text, #222);
          font-size: 13px;
          font-weight: 800;
          line-height: 1.25;
        }
        .semiotic-small-multiple-subtitle,
        .semiotic-small-multiple-summary {
          margin: 0;
          color: var(--semiotic-text-secondary, #666);
          font-size: 11px;
          line-height: 1.35;
        }
        .semiotic-small-multiple-plot {
          min-width: 0;
          padding: 4px 6px 8px;
          overflow: hidden;
        }
        @media (max-width: ${tabletBreakpoint}px) {
          .semiotic-small-multiple-chart {
            --semiotic-small-multiple-columns: ${tabletColumns};
          }
        }
        @media (max-width: ${mobileBreakpoint}px) {
          .semiotic-small-multiple-chart {
            --semiotic-small-multiple-columns: ${mobileColumns};
          }
          .semiotic-small-multiple-panel {
            border-radius: 14px;
          }
          .semiotic-small-multiple-heading {
            padding: 9px 10px 0;
          }
        }
      `}</style>
      {resolvedItems.map((item, index) => {
        const chartProps = { ...baseChartDefaults }
        const context: SmallMultipleRenderContext<TItem> = {
          item,
          index,
          count,
          chartProps,
          sharedExtent: resolvedSharedExtent,
        }
        const child =
          typeof children === "function"
            ? children(item, context)
            : childArray[index]

        return (
          <article
            key={item.id ?? index}
            className="semiotic-small-multiple-panel"
            aria-label={typeof item.title === "string" ? item.title : undefined}
          >
            {(item.title || item.subtitle || item.summary) && (
              <header className="semiotic-small-multiple-heading">
                {item.title && (
                  <h3 className="semiotic-small-multiple-title">{item.title}</h3>
                )}
                {item.subtitle && (
                  <p className="semiotic-small-multiple-subtitle">{item.subtitle}</p>
                )}
                {item.summary && (
                  <p className="semiotic-small-multiple-summary">{item.summary}</p>
                )}
              </header>
            )}
            <div className="semiotic-small-multiple-plot">
              {injectChartProps(child, chartProps)}
            </div>
          </article>
        )
      })}
    </section>
  )

  const hasLinking =
    !!linkedBy ||
    !!linkedHover ||
    !!selection ||
    !!selections ||
    showLegend === true
  const shouldProvideLinks =
    linkProvider === true ||
    (linkProvider === "auto" && hasLinking && !linkedChartsActive)

  if (!shouldProvideLinks) return grid

  return (
    <LinkedCharts
      selections={selections}
      showLegend={showLegend}
      legendPosition={legendPosition}
      legendInteraction={legendInteraction}
      legendSelectionName={legendSelectionName ?? resolvedLinking.name ?? "small-multiples"}
      legendField={legendField ?? resolvedLinking.fields?.[0] ?? "category"}
    >
      {grid}
    </LinkedCharts>
  )
}

export default SmallMultipleChart
