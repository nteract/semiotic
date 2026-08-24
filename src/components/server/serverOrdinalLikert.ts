import type { Datum } from "../charts/shared/datumTypes"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import {
  NEUTRAL_NEG,
  NEUTRAL_POS,
  aggregateData,
  defaultDivergingScheme,
  orderForDiverging,
  resolveAccessorFn,
  toDivergingValues
} from "../charts/shared/useLikertAggregation"
import { resolveStyleRules, type StyleRule } from "../charts/shared/styleRules"
import { composeLegendConfigs } from "../types/legendTypes"
import {
  primitiveStyleOverrides,
  type ChartConfig
} from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"

export const likertChart: ChartConfig = {
  frameType: "ordinal",
  layout: {
    margin: (props, resolved) => ({
      ...resolved.marginDefaults,
      left:
        props.orientation === "vertical"
          ? resolved.marginDefaults.left
          : Math.max(100, resolved.marginDefaults.left)
    })
  },
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const levels =
      Array.isArray(rest.levels) && rest.levels.length >= 2
        ? (rest.levels as string[])
        : [
            "Strongly disagree",
            "Disagree",
            "Neutral",
            "Agree",
            "Strongly agree"
          ]
    const isDiverging = rest.orientation !== "vertical"
    const rows = Array.isArray(data)
      ? data.filter(
          (datum): datum is Datum => !!datum && typeof datum === "object"
        )
      : []
    const getCategory = resolveAccessorFn<string>(
      rest.categoryAccessor,
      "question"
    )
    const getScore = rest.levelAccessor
      ? null
      : resolveAccessorFn<number>(rest.valueAccessor, "score")
    const getLevel = rest.levelAccessor
      ? resolveAccessorFn<string>(rest.levelAccessor, "level")
      : null
    const getCount = rest.levelAccessor
      ? resolveAccessorFn<number>(rest.countAccessor, "count")
      : null
    let processed = aggregateData(
      rows,
      levels,
      getCategory,
      getScore,
      getLevel,
      getCount,
      {
        category:
          typeof rest.categoryAccessor === "string"
            ? rest.categoryAccessor
            : undefined,
        level:
          typeof rest.levelAccessor === "string"
            ? rest.levelAccessor
            : undefined,
        count:
          typeof rest.countAccessor === "string"
            ? rest.countAccessor
            : undefined,
        score:
          !rest.levelAccessor && typeof rest.valueAccessor === "string"
            ? rest.valueAccessor
            : undefined
      }
    )
    if (isDiverging) {
      processed = orderForDiverging(
        toDivergingValues(processed, levels),
        levels
      )
    }
    const themeDiverging = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.diverging
    const palette =
      Array.isArray(colorScheme) && colorScheme.length >= levels.length
        ? colorScheme
        : defaultDivergingScheme(levels.length, themeDiverging)
    const levelColors = new Map(
      levels.map((level, index) => [level, palette[index] || "#888"])
    )
    const neutralColor =
      levels.length % 2
        ? levelColors.get(levels[Math.floor(levels.length / 2)]) || "#888"
        : "#888"
    const valueFormat =
      typeof rest.valueFormat === "function"
        ? rest.valueFormat
        : (value: number | string) => `${Math.abs(Number(value)).toFixed(0)}%`
    const chartLegend =
      common.showLegend === false
        ? undefined
        : {
            legendGroups: [
              {
                label: "",
                items: levels.map((label) => ({ label })),
                styleFn: (item: { label: string }) => ({
                  fill: levelColors.get(item.label) || "#888"
                })
              }
            ]
          }
    const legend = composeLegendConfigs(chartLegend, common.legend)
    const rules = rest.styleRules as StyleRule[] | undefined
    const userPieceStyle = common.pieceStyle as
      ((datum: Datum, category?: string) => Datum) | Datum | undefined
    const likertPieceStyle = (datum: Datum, category?: string): Datum => {
      const level = datum.__likertLevel || datum.data?.__likertLevel
      const label = datum.__likertLevelLabel || datum.data?.__likertLevelLabel
      const value = datum.__likertPct ?? datum.data?.__likertPct
      const base: Datum = {
        fill:
          level === NEUTRAL_NEG || level === NEUTRAL_POS
            ? neutralColor
            : levelColors.get(String(label || level)) || "#888"
      }
      if (rules?.length) {
        Object.assign(
          base,
          resolveStyleRules(datum, rules, {
            value: typeof value === "number" ? value : undefined,
            category: category ?? (label == null ? undefined : String(label))
          })
        )
      }
      if (typeof userPieceStyle === "function") {
        Object.assign(base, userPieceStyle(datum, category) || {})
      } else if (userPieceStyle && typeof userPieceStyle === "object") {
        Object.assign(base, userPieceStyle)
      }
      return base
    }
    return {
      chartType: "bar",
      data: processed,
      oAccessor: "__likertCategory",
      rAccessor: "__likertPct",
      stackBy: "__likertLevel",
      normalize: false,
      projection: isDiverging ? "horizontal" : "vertical",
      barPadding: rest.barPadding,
      showGrid: common.showGrid,
      oLabel: rest.categoryLabel,
      rLabel: rest.valueLabel || (isDiverging ? undefined : "Percentage"),
      rFormat: valueFormat,
      ...(rest.categoryFormat && { oFormat: rest.categoryFormat }),
      ...(rest.valueExtent && { rExtent: rest.valueExtent }),
      ...common,
      // Likert uses a level-keyed diverging palette rather than the normal
      // ordinal color scale. Preserve the neutral split's shared color.
      pieceStyle: mergeShapeStyle(
        likertPieceStyle,
        primitiveStyleOverrides(rest)
      ),
      showLegend: common.showLegend ?? true,
      legendPosition: common.legendPosition || "right",
      ...(legend && { legend }),
      // Do not infer a second legend from internal neutral-split buckets.
      __legendIncludesAutomatic: true
    }
  }
}
