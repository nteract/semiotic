"use client"

/**
 * useResolvedSelection — merges the active theme's `colors.selectionOpacity`
 * into a chart's `selection` config so that `wrapStyleWithSelection` dims
 * unselected elements to the theme value by default.
 *
 * Resolution order (highest wins):
 *   1. `selection.unselectedOpacity` (explicit per-chart prop)
 *   2. `theme.colors.selectionOpacity` (from ThemeProvider)
 *   3. `DEFAULT_SELECTION_OPACITY` (library fallback, applied inside
 *      `wrapStyleWithSelection` when both above are undefined)
 *
 * Every HOC that calls `wrapStyleWithSelection` should pass the return value
 * of this hook instead of the raw `selection` prop.
 */

import { useMemo } from "react"
import { useThemeSelector } from "../../store/ThemeStore"
import type { SemioticTheme } from "../../store/ThemeStore"
import type { SelectionConfig } from "./types"

export function useResolvedSelection(
  selection: SelectionConfig | undefined,
): SelectionConfig | undefined {
  const themeSelectionOpacity = useThemeSelector(
    (state: { theme: SemioticTheme }) => state.theme.colors.selectionOpacity,
  )
  return useMemo<SelectionConfig | undefined>(() => {
    if (selection === undefined && themeSelectionOpacity === undefined) return undefined
    return {
      // `name` is required on SelectionConfig; preserve or supply empty string
      // (this config is only ever consumed by wrapStyleWithSelection, which
      // ignores `name`).
      name: selection?.name ?? "",
      ...selection,
      unselectedOpacity: selection?.unselectedOpacity ?? themeSelectionOpacity,
    }
  }, [selection, themeSelectionOpacity])
}
