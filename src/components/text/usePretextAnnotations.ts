import { useEffect, useMemo, useRef, useState } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { AnnotationNoteText } from "./annotationTextLayout"
import {
  createPretextNoteMeasurer,
  pretextFonts,
  resetPretextFonts,
  resolvePretextOptions,
  type PretextAnnotationOptions
} from "./pretextAnnotationLayout"

const NOTE_TYPES = new Set([
  "label",
  "callout",
  "callout-circle",
  "callout-rect",
  "bracket"
])
type Measurer = NonNullable<AnnotationNoteText["_noteLayout"]>

/**
 * Opt in to Pretext wrapping for label, callout, and bracket annotation notes.
 * Pass the returned array to a chart's `annotations`. Rendering and automatic
 * placement use the same measured lines. Other annotation types pass through.
 *
 * Measurement starts after mounting and font loading. SSR, hydration, disabled
 * measurement, and browsers without Intl.Segmenter retain the normal renderer.
 * This React hook is not a formatter or option for serialized chart configs.
 */
export function usePretextAnnotations<T extends Datum>(
  annotations: readonly T[],
  options: PretextAnnotationOptions = {}
): T[] {
  const enabled = options.enabled !== false
  const typography = resolvePretextOptions(options)
  const key = JSON.stringify(typography)
  const fontSample = annotations
    .filter((a) => NOTE_TYPES.has(a.type))
    .map((a) => `${a.title || ""} ${a.label || ""}`)
    .join(" ")
  const [state, setState] = useState<{ key: string; measure: Measurer }>()
  const currentKey = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      !enabled ||
      typeof document === "undefined" ||
      typeof Intl.Segmenter !== "function"
    ) {
      currentKey.current = undefined
      setState(undefined)
      return
    }
    let active = true
    let revision = 0
    const config: ReturnType<typeof resolvePretextOptions> = JSON.parse(key)
    const fonts = pretextFonts(config)
    const fontSet = document.fonts
    const refresh = async (force = false) => {
      const request = ++revision
      try {
        if (fontSet)
          await Promise.all(
            fonts.map((font) => fontSet.load(font, fontSample || "M"))
          )
        if (!active || request !== revision) return
        if (!force && currentKey.current === key) return
        resetPretextFonts()
        const measure = createPretextNoteMeasurer(config)
        currentKey.current = measure ? key : undefined
        setState(measure ? { key, measure } : undefined)
      } catch {
        // Missing font/canvas capabilities retain the established renderer.
        if (active && request === revision) {
          currentKey.current = undefined
          setState(undefined)
        }
      }
    }
    const onFontsLoaded = () => {
      void refresh(true)
    }
    fontSet?.addEventListener("loadingdone", onFontsLoaded)
    void refresh()
    return () => {
      active = false
      fontSet?.removeEventListener("loadingdone", onFontsLoaded)
    }
  }, [enabled, key, fontSample])

  return useMemo(
    () =>
      annotations.map((annotation) =>
        enabled && state?.key === key && NOTE_TYPES.has(annotation.type)
          ? { ...annotation, _noteLayout: state.measure }
          : annotation
      ),
    [annotations, enabled, key, state]
  )
}
