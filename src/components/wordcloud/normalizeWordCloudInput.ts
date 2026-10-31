import type { Datum } from "../charts/shared/datumTypes"
import { WordCloudLayoutError } from "./types"
import type {
  WordCloudAccessor,
  WordCloudLayoutOptions,
  WordCloudOmission,
  WordCloudPlacedWord
} from "./types"

export function wordCloudFingerprint(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return `wc1-${(hash >>> 0).toString(16)}`
}

export function wordCloudRandom(seed: number): () => number {
  let state = seed | 0
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function read<T>(row: Datum, accessor: WordCloudAccessor<T>): unknown {
  try {
    return typeof accessor === "function" ? accessor(row) : row[accessor]
  } catch {
    throw new WordCloudLayoutError(
      "INVALID_INPUT",
      "A WordCloud accessor could not read a source row."
    )
  }
}

/** Normalize independently of DOM/Canvas, preserving an outcome for every input row. */
export function normalizeWordCloudInput(options: WordCloudLayoutOptions) {
  const {
    data,
    width = 640,
    height = 400,
    seed = 42,
    textAccessor = "text",
    valueAccessor = "value",
    idAccessor,
    fontFamily = "sans-serif",
    fontWeight = "normal",
    fontStyle = "normal",
    fontSizeRange = [12, 64],
    fontSizeScale = "sqrt",
    rotate = "horizontal",
    padding = 1,
    maxWords = 250,
    strategy = "archimedean",
    mask,
    maskFit = "contain",
    maskThreshold = 128
  } = options
  const fail = (message: string): never => {
    throw new WordCloudLayoutError("INVALID_INPUT", message)
  }
  if (!Array.isArray(data))
    fail("WordCloud requires an array of aggregated terms.")
  if (
    ![width, height].every((v) => Number.isInteger(v) && v >= 1 && v <= 2040)
  ) {
    fail(
      "WordCloud layout dimensions must be integers from 1 to 2040 pixels (d3-cloud's 2048px scratch canvas reserves edge slack)."
    )
  }
  if (!Number.isSafeInteger(seed))
    fail("WordCloud seed must be a finite safe integer.")
  if (!Number.isInteger(maxWords) || maxWords < 0 || maxWords > 10000)
    fail("maxWords must be an integer between 0 and 10000.")
  if (!Number.isFinite(padding) || padding < 0 || padding > 64)
    fail("padding must be between 0 and 64 pixels.")
  if (
    !Array.isArray(fontSizeRange) ||
    fontSizeRange.length !== 2 ||
    !fontSizeRange.every((v) => Number.isFinite(v) && v >= 1 && v <= 1024) ||
    fontSizeRange[1] < fontSizeRange[0]
  )
    fail(
      "fontSizeRange must contain two increasing positive sizes, at most 1024 pixels."
    )
  if (
    typeof fontFamily !== "string" ||
    !fontFamily.trim() ||
    /[;{}<>]/.test(fontFamily)
  )
    fail("fontFamily must be a valid CSS font family.")
  if (!["normal", "italic", "oblique"].includes(fontStyle))
    fail("Unknown fontStyle.")
  if (
    !/^(normal|bold|bolder|lighter|[1-9]\d{0,2}|1000)$/.test(String(fontWeight))
  )
    fail("Invalid fontWeight.")
  if (!["sqrt", "linear", "log"].includes(fontSizeScale))
    fail("Unknown fontSizeScale.")
  if (!["archimedean", "rectangular"].includes(strategy))
    fail("Unknown placement strategy.")
  if (!["contain", "cover"].includes(maskFit)) fail("Unknown maskFit.")
  if (
    !Number.isInteger(maskThreshold) ||
    maskThreshold < 1 ||
    maskThreshold > 255
  )
    fail("maskThreshold must be an integer from 1 to 255.")
  const angles =
    rotate === "horizontal" ? [0] : rotate === "orthogonal" ? [0, 90] : rotate
  if (
    !Array.isArray(angles) ||
    !angles.length ||
    !angles.every((v) => Number.isFinite(v) && Math.abs(v) <= 360)
  )
    fail(
      "rotate must be horizontal, orthogonal, or a nonempty array of finite angles within ±360°."
    )
  const omitted: WordCloudOmission[] = []
  const terms: Array<{
    id: string
    text: string
    value: number
    sourceIndex: number
  }> = []
  const ids = new Set<string>()
  for (let sourceIndex = 0; sourceIndex < data.length; sourceIndex++) {
    const row = data[sourceIndex]
    const omit = (
      reason: WordCloudOmission["reason"],
      id = `row:${sourceIndex}`
    ) => omitted.push({ id, sourceIndex, reason })
    if (!row || typeof row !== "object") {
      omit("invalid-row")
      continue
    }
    const text = String(read(row, textAccessor) ?? "").trim()
    const id = String(idAccessor ? (read(row, idAccessor) ?? "") : text)
    if (!text || !id || /[\r\n]/.test(text)) {
      omit("missing-text", id)
      continue
    }
    const rawValue = read(row, valueAccessor)
    const value =
      typeof rawValue === "number" || typeof rawValue === "string"
        ? Number(rawValue)
        : NaN
    if (!Number.isFinite(value) || value <= 0) {
      omit("invalid-value", id)
      continue
    }
    if (ids.has(id)) {
      omit("duplicate-id", id)
      continue
    }
    ids.add(id)
    terms.push({ id, text, value, sourceIndex })
  }
  terms.sort(
    (a, b) => b.value - a.value || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
  const maximum = terms[0]?.value ?? 1
  const random = wordCloudRandom(seed)
  const words = terms.slice(0, maxWords).map((term) => {
    const fraction =
      fontSizeScale === "sqrt"
        ? Math.sqrt(term.value / maximum)
        : fontSizeScale === "log"
          ? Math.log1p(term.value) / Math.log1p(maximum)
          : term.value / maximum
    return {
      ...term,
      fontFamily,
      fontWeight,
      fontStyle,
      fontSize: Math.floor(
        fontSizeRange[0] + fraction * (fontSizeRange[1] - fontSizeRange[0])
      ),
      rotate: angles[Math.floor(random() * angles.length)]
    }
  })
  for (const term of terms.slice(maxWords))
    omitted.push({
      id: term.id,
      sourceIndex: term.sourceIndex,
      reason: "max-words"
    })
  const fontFingerprint = wordCloudFingerprint({
    fontFamily,
    fontWeight,
    fontStyle
  })
  const maskFingerprint = mask
    ? wordCloudFingerprint({ mask, maskFit, maskThreshold })
    : undefined
  const inputFingerprint = wordCloudFingerprint({
    width,
    height,
    seed,
    words,
    omitted,
    inputCount: data.length,
    fontSizeRange,
    fontSizeScale,
    angles,
    padding,
    strategy,
    maskFingerprint,
    engine: "d3-cloud@2.0.0"
  })
  return {
    width,
    height,
    seed,
    padding,
    strategy,
    mask,
    maskFit,
    maskThreshold,
    words,
    omitted,
    fontFingerprint,
    maskFingerprint,
    inputFingerprint,
    inputCount: data.length
  }
}

export type NormalizedWordCloudInput = ReturnType<
  typeof normalizeWordCloudInput
>
export type PreparedWordCloudTerm = Omit<
  WordCloudPlacedWord,
  "x" | "y" | "x0" | "y0" | "x1" | "y1"
>
