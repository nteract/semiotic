/**
 * True in a Node/SSR context where `window` / `document` are unavailable.
 * Kept as its own module so Stream Frames can detect SSR without importing
 * the XY scene-to-SVG serializer graph.
 */
export const isServerEnvironment: boolean =
  typeof window === "undefined" || typeof document === "undefined"
