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
    key = normalizeWordCloudInput(options).inputFingerprint
    if (props.layout) validateWordCloudLayout(options, props.layout)
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
    let cancelled = false
    const currentOptions = { ...callbacks.current, width, height }
    import("./prepareWordCloudLayout")
      .then(({ prepareWordCloudLayout }) =>
        prepareWordCloudLayout(currentOptions, currentOptions.canvasEnvironment)
      )
      .then(
        (layout) => {
          if (cancelled) return
          setPrepared({ key, layout })
          callbacks.current.onLayout?.(layout)
        },
        (error) => {
          if (cancelled) return
          const diagnostic =
            error instanceof WordCloudLayoutError
              ? error
              : new WordCloudLayoutError("RASTERIZATION", String(error))
          setPrepared({ key, error: diagnostic })
          callbacks.current.onLayoutError?.(diagnostic)
        }
      )
    return () => {
      cancelled = true
    }
  }, [key, failure, props.layout, props.canvasEnvironment, width, height])
  const current = prepared?.key === key ? prepared : null
  return {
    layout: validationError ? undefined : (props.layout ?? current?.layout),
    error: validationError ?? current?.error,
    pending: !validationError && !props.layout && !current
  }
}
