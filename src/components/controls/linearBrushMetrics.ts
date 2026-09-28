// A tiny module on its own so MinimapChart's static layout can size handle
// room without pulling the brush geometry into the chart's eager bundle.

/** Built-in handle thickness across its edge for a `handleSize`; the length is twice the size. */
export const linearBrushHandleThickness = (handleSize: number) => Math.max(6, Math.round((handleSize * 2) / 3))
