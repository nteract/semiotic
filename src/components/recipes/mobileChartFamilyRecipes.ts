import type { ResponsiveRule } from "../charts/shared/responsiveRules"
import type {
  MobileInteractionConfig,
  MobileSnapBehavior,
  MobileStandardControlsMode,
} from "../charts/shared/types"
import type { MobileVisualizationContract } from "../charts/shared/auditMobileVisualization"

export type MobileChartFamily =
  | "line"
  | "area"
  | "ordinal"
  | "scatter"
  | "network"
  | "geo"
  | "small-multiple"

export interface MobileChartFamilyRecipeOptions {
  breakpoint?: number
  targetSize?: number
  mode?: "mobile" | false
  density?: "comfortable" | "compact" | "dense"
  transformProfile?: "overview" | "compare" | "inspect"
  keepAxes?: boolean
  showLegend?: boolean
  directLabel?: boolean
  maxAnnotations?: number
  maxCalloutItems?: number
  chartHeight?: number
  mobileColumns?: number
  tabletColumns?: number
  snap?: MobileSnapBehavior
  standardControls?: MobileStandardControlsMode
  summary?: string
}

export interface MobileChartFamilyRecipe {
  family: MobileChartFamily
  props: Record<string, unknown>
  responsiveRules: ResponsiveRule<Record<string, unknown>>[]
  mobileInteraction: MobileInteractionConfig
  mobileSemantics: MobileVisualizationContract
}

function mobileInteraction(options: MobileChartFamilyRecipeOptions): MobileInteractionConfig {
  return {
    tapToSelect: true,
    tapToLockTooltip: true,
    clearSelection: "backgroundTap",
    targetSize: options.targetSize ?? 44,
    snap: options.snap ?? "nearestDatum",
    brushHandleSize: options.targetSize ?? 44,
    standardControls: options.standardControls ?? false,
  }
}

function semantics(
  family: MobileChartFamily,
  options: MobileChartFamilyRecipeOptions,
): MobileVisualizationContract {
  const targetSize = options.targetSize ?? 44
  const alternatives: string[] = []
  const standardControls = options.standardControls
  const coversControl = (control: "brush" | "zoom" | "legend") =>
    standardControls === true ||
    standardControls === "all" ||
    standardControls === control ||
    (Array.isArray(standardControls) && standardControls.includes(control))
  if (coversControl("brush")) {
    alternatives.push("range-inputs", "clear-brush")
  }
  if (coversControl("zoom")) {
    alternatives.push("zoom-buttons", "reset-view")
  }
  if (coversControl("legend")) {
    alternatives.push("legend-chips", "show-all-series")
  }
  return {
    strategy: `${family}-${options.transformProfile ?? "overview"}-mobile-recipe`,
    supportsResponsiveLayout: true,
    breakpoints: [320, 360, 390, 430, options.breakpoint ?? 480, 768],
    maxAnnotations: options.maxAnnotations ?? 2,
    minimumHitTarget: targetSize,
    summary: options.summary ?? true,
    interaction: {
      primary: "tap",
      hoverFallback: "tap-to-lock",
      targetSize,
      ...(alternatives.length > 0 && { alternatives }),
    },
    labels: {
      strategy: options.directLabel === false ? "compact" : "direct",
      minFontSize: 12,
    },
  }
}

function densityScale(options: MobileChartFamilyRecipeOptions): number {
  if (options.density === "dense") return 0.75
  if (options.density === "compact") return 0.9
  return 1
}

function mobileMargin(
  family: MobileChartFamily,
  options: MobileChartFamilyRecipeOptions,
): { top: number; right: number; bottom: number; left: number } {
  const keepAxes = options.keepAxes !== false
  const labelRoom = options.directLabel === false ? 12 : 28
  if (family === "ordinal") {
    return { top: 12, right: labelRoom, bottom: keepAxes ? 44 : 12, left: keepAxes ? 48 : 12 }
  }
  if (family === "geo" || family === "network") {
    return { top: 12, right: 12, bottom: 12, left: 12 }
  }
  return { top: 12, right: labelRoom, bottom: keepAxes ? 42 : 14, left: keepAxes ? 44 : 14 }
}

function buildRecipe(
  family: MobileChartFamily,
  options: MobileChartFamilyRecipeOptions,
  props: Record<string, unknown>,
  responsiveOnly: Record<string, unknown> = {},
): MobileChartFamilyRecipe {
  const baseProps = {
    ...props,
  }
  const responsiveProps = {
    mode: options.mode === false ? undefined : "mobile",
    ...baseProps,
    margin: mobileMargin(family, options),
    ...responsiveOnly,
  }
  const cleanBaseProps = Object.fromEntries(
    Object.entries(baseProps).filter(([, value]) => value !== undefined),
  )
  const cleanResponsiveProps = Object.fromEntries(
    Object.entries(responsiveProps).filter(([, value]) => value !== undefined),
  )
  const mobileSemantics = semantics(family, options)
  const touch = mobileInteraction(options)
  return {
    family,
    props: cleanBaseProps,
    responsiveRules: [
      {
        id: `${family}-mobile`,
        description: `Apply Semiotic's mobile ${family} recipe at phone width.`,
        when: { maxWidth: options.breakpoint ?? 480 },
        transform: {
          ...cleanResponsiveProps,
          mobileInteraction: touch,
          mobileSemantics,
        },
      },
    ],
    mobileInteraction: touch,
    mobileSemantics,
  }
}

