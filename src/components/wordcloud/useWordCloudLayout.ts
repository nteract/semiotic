"use client"
import { useEffect, useRef, useState } from "react"
import { normalizeWordCloudInput } from "./normalizeWordCloudInput"
import { validateWordCloudLayout } from "./validateWordCloudLayout"
import { WordCloudLayoutError } from "./types"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"

/** Schedule raster work after commit; stale asynchronous preparations cannot win. */
export function useWordCloudLayout(
  props: WordCloudProps,
  width: number,
  height: number
) {
  const options = { ...props, width, height }
  let key = ""
  let validationError: WordCloudLayoutError | null = null
  try {
    if (props.layout) {
      try {
        // Validate every render, including in-place data or geometry edits.
        validateWordCloudLayout(options, props.layout)
      } catch (error) {
        // Unsupported layouts are rejected before normalization. Preserve input
        // error precedence and refresh the diagnostic key for changed inputs.
        if (
          error instanceof WordCloudLayoutError &&
          error.code === "STALE_LAYOUT"
        )
          key = normalizeWordCloudInput(options).inputFingerprint
        throw error
      }
      key = props.layout.inputFingerprint
    } else {
      key = normalizeWordCloudInput(options).inputFingerprint
    }
  } catch (error) {
    validationError =
      error instanceof WordCloudLayoutError
        ? error
        : new WordCloudLayoutError("INVALID_INPUT", String(error))
  }
  const callbacks = useRef(props)
  callbacks.current = props
  const [prepared, setPrepared] = useState<{
    key: string
    layout?: WordCloudProps["layout"]
    error?: WordCloudLayoutError
  } | null>(null)
  const diagnosticRef = useRef(validationError)
  diagnosticRef.current = validationError
  const failure = validationError?.message
  useEffect(() => {
    if (failure) {
      callbacks.current.onLayoutError?.(diagnosticRef.current!)
      return
    }
    if (props.layout) return
    const controller = new AbortController()
    const currentOptions = { ...callbacks.current, width, height }
    import("./prepareWordCloudLayout")
      .then(({ prepareWordCloudLayout }) =>
        prepareWordCloudLayout(
          currentOptions,
          currentOptions.canvasEnvironment,
          controller.signal
        )
      )
      .then(
        (layout) => {
          if (controller.signal.aborted) return
          setPrepared({ key, layout })
          callbacks.current.onLayout?.(layout)
        },
        (error) => {
          if (controller.signal.aborted) return
          const diagnostic =
            error instanceof WordCloudLayoutError
              ? error
              : new WordCloudLayoutError("RASTERIZATION", String(error))
          setPrepared({ key, error: diagnostic })
          callbacks.current.onLayoutError?.(diagnostic)
        }
      )
    return () => controller.abort()
  }, [key, failure, props.layout, props.canvasEnvironment, width, height])
  const current = prepared?.key === key ? prepared : null
  return {
    layout: validationError ? undefined : (props.layout ?? current?.layout),
    error: validationError ?? (props.layout ? undefined : current?.error),
    pending: !validationError && !props.layout && !current
  }
}
