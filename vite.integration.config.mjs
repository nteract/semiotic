import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { browserProcessDefines } from "./vite.shared.mjs"

const repoRoot = dirname(fileURLToPath(import.meta.url))
const integrationRoot = resolve(repoRoot, "integration-tests")

function ssrParityFixtureEsmPlugin() {
  const fixturePath = resolve(integrationRoot, "ssr-parity-fixtures.js")
  return {
    name: "ssr-parity-fixture-esm",
    enforce: "pre",
    transform(code, id) {
      if (id !== fixturePath) return null
      return code
        .replace(
          `const {
  isotypeInk: GLYPH_INK,
  isotypePaper: GLYPH_PAPER,
  isotypeGhost: GLYPH_GHOST,
  isotypeServerGlyph: SERVER_GLYPH,
  isotypeNetworkGlyphs: NETWORK_GLYPHS,
} = require("../dist/semiotic-recipes.min.js")`,
          `import {
  isotypeInk as GLYPH_INK,
  isotypePaper as GLYPH_PAPER,
  isotypeGhost as GLYPH_GHOST,
  isotypeServerGlyph as SERVER_GLYPH,
  isotypeNetworkGlyphs as NETWORK_GLYPHS,
} from "../dist/semiotic-recipes.module.js"`,
        )
        .replace("module.exports = { makeSsrParityCases }", "export { makeSsrParityCases }")
    },
  }
}

export default defineConfig(({ mode }) => ({
  root: integrationRoot,
  publicDir: false,
  plugins: [
    ssrParityFixtureEsmPlugin(),
    react({
      include: /integration-tests\/.*\.[jt]sx$/,
      exclude: [/dist\//, /node_modules\//],
    }),
  ],
  define: browserProcessDefines(mode),
  server: {
    host: "127.0.0.1",
    port: 1234,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: resolve(repoRoot, ".vite/integration-tests"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(integrationRoot, "index.html"),
        accessibility: resolve(integrationRoot, "accessibility-examples/index.html"),
        backgroundGraphics: resolve(integrationRoot, "background-graphics-examples/index.html"),
        chartModes: resolve(integrationRoot, "chart-modes-examples/index.html"),
        coordinated: resolve(integrationRoot, "coordinated-examples/index.html"),
        customLayout: resolve(integrationRoot, "custom-layout-examples/index.html"),
        geo: resolve(integrationRoot, "geo-examples/index.html"),
        histogramThemeStroke: resolve(integrationRoot, "histogram-theme-stroke-examples/index.html"),
        hocLegend: resolve(integrationRoot, "hoc-legend-examples/index.html"),
        mobileVisualization: resolve(integrationRoot, "mobile-visualization-examples/index.html"),
        network: resolve(integrationRoot, "network-examples/index.html"),
        ordinal: resolve(integrationRoot, "ordinal-examples/index.html"),
        primitiveProps: resolve(integrationRoot, "primitive-props-examples/index.html"),
        primitiveThemeMatrix: resolve(integrationRoot, "primitive-theme-matrix-examples/index.html"),
        processSankey: resolve(integrationRoot, "process-sankey-examples/index.html"),
        physics: resolve(integrationRoot, "physics-examples/index.html"),
        realtime: resolve(integrationRoot, "realtime-examples/index.html"),
        ssrParity: resolve(integrationRoot, "ssr-parity-examples/index.html"),
        statusScaleTheme: resolve(integrationRoot, "status-scale-theme-examples/index.html"),
        streamingRegression: resolve(integrationRoot, "streaming-regression-examples/index.html"),
        themed: resolve(integrationRoot, "themed-examples/index.html"),
        xy: resolve(integrationRoot, "xy-examples/index.html"),
      },
    },
  },
}))
