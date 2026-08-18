import { resolve } from "node:path"
import { publicJavaScriptEntrypoints } from "./scripts/lib/public-entrypoints.mjs"

export function semioticSourceAliases(repoRoot) {
  return publicJavaScriptEntrypoints().map(({ specifier, sourcePath }) => ({
    find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    replacement: resolve(repoRoot, sourcePath)
  }))
}

export function browserProcessDefines(mode) {
  const nodeEnv = mode === "production" ? "production" : "development"
  return {
    "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    "process.env.ANTHROPIC_API_KEY": JSON.stringify(process.env.ANTHROPIC_API_KEY ?? "")
  }
}
