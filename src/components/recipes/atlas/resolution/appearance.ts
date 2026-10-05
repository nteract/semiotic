import type { NetworkLayoutContext } from "../../../stream/networkCustomLayout"
import type { NetworkLabel } from "../../../stream/networkTypes"
import type { CustomLayoutSelection } from "../../../stream/customLayoutSelection"
import type { Style } from "../../../stream/types"
import type { Datum } from "../../../charts/shared/datumTypes"
import { getSequentialInterpolator } from "../../../charts/shared/colorPalettes"
import {
  LIGHT_THEME,
  resolveThemeSemanticColors
} from "../../../store/themeCore"

export type ResolutionMarkRole =
  | "component"
  | "edge"
  | "endpoint"
  | "membership"
  | "bracket"
  | "rail"
  | "historyInternal"
  | "historyBoundary"
  | "cycleInternal"
  | "cycleBoundary"
  | "supportYes"
  | "supportNo"
  | "supportUnknown"
  | "cutawayNode"
  | "cutawayEntry"
  | "cutawayExit"
  | "cutawayWitness"

export interface ResolutionStyleContext {
  datum: Datum
  role: ResolutionMarkRole
  generation?: number
  highlighted: boolean
  selected: boolean
  theme: NetworkLayoutContext["theme"]
}

/** Shared by the readers, Cutaway, glyphs, and their static layouts. */
export interface ResolutionAppearance {
  /** Edge ownership colors; default to theme secondary (internal) and primary (boundary). */
  edgeColors?: { internal?: string; boundary?: string }
  /** Sequential scheme name, colors indexed by absolute generation, or a color callback. */
  generationColors?:
    string | readonly string[] | ((generation: number) => string)
  /** Per-role overrides applied after defaults, including during hover and selection. */
  styles?: Partial<
    Record<
      ResolutionMarkRole,
      Partial<Style> | ((context: ResolutionStyleContext) => Partial<Style>)
    >
  >
  labelStyle?: Partial<
    Pick<
      NetworkLabel,
      | "fill"
      | "fontSize"
      | "fontWeight"
      | "stroke"
      | "strokeWidth"
      | "paintOrder"
    >
  >
  dimmedOpacity?: number
}

/** Internal extension of the frame's existing restyle channel; no geometry update. */
export interface ResolutionLayoutSelection extends CustomLayoutSelection {
  resolutionHover?: (datum: Datum) => boolean
}

export function resolutionAppearance(
  theme: NetworkLayoutContext["theme"],
  appearance: ResolutionAppearance = {},
  generationCount = 1
) {
  const colors = {
    ...resolveThemeSemanticColors(LIGHT_THEME)!,
    ...theme.semantic
  }
  const interpolate = getSequentialInterpolator(
    typeof appearance.generationColors === "string"
      ? appearance.generationColors
      : theme.sequential
  )
  const generationColor = (generation: number): string => {
    const palette = appearance.generationColors
    if (typeof palette === "function") return palette(generation)
    if (Array.isArray(palette) && palette.length)
      return palette[Math.min(generation, palette.length - 1)]
    // Use the complete analysis domain, never the subset of visible pages.
    return interpolate(generation / Math.max(1, generationCount - 1))
  }
  const style = (
    context: Omit<ResolutionStyleContext, "theme">,
    base: Style
  ): Style => {
    const override = appearance.styles?.[context.role]
    return {
      ...base,
      ...(typeof override === "function"
        ? override({ ...context, theme })
        : override)
    }
  }
  return {
    colors,
    edgeColors: {
      internal: appearance.edgeColors?.internal ?? colors.secondary!,
      boundary: appearance.edgeColors?.boundary ?? colors.primary!
    },
    generationColor,
    style,
    labelStyle: appearance.labelStyle,
    dimmedOpacity:
      appearance.dimmedOpacity ??
      theme.selectionOpacity ??
      LIGHT_THEME.colors.selectionOpacity!
  }
}

/** Match only the hovered component's original members, without expanding through later unions. */
export function resolutionHoverPredicate(
  datum: Datum | null
): ((candidate: Datum) => boolean) | undefined {
  if (datum?.resolutionRole !== "component" || !Array.isArray(datum.nodeIds))
    return undefined
  const members = new Set(datum.nodeIds)
  return (candidate) =>
    candidate.analysisRevision === datum.analysisRevision &&
    candidate.resolutionRole === "component" &&
    Array.isArray(candidate.nodeIds) &&
    candidate.nodeIds.some((id) => members.has(id))
}
