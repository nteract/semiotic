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
const args = process.argv.slice(2)

function argumentValue(name, fallback) {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a path`)
  }
  return value
}

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
  "semiotic-ai-core": "dist/semiotic-ai-core.d.ts",
  "semiotic-data": "dist/semiotic-data.d.ts",
  "semiotic-geo": "dist/semiotic-geo.d.ts",
  "semiotic-rough": "dist/semiotic-rough.d.ts",
  "semiotic-physics": "dist/semiotic-physics.d.ts",
  "semiotic-physics-matter": "dist/semiotic-physics-matter.d.ts",
  "semiotic-physics-rapier": "dist/semiotic-physics-rapier.d.ts",
  "semiotic-themes": "dist/semiotic-themes.d.ts",
  "semiotic-themes-core": "dist/semiotic-themes-core.d.ts",
  "semiotic-themes-react": "dist/semiotic-themes-react.d.ts",
  "semiotic-utils": "dist/semiotic-utils.d.ts",
  "semiotic-utils-core": "dist/semiotic-utils-core.d.ts",
  "semiotic-utils-react": "dist/semiotic-utils-react.d.ts",
  "semiotic-recipes": "dist/semiotic-recipes.d.ts",
  "semiotic-recipes-core": "dist/semiotic-recipes-core.d.ts",
  "semiotic-recipes-react": "dist/semiotic-recipes-react.d.ts",
  "semiotic-value": "dist/semiotic-value.d.ts",
  "semiotic-server-node": "dist/semiotic-server-node.d.ts",
  "semiotic-server-edge": "dist/semiotic-server-edge.d.ts",
  "semiotic-controls": "dist/semiotic-controls.d.ts",
}

// CI passes a temporary directory so surface verification never modifies
// tracked snapshots. The default remains the checked-in location for the
// explicit `docs:api-surface` regeneration command.
const outDir = resolve(repoRoot, argumentValue("--out-dir", "etc/api-surface"))
mkdirSync(outDir, { recursive: true })

const missingDist = Object.entries(ENTRIES).filter(([, p]) => !existsSync(join(repoRoot, p)))
if (missingDist.length > 0) {
  console.error("✗ missing built .d.ts files — run `npm run dist` first:")
  for (const [name, p] of missingDist) console.error(`  - ${name}: ${p}`)
  process.exit(2)
}

const TYPE_FORMAT_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.NoTypeReduction |
  ts.TypeFormatFlags.WriteTypeArgumentsOfSignature

function sourceFileForLocation(location) {
  return location && typeof location.getSourceFile === "function" ? location.getSourceFile() : location
}

function formatType(type, checker, location) {
  return checker.typeToString(type, sourceFileForLocation(location), TYPE_FORMAT_FLAGS)
}

function resolveExportSymbol(symbol, checker) {
  let resolved = symbol
  let hops = 0
  while ((resolved.getFlags() & ts.SymbolFlags.Alias) && hops < 32) {
    try {
      const aliased = checker.getAliasedSymbol(resolved)
      if (!aliased || aliased === resolved) break
      resolved = aliased
      hops++
    } catch {
      break
    }
  }
  if (resolved.declarations?.length === 0 && resolved.exportSymbol) {
    resolved = resolved.exportSymbol
  }
  return resolved
}

function formatTypeParameter(typeParameter, checker, location) {
  if (!typeParameter) return "T"
  const name = typeParameter.symbol?.name || "T"
  const constraint = typeParameter.getConstraint()
  const defaultType = typeParameter.getDefault()
  const constraintText = constraint ? ` extends ${formatType(constraint, checker, location)}` : ""
  const defaultText = defaultType ? ` = ${formatType(defaultType, checker, location)}` : ""
  return `${name}${constraintText}${defaultText}`
}

function formatTypeParametersFromTypes(typeParameters, checker, location) {
  if (!typeParameters?.length) return ""
  return `<${typeParameters.map((typeParameter) => formatTypeParameter(typeParameter, checker, location)).join(", ")}>`
}

function formatTypeParametersFromNodes(typeParameters, location) {
  if (!typeParameters?.length) return ""
  const sourceFile = sourceFileForLocation(location)
  return `<${typeParameters.map((typeParameter) => typeParameter.getText(sourceFile)).join(", ")}>`
}

function formatParameterSymbol(parameter, checker, location) {
  if (parameter.valueDeclaration && ts.isParameter(parameter.valueDeclaration)) {
    const declaration = parameter.valueDeclaration
    const type = checker.getTypeOfSymbolAtLocation(parameter, declaration)
    const name = declaration.name.getText(sourceFileForLocation(location))
    const isRest = Boolean(declaration.dotDotDotToken)
    const isOptional = Boolean(declaration.questionToken || declaration.initializer)
    const typeText = formatType(type, checker, declaration)
    return `${isRest ? "..." : ""}${name}${isOptional ? "?" : ""}: ${typeText}`
  }

  const type = checker.getTypeOfSymbolAtLocation(parameter, location)
  return `${parameter.getName()}: ${formatType(type, checker, location)}`
}

function formatFunctionLines(name, checker, location, symbol) {
  const symbolType = checker.getTypeOfSymbolAtLocation(symbol, location)
  const callSignatures = symbolType.getCallSignatures()
  if (callSignatures.length === 0) return []

  return callSignatures.map((signature) => {
    const typeParameters = formatTypeParametersFromTypes(signature.typeParameters, checker, location)
    const params = signature.parameters
      .map((parameter) => formatParameterSymbol(parameter, checker, location))
      .join(", ")
    const returnType = formatType(signature.getReturnType(), checker, location)
    return `function ${name}${typeParameters}(${params}): ${returnType}`
  })
}

function formatHeritage(node) {
  if (!node.heritageClauses?.length) return ""
  const chunks = node.heritageClauses.map((clause) => {
    const keyword = clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements"
    const values = clause.types.map((typeNode) => typeNode.getText(sourceFileForLocation(node))).join(", ")
    return `${keyword} ${values}`
  })
  return ` ${chunks.join(" ")}`
}

function describeSymbol(symbol, checker) {
  const name = symbol.getName()
  const resolved = resolveExportSymbol(symbol, checker)
  const declaration = resolved.valueDeclaration || resolved.declarations?.[0]
  const flags = resolved.getFlags()

  if (declaration) {
    const callLines = formatFunctionLines(name, checker, declaration, resolved)
    if (callLines.length > 0) return callLines

    if (ts.isClassDeclaration(declaration)) {
      return [`class ${name}${formatTypeParametersFromNodes(declaration.typeParameters, declaration)}${formatHeritage(declaration)}`]
    }
    if (ts.isInterfaceDeclaration(declaration)) {
      return [`interface ${name}${formatTypeParametersFromNodes(declaration.typeParameters, declaration)}`]
    }
    if (ts.isTypeAliasDeclaration(declaration)) {
      const rhs = declaration.type?.getText(declaration.getSourceFile()) ?? formatType(
        checker.getTypeOfSymbolAtLocation(resolved, declaration),
        checker,
        declaration,
      )
      return [`type ${name}${formatTypeParametersFromNodes(declaration.typeParameters, declaration)} = ${rhs}`]
    }
    if (ts.isEnumDeclaration(declaration)) return [`enum ${name}`]
    if (ts.isModuleDeclaration(declaration)) return [`namespace ${name}`]
    if (ts.isFunctionDeclaration(declaration)) {
      return formatFunctionLines(name, checker, declaration, resolved)
    }
    if (ts.isVariableDeclaration(declaration) || ts.isPropertyDeclaration(declaration)) {
      const symbolType = checker.getTypeOfSymbolAtLocation(resolved, declaration)
      const lines = formatFunctionLines(name, checker, declaration, resolved)
      if (lines.length > 0) return lines
      const typeText = formatType(symbolType, checker, declaration)
      return [`const ${name}: ${typeText}`]
    }
  }

  if (flags & ts.SymbolFlags.Class) return [`class ${name}`]
  if (flags & ts.SymbolFlags.Interface) return [`interface ${name}`]
  if (flags & ts.SymbolFlags.TypeAlias) return [`type ${name}`]
  if (flags & ts.SymbolFlags.Enum) return [`enum ${name}`]
  if (flags & ts.SymbolFlags.Function) return [`function ${name}`]
  if (flags & ts.SymbolFlags.Variable) return [`const ${name}`]
  if (flags & ts.SymbolFlags.Namespace) return [`namespace ${name}`]
  return [`export ${name}`]
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
    .flatMap((s) => describeSymbol(s, checker))
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
  console.log(`✅ wrote ${summary.length} surface snapshots → ${outDir}`)
  for (const { name, count } of summary) console.log(`  ${name}: ${count} exports`)
}
process.exit(exitCode)
