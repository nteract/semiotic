import { resolve } from "node:path"
import { defineConfig } from "vite"
import { semioticSourceAliases } from "./vite.shared.mjs"

const root = process.cwd()
const profiling = process.env.NETWORK_CAMERA_PROFILE === "1"

// Measurement-only wrappers: no instrumentation enters published bundles.
// Profiler actualDuration measures render work, not DOM commit duration.
function cameraInstrumentation() {
  const layers = ["NetworkHtmlMarksLayer", "NetworkSVGOverlay"]
  return {
    name: "network-camera-measurement",
    enforce: "pre",
    transform(code, id) {
      const layer = layers.find((name) => id.endsWith(`/stream/${name}.tsx`))
      if (layer && profiling) {
        const declaration =
          layer === "NetworkHtmlMarksLayer"
            ? `export function ${layer}(`
            : `export const ${layer} =`
        if (!code.includes(declaration))
          throw new Error(`Cannot instrument ${layer}`)
        return (
          code.replace(
            declaration,
            declaration
              .replace(`export `, "")
              .replace(layer, `Measured${layer}`)
          ) +
          `
export function ${layer}(props: ${layer}Props) {
  return React.createElement(React.Profiler, {
    id: "${layer}", onRender: (...args) => window.cameraScale?.recordRender(...args)
  }, React.createElement(Measured${layer}, props))
}
`
        )
      }
      if (id.endsWith("/stream/networkFramePaint.ts")) {
        const declaration = "export function paintNetworkFrame("
        if (!code.includes(declaration))
          throw new Error("Cannot instrument network paint")
        return (
          code.replace(declaration, "function measuredNetworkPaint(") +
          `
export function paintNetworkFrame(ctx: NetworkFramePaintContext): void {
  const start = performance.now()
  try { measuredNetworkPaint(ctx) }
  finally { window.cameraScale?.recordPaint(performance.now() - start, !!ctx.cameraOnly) }
}
`
        )
      }
    }
  }
}

export default defineConfig({
  root: resolve(root, "integration-tests"),
  publicDir: false,
  plugins: [cameraInstrumentation()],
  resolve: {
    alias: [
      ...(profiling
        ? [{ find: /^react-dom\/client$/, replacement: "react-dom/profiling" }]
        : []),
      ...semioticSourceAliases(root)
    ]
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    __CAMERA_PROFILE__: JSON.stringify(profiling)
  },
  build: {
    outDir: resolve(root, "node_modules/.cache/network-camera"),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // RSC directives have no meaning in this standalone browser fixture.
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes('"use client"')
        )
          return
        warn(warning)
      },
      input: resolve(
        root,
        "integration-tests/network-custom-layout-examples/camera-scale.html"
      )
    }
  },
  preview: { host: "127.0.0.1", port: 1243, strictPort: true }
})
