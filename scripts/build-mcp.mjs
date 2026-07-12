import { build } from "esbuild"

const production = process.argv.includes("--production")

await build({
  entryPoints: ["ai/mcp-server.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "ai/dist/mcp-server.js",
  external: [
    "react",
    "react-dom",
    "semiotic",
    "semiotic/ai",
    "semiotic/geo",
    "semiotic/server",
    // jsdom must stay external: it self-references internal files via
    // require.resolve("./xhr-sync-worker.js"), which breaks once bundled into a
    // single file (the worker path no longer resolves), so `new JSDOM(...)`
    // throws at runtime and interactive-SVG sanitization silently yields "".
    // Requires jsdom to be resolvable at runtime (see package.json deps).
    "jsdom",
  ],
  banner: {
    js: "#!/usr/bin/env node",
  },
  minify: production,
  sourcemap: false,
  logLevel: "info",
})

console.log(`✅ MCP server bundle created${production ? " (minified)" : ""}`)
