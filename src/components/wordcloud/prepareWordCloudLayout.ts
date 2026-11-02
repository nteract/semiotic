import CloudLayout from "d3-cloud"
import {
  normalizeWordCloudInput,
  wordCloudFingerprint,
  wordCloudRandom
} from "./normalizeWordCloudInput"
import { createWordCloudCanvas, rasterizeWordCloudMask } from "./wordCloudMask"
import { WordCloudLayoutError } from "./types"
import { wordCloudBounds } from "./wordCloudBounds"
import type {
  WordCloudCanvasEnvironment,
  WordCloudLayoutOptions,
  WordCloudLayoutResult,
  WordCloudPlacedWord
} from "./types"

/**
 * Prepare portable word placements using d3-cloud 2.0. Browser fonts load before
 * rasterization. Node callers inject a compatible Canvas and load fonts first.
 * This operation is separate from synchronous SVG/server rendering. Placement
 * yields between bounded batches; an optional signal cancels obsolete work.
 */
export async function prepareWordCloudLayout(
  options: WordCloudLayoutOptions,
  environment: WordCloudCanvasEnvironment = {},
  signal?: AbortSignal
): Promise<WordCloudLayoutResult> {
  signal?.throwIfAborted()
  const input = normalizeWordCloudInput(options)
  if (typeof document !== "undefined" && document.fonts && input.words.length) {
    const word = input.words[0]
    const font = `${word.fontStyle} ${word.fontWeight} ${word.fontSize}px ${word.fontFamily}`
    try {
      await document.fonts.load(font, input.words.map((w) => w.text).join(" "))
      if (!document.fonts.check(font)) throw new Error("Font unavailable")
    } catch {
      signal?.throwIfAborted()
      throw new WordCloudLayoutError(
        "FONT_UNAVAILABLE",
        `WordCloud could not load ${word.fontFamily}. Load the intended font before preparing placements.`
      )
    }
  }
  signal?.throwIfAborted()
  const result: WordCloudLayoutResult = {
    version: 1,
    width: input.width,
    height: input.height,
    seed: input.seed,
    engineVersion: "d3-cloud@2.0.0",
    inputFingerprint: input.inputFingerprint,
    fontFingerprint: input.fontFingerprint,
    ...(environment.fontIdentity
      ? {
          fontFingerprint: wordCloudFingerprint([
            input.fontFingerprint,
            environment.fontIdentity
          ]),
          fontIdentity: environment.fontIdentity
        }
      : {}),
    ...(input.maskFingerprint
      ? { maskFingerprint: input.maskFingerprint }
      : {}),
    maskResolution: null,
    inputCount: input.inputCount,
    words: [],
    omitted: [...input.omitted],
    bounds: null
  }
  try {
    const cloud = new CloudLayout()
      .canvas(() => createWordCloudCanvas(environment))
      .size([input.width, input.height])
      .overflow(false)
      .strategy(input.strategy)
      .random(wordCloudRandom(input.seed))
    const mask = await rasterizeWordCloudMask(input, environment)
    signal?.throwIfAborted()
    if (mask) {
      result.maskResolution = [mask.canvas.width, mask.canvas.height]
      if (mask.forbiddenPixels) {
        const sprite = cloud.getSprite(mask.canvas, {
          width: mask.canvas.width,
          height: mask.canvas.height
        })
        // The mask may include a spare edge pixel on odd-sized viewports.
        // Only the obstacle may extend beyond the box; every word is contained.
        if (
          !sprite ||
          !cloud.overflow(true).place(sprite, { x: 0, y: 0, strategy: "none" })
        ) {
          throw new WordCloudLayoutError(
            "INVALID_MASK",
            "WordCloud could not place the silhouette obstacle."
          )
        }
        cloud.overflow(false)
      }
    }
    let batchStart = performance.now()
    for (const term of input.words) {
      // Yield to input/resize events even when many words cannot fit. The
      // seeded engine and insertion order stay unchanged across batches.
      if (performance.now() - batchStart >= 8) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        batchStart = performance.now()
      }
      signal?.throwIfAborted()
      const sprite = cloud.getSprite(term.text, {
        datum: term,
        font: term.fontFamily,
        style: term.fontStyle,
        weight: term.fontWeight,
        size: term.fontSize,
        rotate: term.rotate,
        padding: input.padding
      })
      const placed = sprite ? cloud.place(sprite) : null
      if (!placed) {
        result.omitted.push({
          id: term.id,
          sourceIndex: term.sourceIndex,
          reason: sprite ? "no-space" : "rasterization"
        })
        continue
      }
      const word: WordCloudPlacedWord = {
        ...term,
        x: placed.x,
        y: placed.y,
        x0: placed.x0,
        y0: placed.y0,
        x1: placed.x1,
        y1: placed.y1
      }
      result.words.push(word)
    }
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof WordCloudLayoutError) throw error
    throw new WordCloudLayoutError(
      "RASTERIZATION",
      `WordCloud rasterization failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  result.bounds = wordCloudBounds(result.words)
  // Freeze the JSON boundary as well as the outer object; callers clone to edit.
  for (const word of result.words) Object.freeze(word)
  for (const omission of result.omitted) Object.freeze(omission)
  Object.freeze(result.words)
  Object.freeze(result.omitted)
  if (result.bounds) {
    result.bounds.forEach(Object.freeze)
    Object.freeze(result.bounds)
  }
  if (result.maskResolution) Object.freeze(result.maskResolution)
  return Object.freeze(result)
}
