type Prepared = object
type Line = { text: string; width: number }
export interface Pretext {
  prepare(text: string, font: string): Prepared
  prepareWithSegments(text: string, font: string): Prepared
  measureNaturalWidth(prepared: Prepared): number
  layout(
    prepared: Prepared,
    width: number,
    lineHeight: number
  ): {
    height: number
    lineCount: number
  }
  layoutWithLines(
    prepared: Prepared,
    width: number,
    lineHeight: number
  ): {
    lines: Line[]
    lineCount: number
  }
  clearCache(): void
}

export async function runEvaluation({
  corpus,
  fonts,
  widths
}: {
  corpus: string[]
  fonts: string[]
  widths: number[]
}) {
  const p = (window as unknown as { pretext: Pretext }).pretext
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  const div = document.createElement("div")
  Object.assign(div.style, {
    position: "absolute",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    wordBreak: "normal",
    padding: "0",
    border: "0"
  })
  document.body.append(div)
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  const svgText = document.createElementNS(
    svg.namespaceURI,
    "text"
  ) as SVGTextElement
  svg.append(svgText)
  document.body.append(svg)
  await document.fonts.ready

  // Mirrors Annotation.tsx (8px) and annotationLayout.ts (7px) today.
  // Deliberately copied here: the production helpers are private.
  function currentWrap(text: string, width: number, charWidth = 8): string[] {
    const maxChars = Math.max(1, Math.floor(width / charWidth))
    const lines: string[] = []
    let line = ""
    for (const word of text.split(/\s+/)) {
      if (line && line.length + 1 + word.length > maxChars) {
        lines.push(line)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    if (line) lines.push(line)
    return lines
  }
  const rows = []
  for (const font of fonts) {
    ctx.font = font
    svgText.style.font = font
    div.style.font = font
    div.style.lineHeight = "24px"
    for (const text of corpus) {
      const prepared = p.prepareWithSegments(text, font)
      const natural = p.measureNaturalWidth(prepared)
      svgText.textContent = text
      const svgWidth = svgText.getComputedTextLength()
      const canvasWidth = ctx.measureText(text).width
      for (const width of widths) {
        div.style.width = `${width}px`
        div.textContent = text
        const domLines = Math.round(div.getBoundingClientRect().height / 24)
        const lines = p.layoutWithLines(prepared, width, 24).lines
        const current = currentWrap(text, width)
        const placed = currentWrap(text, width, 7)
        function renderedWidth(line: string): number {
          svgText.textContent = line
          return svgText.getComputedTextLength()
        }
        rows.push({
          font,
          text,
          width,
          svgWidth,
          canvasWidth,
          axisEstimate: text.length * 6.5,
          pretextWidth: natural,
          domLines,
          currentLines: current.length,
          placementLines: placed.length,
          pretextLines: lines.length,
          currentMaxWidth: Math.max(...current.map(renderedWidth)),
          pretextMaxWidth: Math.max(
            ...lines.map((line) => renderedWidth(line.text))
          ),
          currentText: current,
          pretextText: lines.map((line) => line.text)
        })
      }
    }
  }

  // Per-operation microseconds, median of seven batches after warm-up.
  // One font, all 16 texts. Cached width baseline has the same warm corpus.
  const font = "12px Arial"
  ctx.font = font
  const prepared = corpus.map((text) => p.prepareWithSegments(text, font))
  const widthCache = new Map(
    corpus.map((text) => [text, ctx.measureText(text).width])
  )
  let checksum = 0
  const timings: Record<string, number> = {}
  function time(name: string, count: number, run: (index: number) => number) {
    for (let i = 0; i < 100; i++) checksum += run(i)
    const batches: number[] = []
    for (let batch = 0; batch < 7; batch++) {
      const start = performance.now()
      for (let i = 0; i < count; i++) checksum += run(i)
      batches.push(((performance.now() - start) * 1000) / count)
    }
    timings[name] = batches.sort((a, b) => a - b)[3]
  }
  time("characterWidth", 20000, (i) => corpus[i % corpus.length].length * 6.5)
  time(
    "canvasWidth",
    20000,
    (i) => ctx.measureText(corpus[i % corpus.length]).width
  )
  time("cachedCanvasWidth", 20000, (i) =>
    widthCache.get(corpus[i % corpus.length])!
  )
  time("pretextPreparedWidth", 20000, (i) =>
    p.measureNaturalWidth(prepared[i % corpus.length])
  )
  time(
    "currentWrap",
    20000,
    (i) =>
      currentWrap(corpus[i % corpus.length], widths[i % widths.length]).length
  )
  time(
    "pretextLayout",
    20000,
    (i) =>
      p.layout(prepared[i % corpus.length], widths[i % widths.length], 24)
        .height
  )
  time(
    "pretextLayoutWithLines",
    20000,
    (i) =>
      p.layoutWithLines(
        prepared[i % corpus.length],
        widths[i % widths.length],
        24
      ).lineCount
  )
  time("pretextPrepareWarmSegments", 2000, (i) =>
    p.measureNaturalWidth(
      p.prepareWithSegments(corpus[i % corpus.length], font)
    )
  )
  time("pretextPrepareClearedCaches", 300, (i) => {
    p.clearCache()
    return p.measureNaturalWidth(
      p.prepareWithSegments(corpus[i % corpus.length], font)
    )
  })
  div.style.font = font
  div.style.lineHeight = "24px"
  time("domWriteAndReadHeight", 1000, (i) => {
    div.textContent = corpus[i % corpus.length]
    div.style.width = `${widths[i % widths.length]}px`
    return div.getBoundingClientRect().height
  })

  // A late-loaded face deliberately changes the same font string's metrics.
  // No network or external font binary is needed for this local probe.
  let fontInvalidation: Record<string, unknown>
  try {
    p.clearCache()
    const lateFont = '12px "PretextLateFont", Arial'
    const sample = "iiiiiiiiiiii"
    const offscreen =
      typeof OffscreenCanvas === "undefined"
        ? null
        : new OffscreenCanvas(1, 1).getContext("2d")
    if (offscreen) {
      offscreen.font = lateFont
      offscreen.measureText(sample)
    }
    const before = p.prepareWithSegments(sample, lateFont)
    const beforeWidth = p.measureNaturalWidth(before)
    const face = new FontFace("PretextLateFont", 'local("Courier New")')
    await face.load()
    document.fonts.add(face)
    await document.fonts.ready
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    ctx.font = lateFont
    const actualAfterLoad = ctx.measureText(sample).width
    const withoutClear = p.measureNaturalWidth(
      p.prepareWithSegments(sample, lateFont)
    )
    const freshOffscreen =
      typeof OffscreenCanvas === "undefined"
        ? null
        : new OffscreenCanvas(1, 1).getContext("2d")
    if (freshOffscreen) freshOffscreen.font = lateFont
    p.clearCache()
    fontInvalidation = {
      beforeWidth,
      actualAfterLoad,
      existingOffscreenAfterLoad: offscreen?.measureText(sample).width,
      freshOffscreenAfterLoad: freshOffscreen?.measureText(sample).width,
      newlyPreparedWithoutClear: withoutClear,
      oldHandleAfterClear: p.measureNaturalWidth(before),
      newlyPreparedAfterClear: p.measureNaturalWidth(
        p.prepareWithSegments(sample, lateFont)
      )
    }
    // Distinguish stale shared metric entries from a retained canvas font state.
    p.prepareWithSegments(sample, "13px Arial")
    p.clearCache()
    fontInvalidation.afterSwitchingFontAndClearing = p.measureNaturalWidth(
      p.prepareWithSegments(sample, lateFont)
    )
  } catch (error) {
    fontInvalidation = { skipped: String(error) }
  }

  return {
    userAgent: navigator.userAgent,
    devicePixelRatio,
    summary: {
      comparisons: rows.length,
      currentLineCountMismatches: rows.filter(
        (row) => row.currentLines !== row.domLines
      ).length,
      pretextLineCountMismatches: rows.filter(
        (row) => row.pretextLines !== row.domLines
      ).length,
      currentSvgOverflows: rows.filter(
        (row) => row.currentMaxWidth > row.width + 0.75
      ).length,
      pretextSvgOverflows: rows.filter(
        (row) => row.pretextMaxWidth > row.width + 0.75
      ).length,
      rendererPlacementDisagreements: rows.filter(
        (row) => row.currentLines !== row.placementLines
      ).length
    },
    fontChecks: fonts.map((font) => ({
      font,
      loaded: document.fonts.check(font)
    })),
    rows,
    timingsMicroseconds: timings,
    checksum,
    fontInvalidation
  }
}
