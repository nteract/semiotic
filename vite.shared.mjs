import { resolve } from "node:path"

export function semioticSourceAliases(repoRoot) {
  return [
    { find: /^semiotic\/ai$/, replacement: resolve(repoRoot, "src/components/semiotic-ai.ts") },
    { find: /^semiotic\/ai\/core$/, replacement: resolve(repoRoot, "src/components/semiotic-ai-core.ts") },
    { find: /^semiotic\/data$/, replacement: resolve(repoRoot, "src/components/semiotic-data.ts") },
    { find: /^semiotic\/experimental$/, replacement: resolve(repoRoot, "src/components/semiotic-experimental.ts") },
    { find: /^semiotic\/geo$/, replacement: resolve(repoRoot, "src/components/semiotic-geo.ts") },
    { find: /^semiotic\/network$/, replacement: resolve(repoRoot, "src/components/semiotic-network.ts") },
    { find: /^semiotic\/ordinal$/, replacement: resolve(repoRoot, "src/components/semiotic-ordinal.ts") },
    { find: /^semiotic\/physics$/, replacement: resolve(repoRoot, "src/components/semiotic-physics.ts") },
    { find: /^semiotic\/physics\/matter$/, replacement: resolve(repoRoot, "src/components/semiotic-physics-matter.ts") },
    { find: /^semiotic\/physics\/rapier$/, replacement: resolve(repoRoot, "src/components/semiotic-physics-rapier.ts") },
    { find: /^semiotic\/realtime$/, replacement: resolve(repoRoot, "src/components/semiotic-realtime.ts") },
    { find: /^semiotic\/recipes$/, replacement: resolve(repoRoot, "src/components/semiotic-recipes.ts") },
    { find: /^semiotic\/server$/, replacement: resolve(repoRoot, "src/components/semiotic-server.ts") },
    { find: /^semiotic\/themes$/, replacement: resolve(repoRoot, "src/components/semiotic-themes.ts") },
    { find: /^semiotic\/utils$/, replacement: resolve(repoRoot, "src/components/semiotic-utils.ts") },
    { find: /^semiotic\/value$/, replacement: resolve(repoRoot, "src/components/semiotic-value.ts") },
    { find: /^semiotic\/xy$/, replacement: resolve(repoRoot, "src/components/semiotic-xy.ts") },
    { find: /^semiotic$/, replacement: resolve(repoRoot, "src/components/semiotic.ts") },
  ]
}

export function browserProcessDefines(mode) {
  const nodeEnv = mode === "production" ? "production" : "development"
  return {
    "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    "process.env.ANTHROPIC_API_KEY": JSON.stringify(process.env.ANTHROPIC_API_KEY ?? ""),
  }
}
