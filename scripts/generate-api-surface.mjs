#!/usr/bin/env node
/**
 * Generates a snapshot of every entry point's public API surface.
 *
 * For each entry, walks the `.d.ts` re-export tree via the TypeScript
 * compiler API and emits a sorted list of `<kind> <name>` lines into
 * `etc/api-surface/<entry>.api.md`. CI runs `check:api-surface` which
 * regenerates the files and fails the run if `git diff` shows any
 * unintended change — accidental removals, renames, and new public
 * exports all surface as a clean diff in the PR.
 *
 * To intentionally change the surface: run `npm run docs:api-surface` and
 * commit the resulting `etc/api-surface/*.api.md` files.
 */
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// Map of entry-point name → its built `.d.ts` file.
// `semiotic-experimental` is intentionally omitted: that sub-path is packaged
// for collaborator previews, but is not a stable API contract for CI snapshots.
const ENTRIES = {
  semiotic: "dist/semiotic.d.ts",
  "semiotic-xy": "dist/semiotic-xy.d.ts",
  "semiotic-ordinal": "dist/semiotic-ordinal.d.ts",
  "semiotic-network": "dist/semiotic-network.d.ts",
  "semiotic-realtime": "dist/semiotic-realtime.d.ts",
  "semiotic-server": "dist/semiotic-server.d.ts",
  "semiotic-ai": "dist/semiotic-ai.d.ts",
  "semiotic-data": "dist/semiotic-data.d.ts",
  "semiotic-geo": "dist/semiotic-geo.d.ts",
  "semiotic-themes": "dist/semiotic-themes.d.ts",
  "semiotic-utils": "dist/semiotic-utils.d.ts",
  "semiotic-recipes": "dist/semiotic-recipes.d.ts",
  "semiotic-value": "dist/semiotic-value.d.ts",
}

const outDir = join(repoRoot, "etc/api-surface")
mkdirSync(outDir, { recursive: true })

const missingDist = Object.entries(ENTRIES).filter(([, p]) => !existsSync(join(repoRoot, p)))
if (missingDist.length > 0) {
  console.error("✗ missing built .d.ts files — run `npm run dist` first:")
  for (const [name, p] of missingDist) console.error(`  - ${name}: ${p}`)
  process.exit(2)
}

// One program per entry — the .d.ts re-exports may overlap, but each entry's
// surface is what consumers see when they import from that path.
function describeSymbol(symbol, checker) {
  const name = symbol.getName()
  // Re-exports can chain (entry → barrel → leaf). Walk the alias chain
  // until we hit a real declaration so the kind reflects the underlying
  // type/value rather than a synthesized transient property.
  let resolved = symbol
  let hops = 0
  while ((resolved.getFlags() & ts.SymbolFlags.Alias) && hops < 32) {
    try {
      resolved = checker.getAliasedSymbol(resolved)
    } catch { break }
    hops++
  }
  // Some re-export chains land on a transient `Property` symbol (kind
  // bits 0x2000004) instead of the leaf declaration. Walk the
  // declarations array if available — it points at the original node.
  if (resolved.declarations?.length === 0 && resolved.exportSymbol) {
    resolved = resolved.exportSymbol
  }
  const flags = resolved.getFlags()
  // Prefer declaration syntax kinds when available — they're the most
  // accurate signal for what the export actually is.
  const decl = resolved.valueDeclaration || resolved.declarations?.[0]
  if (decl) {
    if (ts.isClassDeclaration(decl)) return ["class", name]
    if (ts.isInterfaceDeclaration(decl)) return ["interface", name]
    if (ts.isTypeAliasDeclaration(decl)) return ["type", name]
    if (ts.isEnumDeclaration(decl)) return ["enum", name]
    if (ts.isFunctionDeclaration(decl)) return ["function", name]
    if (ts.isModuleDeclaration(decl)) return ["namespace", name]
    if (ts.isVariableDeclaration(decl)) {
      try {
        const type = checker.getTypeOfSymbolAtLocation(resolved, decl)
        if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
          return ["function", name]
        }
      } catch { /* fall through */ }
      return ["const", name]
    }
  }
  // Flag-based fallback for symbols without resolved declarations.
  if (flags & ts.SymbolFlags.Class) return ["class", name]
  if (flags & ts.SymbolFlags.Interface) return ["interface", name]
  if (flags & ts.SymbolFlags.TypeAlias) return ["type", name]
  if (flags & ts.SymbolFlags.Enum) return ["enum", name]
  if (flags & ts.SymbolFlags.Function) return ["function", name]
  if (flags & ts.SymbolFlags.Variable) return ["const", name]
  if (flags & ts.SymbolFlags.Namespace) return ["namespace", name]
  return ["export", name]
}

// Pre-glob every .d.ts under dist so TypeScript sees the full re-export
// graph — otherwise `getAliasedSymbol().declarations` returns empty for
// re-exports whose source lives in another file.
function collectDtsFiles(rootDir) {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name)
      if (name.isDirectory()) walk(full)
      else if (name.isFile() && name.name.endsWith(".d.ts")) out.push(full)
    }
  }
  walk(rootDir)
  return out
}

const ALL_DTS = collectDtsFiles(join(repoRoot, "dist"))

function snapshotEntry(entryFile) {
  const program = ts.createProgram(ALL_DTS, {
    target: ts.ScriptTarget.ES2020,
    // Bundler resolution mirrors what real consumers use (Vite, Parcel,
    // webpack 5+) and is the only mode where entry-point `.d.ts` files
    // resolve their re-export targets through the dist tree's exports map.
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    skipLibCheck: true,
    declaration: true,
    noEmit: true,
  })
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(entryFile)
  if (!sourceFile) throw new Error(`could not load ${entryFile}`)

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) throw new Error(`no module symbol for ${entryFile}`)

  const exports = checker.getExportsOfModule(moduleSymbol)
  const lines = exports
    .map((s) => describeSymbol(s, checker))
    .map(([kind, name]) => `${kind} ${name}`)
    .sort()

  // De-dupe — a name can be exported as both a value and a type (e.g. classes).
  const uniq = Array.from(new Set(lines))
  return uniq
}

let exitCode = 0
const summary = []

for (const [name, relPath] of Object.entries(ENTRIES)) {
  const file = join(repoRoot, relPath)
  try {
    const lines = snapshotEntry(file)
    const md = [
      `# ${name} public API surface`,
      "",
      `_Auto-generated by \`scripts/generate-api-surface.mjs\` from \`${relPath}\`._`,
      `_Edit ${relPath}'s sources, then re-run \`npm run docs:api-surface\` to refresh._`,
      "",
      "```",
      ...lines,
      "```",
      "",
    ].join("\n")
    const outPath = join(outDir, `${name}.api.md`)
    writeFileSync(outPath, md)
    summary.push({ name, count: lines.length })
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`)
    exitCode = 1
  }
}

if (exitCode === 0) {
  console.log(`✅ wrote ${summary.length} surface snapshots → etc/api-surface/`)
  for (const { name, count } of summary) console.log(`  ${name}: ${count} exports`)
}
process.exit(exitCode)
