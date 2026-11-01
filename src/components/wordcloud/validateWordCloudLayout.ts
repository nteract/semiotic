import {
  normalizeWordCloudInput,
  wordCloudFingerprint
} from "./normalizeWordCloudInput"
import { WordCloudLayoutError } from "./types"
import { wordCloudBounds } from "./wordCloudBounds"
import type { WordCloudLayoutOptions, WordCloudLayoutResult } from "./types"

/** Reject stale or malformed serialized geometry before painting or exporting. */
export function validateWordCloudLayout(
  options: WordCloudLayoutOptions,
  layout: WordCloudLayoutResult
): void {
  const fail = (message: string): never => {
    throw new WordCloudLayoutError("STALE_LAYOUT", message)
  }
  if (
    !layout ||
    layout.version !== 1 ||
    layout.engineVersion !== "d3-cloud@2.0.0"
  )
    fail("Unsupported WordCloud layout version. Prepare a fresh layout.")
  const input = normalizeWordCloudInput({
    ...options,
    width: options.width ?? layout.width,
    height: options.height ?? layout.height
  })
  if (
    layout.inputFingerprint !== input.inputFingerprint ||
    layout.width !== input.width ||
    layout.height !== input.height ||
    layout.seed !== input.seed ||
    layout.inputCount !== input.inputCount ||
    layout.maskFingerprint !== input.maskFingerprint
  ) {
    fail(
      "WordCloud layout does not match its data, size, font, mask or options. Prepare a fresh layout."
    )
  }
  const fontFingerprint = layout.fontIdentity
    ? wordCloudFingerprint([input.fontFingerprint, layout.fontIdentity])
    : input.fontFingerprint
  if (layout.fontFingerprint !== fontFingerprint)
    fail("WordCloud layout font identity is inconsistent.")
  if (!Array.isArray(layout.words) || !Array.isArray(layout.omitted))
    fail("WordCloud layout must include words and omitted arrays.")
  const expected = new Map(input.words.map((word) => [word.sourceIndex, word]))
  const accounted = new Set<number>()
  for (const word of layout.words) {
    const term = expected.get(word.sourceIndex)
    if (
      !term ||
      accounted.has(word.sourceIndex) ||
      Object.keys(term).some(
        (key) =>
          word[key as keyof typeof word] !== term[key as keyof typeof term]
      )
    )
      fail("WordCloud placement does not match its normalized source term.")
    if (
      ![word.x, word.y, word.x0, word.y0, word.x1, word.y1].every(
        Number.isFinite
      ) ||
      word.x1 <= word.x0 ||
      word.y1 <= word.y0 ||
      word.x + word.x0 < -input.width / 2 ||
      word.x + word.x1 > input.width / 2 ||
      word.y + word.y0 < -input.height / 2 ||
      word.y + word.y1 > input.height / 2
    )
      fail("WordCloud contains invalid or out-of-bounds geometry.")
    accounted.add(word.sourceIndex)
  }
  const inputOmissions = new Map(
    input.omitted.map((omission) => [omission.sourceIndex, omission])
  )
  for (const omission of layout.omitted) {
    const normalized = inputOmissions.get(omission.sourceIndex)
    const term = expected.get(omission.sourceIndex)
    if (
      accounted.has(omission.sourceIndex) ||
      !(normalized
        ? normalized.id === omission.id && normalized.reason === omission.reason
        : term?.id === omission.id &&
          ["no-space", "rasterization"].includes(omission.reason))
    )
      fail("WordCloud contains an invalid or duplicated omission.")
    accounted.add(omission.sourceIndex)
  }
  if (accounted.size !== input.inputCount)
    fail("WordCloud layout must account for every source row.")
  const resolution = input.mask
    ? [Math.ceil(input.width / 2) * 2, Math.ceil(input.height / 2) * 2]
    : null
  if (JSON.stringify(layout.maskResolution) !== JSON.stringify(resolution))
    fail("WordCloud mask resolution does not match its viewport.")
  const bounds = wordCloudBounds(layout.words)
  if (JSON.stringify(layout.bounds) !== JSON.stringify(bounds))
    fail("WordCloud bounds must describe its placed words, excluding the mask.")
}