export function mobileLineChartRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  const density = densityScale(options)
  return buildRecipe("line", options, {
    showLegend: options.showLegend ?? false,
    directLabel: options.directLabel ?? true,
    lineWidth: options.transformProfile === "inspect" ? 3 : Math.max(1.5, 2.5 * density),
    showPoints: options.transformProfile === "inspect",
    autoPlaceAnnotations: {
      mobile: {
        strategy: "callout-list",
        maxAnnotations: options.maxAnnotations ?? 2,
        maxCalloutItems: options.maxCalloutItems ?? 4,
        progressiveDisclosure: true,
        preferShortText: true,
      },
    },
  }, {
    showAxes: options.keepAxes ?? true,
    axisExtent: "exact",
  })
}

export function mobileAreaChartRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  const density = densityScale(options)
  return buildRecipe("area", options, {
    showLegend: options.showLegend ?? false,
    showPoints: false,
    areaOpacity: options.transformProfile === "compare" ? 0.55 : 0.42,
    lineWidth: Math.max(1.25, 2 * density),
    autoPlaceAnnotations: {
      mobile: {
        strategy: "callout-list",
        maxAnnotations: options.maxAnnotations ?? 2,
        maxCalloutItems: options.maxCalloutItems ?? 4,
        progressiveDisclosure: true,
        preferShortText: true,
      },
    },
  }, {
    showAxes: options.keepAxes ?? true,
    axisExtent: "exact",
  })
}

export function mobileOrdinalChartRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  return buildRecipe("ordinal", options, {
    showLegend: options.showLegend ?? false,
    showCategoryTicks: options.keepAxes ?? true,
    sort: options.transformProfile === "compare" ? "desc" : undefined,
  }, {
    showAxes: options.keepAxes ?? true,
    axisExtent: "exact",
  })
}

export function mobileScatterplotRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  const density = densityScale(options)
  return buildRecipe("scatter", options, {
    showLegend: options.showLegend ?? false,
    pointRadius: Math.max(4, Math.round(((options.targetSize ?? 44) / 8) * density)),
    hoverRadius: Math.ceil((options.targetSize ?? 44) / 2),
    pointOpacity: options.density === "dense" ? 0.42 : 0.68,
    autoPlaceAnnotations: {
      mobile: {
        strategy: "callout-list",
        maxAnnotations: options.maxAnnotations ?? 1,
        maxCalloutItems: options.maxCalloutItems ?? 4,
        progressiveDisclosure: true,
        preferShortText: true,
      },
    },
  }, {
    showAxes: options.keepAxes ?? true,
    axisExtent: "exact",
  })
}

export function mobileNetworkChartRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  const density = densityScale(options)
  return buildRecipe("network", options, {
    showLegend: options.showLegend ?? false,
    nodeSizeRange: [
      Math.max(4, Math.round(6 * density)),
      Math.max(12, Math.round(((options.targetSize ?? 44) / 2) * density)),
    ],
    showLabels: options.transformProfile === "inspect",
    edgeOpacity: options.density === "dense" ? 0.28 : 0.44,
  })
}

export function mobileGeoChartRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  return buildRecipe("geo", options, {
    showLegend: options.showLegend ?? false,
  })
}

export function mobileSmallMultipleRecipe(
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  return buildRecipe("small-multiple", options, {
    mobileColumns: options.mobileColumns ?? 1,
    tabletColumns: options.tabletColumns ?? 2,
    chartHeight: options.chartHeight ?? 180,
    sharedExtent: true,
  })
}

export function mobileChartFamilyRecipe(
  family: MobileChartFamily,
  options: MobileChartFamilyRecipeOptions = {},
): MobileChartFamilyRecipe {
  switch (family) {
    case "line":
      return mobileLineChartRecipe(options)
    case "area":
      return mobileAreaChartRecipe(options)
    case "ordinal":
      return mobileOrdinalChartRecipe(options)
    case "scatter":
      return mobileScatterplotRecipe(options)
    case "network":
      return mobileNetworkChartRecipe(options)
    case "geo":
      return mobileGeoChartRecipe(options)
    case "small-multiple":
      return mobileSmallMultipleRecipe(options)
  }
}

export interface MobileBrushAlternativeOptions {
  targetSize?: number
  controls?: Array<"range-inputs" | "chip-filter" | "clear" | "stepper">
  summary?: string
}

export function mobileBrushAlternatives(
  options: MobileBrushAlternativeOptions = {}
) {
  const targetSize = options.targetSize ?? 44
  const controls = options.controls ?? ["range-inputs", "chip-filter", "clear"]

  return {
    mobileInteraction: {
      enabled: true,
      targetSize,
      tapToSelect: true,
      tapToLockTooltip: true,
      standardControls: "brush" as const,
    },
    mobileSemantics: {
      interaction: {
        primary: "filter" as const,
        alternatives: controls,
        summary:
          options.summary ??
          "Expose brushable ranges through touch-sized controls in addition to drag gestures.",
      },
    },
    controls,
  }
}
