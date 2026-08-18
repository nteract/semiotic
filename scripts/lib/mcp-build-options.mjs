/** Shared esbuild contract for the tracked MCP executable and its drift check. */
export function mcpBuildOptions({ outfile, production = false }) {
  return {
    entryPoints: ["ai/mcp-server.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile,
    external: [
      "react",
      "react-dom",
      "semiotic",
      "semiotic/ai",
      "semiotic/geo",
      "semiotic/server",
      // jsdom resolves an internal worker relative to its installed package.
      // Bundling it breaks that lookup and interactive-SVG sanitization.
      "jsdom"
    ],
    banner: { js: "#!/usr/bin/env node" },
    minify: production,
    sourcemap: false,
    logLevel: "info"
  }
}
