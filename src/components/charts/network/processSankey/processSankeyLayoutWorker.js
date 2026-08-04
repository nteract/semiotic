/**
 * Long-lived ProcessSankey layout worker. Clients send
 * `{ requestId, request }` and receive `{ requestId, layout, layoutConfig, … }`
 * so one Worker instance can serve concurrent layouts without spawn thrash.
 *
 * Only pure layout + path strings run here — no DOM, no React, no canvas.
 */
import { buildProcessSankeyScenes } from "./buildScenes"

function serializeLayout(layout) {
  if (!layout) return null
  return {
    ...layout,
    // Map is structured-cloneable, but encode as entries for older runtimes
    // and stable JSON fixtures in tests.
    sides: layout.sides instanceof Map ? [...layout.sides.entries()] : layout.sides,
  }
}

function stripRawDatums(layoutConfig) {
  return {
    bands: (layoutConfig.bands ?? []).map(({ rawDatum: _raw, ...rest }) => rest),
    ribbons: (layoutConfig.ribbons ?? []).map(({ rawDatum: _raw, ...rest }) => rest),
    showLabels: layoutConfig.showLabels,
  }
}

self.onmessage = (event) => {
  const message = event.data
  const requestId = message?.requestId
  const request = message?.request ?? message

  try {
    const colorById = request.colorById ?? {}
    const fallbackPalette = request.fallbackPalette ?? ["#475569"]
    const colorOf = (id, idx) =>
      colorById[id] ?? fallbackPalette[idx % fallbackPalette.length] ?? "#475569"

    const result = buildProcessSankeyScenes({
      ...request.input,
      colorOf,
    })

    self.postMessage({
      requestId,
      layout: serializeLayout(result.layout),
      layoutConfig: stripRawDatums(result.layoutConfig),
      issues: result.issues,
      warnings: result.warnings,
      domain: request.input.domain,
      timelineExtent:
        request.input.orientation === "vertical"
          ? request.input.plotH
          : request.input.plotW,
    })
  } catch (error) {
    self.postMessage({
      requestId,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    })
  }
}
