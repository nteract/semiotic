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
  ],
  banner: {
    js: "#!/usr/bin/env node",
  },
  minify: production,
  sourcemap: false,
  logLevel: "info",
})

console.log(`✅ MCP server bundle created${production ? " (minified)" : ""}`)
