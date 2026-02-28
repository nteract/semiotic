import * as React from "react"
import { useMemo } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import type { PieceTypeSettings } from "../../types/ordinalTypes"

/**
 * DonutChart component props
 */
export interface DonutChartProps extends BaseChartProps {
  /**
   * Array of data points, one per slice.
   * @example
   * ```ts
   * [{category: 'A', value: 30}, {category: 'B', value: 50}, {category: 'C', value: 20}]
   * ```
   */
  data: Array<Record<string, any>>

  /**
   * Field name or function to access slice labels
   * @default "category"
   */
  categoryAccessor?: Accessor<string>

  /**
   * Field name or function to access slice values
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Inner radius in pixels. Controls the donut hole size.
   * @default 60
   */
  innerRadius?: number

  /**
   * Content to render in the center of the donut (e.g. a total label)
   */
  centerContent?: React.ReactNode

  /**
   * Field name or function to determine slice color
   * @default categoryAccessor
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Starting angle offset in degrees
   * @default 0
   */
  startAngle?: number

  /**
   * Padding between slices (in pixels)
   * @default 2
   */
  slicePadding?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional OrdinalFrame props for advanced customization
   * For full control, consider using OrdinalFrame directly
   */
  frameProps?: Partial<Omit<OrdinalFrameProps, "data" | "size">>
}

/**
 * DonutChart - Visualize proportions as slices of a ring.
 *
 * A simplified wrapper around OrdinalFrame with radial projection and
 * an inner radius to create a donut shape.
 *
 * @example
 * ```tsx
 * <DonutChart
 *   data={[
 *     {category: 'A', value: 30},
 *     {category: 'B', value: 50},
 *     {category: 'C', value: 20}
 *   ]}
 *   innerRadius={80}
 *   centerContent={<span>Total: 100</span>}
 * />
 * ```
 */
export function DonutChart(props: DonutChartProps) {
  const {
    data,
    width = 400,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    innerRadius = 60,
    centerContent,
    colorBy,
    colorScheme = "category10",
    startAngle = 0,
    slicePadding = 2,
    enableHover = true,
    showLegend = true,
    tooltip,
    frameProps = {}
  } = props

  const safeData = data || []

  // Default colorBy to categoryAccessor for donut charts
  const actualColorBy = colorBy || categoryAccessor

  // Create color scale
  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  // Piece style function
  const pieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

      if (actualColorBy) {
        baseStyle.fill = getColor(d, actualColorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [actualColorBy, colorScale])

  // Build legend if needed
  const legend = useMemo(() => {
    if (!showLegend) return undefined

    return createLegend({
      data: safeData,
      colorBy: actualColorBy,
      colorScale,
      getColor
    })
  }, [showLegend, safeData, actualColorBy, colorScale])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 20, bottom: 20, left: 20, right: 20 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Build type config with innerRadius
  const typeConfig = useMemo((): PieceTypeSettings => {
    const config: PieceTypeSettings = {
      type: "bar",
      innerRadius
    }

    if (startAngle) {
      config.offsetAngle = startAngle
    }

    return config
  }, [innerRadius, startAngle])

  // Center content rendered via foregroundGraphics
  const foregroundGraphics = useMemo(() => {
    if (!centerContent) return undefined

    const cx = width / 2
    const cy = height / 2

    return (
      <foreignObject
        x={cx - innerRadius}
        y={cy - innerRadius}
        width={innerRadius * 2}
        height={innerRadius * 2}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          {centerContent}
        </div>
      </foreignObject>
    )
  }, [centerContent, width, height, innerRadius])

  // Default tooltip
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(d) : d[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(d) : d[valueAccessor]
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor])

  // Validate data (after all hooks)
  if (safeData.length === 0) {
    console.warn("DonutChart: data prop is required and should not be empty")
    return null
  }

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: typeConfig,
    projection: "radial",
    style: pieceStyle,
    hoverAnnotation: enableHover,
    margin,
    oPadding: slicePadding,
    ...(legend && { legend }),
    ...(foregroundGraphics && { foregroundGraphics }),
    ...(className && { className }),
    ...(title && { title }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
