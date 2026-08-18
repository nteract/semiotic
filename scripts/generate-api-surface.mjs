#!/usr/bin/env node
/**
 * Generates a snapshot of every entry point's public API surface.
 *
 * For each entry, walks the `.d.ts` re-export tree via the TypeScript
 * compiler API and emits a sorted list of stable declaration lines into
 * `etc/api-surface/<entry>.api.md`. Interfaces, classes, and enums include a
 * keyed line for every public member so a prop removal or narrowing cannot be
 * hidden behind an unchanged `interface Foo` heading. CI runs
 * `check:api-surface` which
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
import { stableApiEntrypoints } from "./lib/public-entrypoints.mjs"

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

// `package.json#exports` is the publishing authority. Derive every stable
// declaration snapshot from the same inventory that Vite aliases and build
// parity use; the experimental preview subpaths remain intentionally outside
// the compatibility contract.
const ENTRIES = Object.fromEntries(
  stableApiEntrypoints().map((entry) => [entry.apiSnapshotName, entry.declarationPath])
)

// CI passes a temporary directory so surface verification never modifies
// tracked snapshots. The default remains the checked-in location for the
// explicit `docs:api-surface` regeneration command.
const outDir = resolve(repoRoot, argumentValue("--out-dir", "etc/api-surface"))
const distDir = resolve(repoRoot, argumentValue("--dist-dir", "dist"))
const onlyEntry = argumentValue("--only", null)
if (onlyEntry && !Object.hasOwn(ENTRIES, onlyEntry)) {
  throw new Error(`Unknown --only entry ${onlyEntry}`)
}
const selectedEntries = onlyEntry
  ? { [onlyEntry]: ENTRIES[onlyEntry] }
  : ENTRIES
mkdirSync(outDir, { recursive: true })

const entryPath = (relativePath) => join(distDir, relativePath.replace(/^dist\//, ""))
const missingDist = Object.entries(selectedEntries).filter(([, path]) => !existsSync(entryPath(path)))
if (missingDist.length > 0) {
  console.error("✗ missing built .d.ts files — run `npm run dist` first:")
  for (const [name, path] of missingDist) console.error(`  - ${name}: ${entryPath(path)}`)
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
  return normalizeTypeText(
    checker.typeToString(type, sourceFileForLocation(location), TYPE_FORMAT_FLAGS),
  )
}

function normalizeDeclarationText(value) {
  return String(value).replace(/\s+/g, " ").trim()
}

function canonicalImportSpecifier(specifier) {
  const normalized = specifier.replaceAll("\\", "/")
  const distMarker = normalized.lastIndexOf("/dist/")
  if (distMarker !== -1) {
    return `semiotic-internal/${normalized.slice(distMarker + "/dist/".length)}`
  }
  const nodeModulesMarker = normalized.lastIndexOf("/node_modules/")
  if (nodeModulesMarker !== -1) {
    const packagePath = normalized.slice(nodeModulesMarker + "/node_modules/".length)
    const parts = packagePath.split("/")
    if (parts[0] === "@types") {
      const typePackage = parts[1] || "unknown"
      if (typePackage.includes("__")) {
        const [scope, name] = typePackage.split("__", 2)
        return `@${scope}/${name}`
      }
      return typePackage
    }
    return parts[0]?.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
  }
  return normalized
}

function matchingDelimiter(text, start) {
  const pairs = { "(": ")", "[": "]", "{": "}", "<": ">" }
  const expected = [pairs[text[start]]]
  let quote = null
  let escaped = false
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      continue
    }
    if (pairs[char]) expected.push(pairs[char])
    else if (char === expected.at(-1)) {
      expected.pop()
      if (expected.length === 0) return index
    }
  }
  return -1
}

function splitTopLevel(text, separator) {
  const chunks = []
  const stack = []
  const pairs = { "(": ")", "[": "]", "{": "}", "<": ">" }
  let quote = null
  let escaped = false
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      continue
    }
    if (pairs[char]) stack.push(pairs[char])
    else if (char === stack.at(-1)) stack.pop()
    else if (stack.length === 0 && char === separator) {
      chunks.push(text.slice(start, index).trim())
      start = index + 1
    }
  }
  chunks.push(text.slice(start).trim())
  return chunks
}

function firstTopLevelColon(text) {
  const stack = []
  const pairs = { "(": ")", "[": "]", "{": "}", "<": ">" }
  let quote = null
  let escaped = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      continue
    }
    if (pairs[char]) stack.push(pairs[char])
    else if (char === stack.at(-1)) stack.pop()
    else if (stack.length === 0 && char === ":") return index
  }
  return -1
}

function canonicalizeObjectMember(member) {
  const colon = firstTopLevelColon(member)
  if (colon === -1) return normalizeDeclarationText(member)
  const prefix = normalizeDeclarationText(member.slice(0, colon))
  const type = canonicalizeTypeStructure(member.slice(colon + 1))
  return `${prefix}: ${type}`
}

function canonicalizeTypeStructure(text) {
  let nested = ""
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (!["(", "[", "{", "<"].includes(char)) {
      nested += char
      continue
    }
    const end = matchingDelimiter(text, index)
    if (end === -1) {
      nested += char
      continue
    }
    const inner = text.slice(index + 1, end)
    if (char === "{") {
      const members = splitTopLevel(inner, ";").filter(Boolean)
      const trailingSemicolon = inner.trimEnd().endsWith(";") ? ";" : ""
      nested += `{${members.map(canonicalizeObjectMember).join("; ")}${trailingSemicolon}}`
    } else {
      nested += `${char}${canonicalizeTypeStructure(inner)}${text[end]}`
    }
    index = end
  }

  const comma = splitTopLevel(nested, ",")
  if (comma.length > 1) {
    return comma.map(canonicalizeTypeStructure).join(", ")
  }
  const union = splitTopLevel(nested, "|")
  if (union.length > 1) {
    return union.map(canonicalizeTypeStructure).sort().join(" | ")
  }
  const intersection = splitTopLevel(nested, "&")
  if (intersection.length > 1) {
    return intersection.map(canonicalizeTypeStructure).sort().join(" & ")
  }
  return normalizeDeclarationText(nested)
}

function normalizeTypeText(value) {
  const normalizedImports = normalizeDeclarationText(value).replace(
    /import\("([^"]+)"\)/g,
    (_match, specifier) => `import("${canonicalImportSpecifier(specifier)}")`,
  )
  return canonicalizeTypeStructure(normalizedImports)
}

function identityPart(value) {
  return encodeURIComponent(String(value)).replace(/\./g, "%2E")
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind))
}

function visibilityPrefix(node) {
  const modifiers = []
  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) modifiers.push("protected")
  if (hasModifier(node, ts.SyntaxKind.StaticKeyword)) modifiers.push("static")
  return modifiers.length > 0 ? `${modifiers.join(" ")} ` : ""
}

function memberName(node) {
  if (!node.name) return null
  return normalizeDeclarationText(node.name.getText(node.getSourceFile()))
}

function memberLine(ownerKind, ownerName, memberKind, name, declaration) {
  const key = `${ownerName}::${memberKind}::${identityPart(name)}`
  return `${ownerKind}-member ${key} = ${normalizeDeclarationText(declaration)}`
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
  return `<${typeParameters.map((typeParameter) => normalizeTypeText(typeParameter.getText(sourceFile))).join(", ")}>`
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

function formatSignature(signature, checker, location, name = "") {
  const typeParameters = formatTypeParametersFromTypes(signature.typeParameters, checker, location)
  const params = signature.parameters
    .map((parameter) => formatParameterSymbol(parameter, checker, location))
    .join(", ")
  const returnType = formatType(signature.getReturnType(), checker, location)
  return `${name}${typeParameters}(${params}): ${returnType}`
}

function formatHeritage(node) {
  if (!node.heritageClauses?.length) return ""
  const chunks = node.heritageClauses.map((clause) => {
    const keyword = clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements"
    const values = clause.types
      .map((typeNode) => normalizeTypeText(typeNode.getText(sourceFileForLocation(node))))
      .join(", ")
    return `${keyword} ${values}`
  })
  return ` ${chunks.join(" ")}`
}

function formatObjectMember(ownerKind, ownerName, node, checker) {
  // Private implementation details are intentionally absent from the public
  // contract. Protected members remain because subclasses can consume them.
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return []

  const location = node
  const optional = node.questionToken ? "optional " : "required "
  const readonly = hasModifier(node, ts.SyntaxKind.ReadonlyKeyword) ? "readonly " : ""
  const visibility = visibilityPrefix(node)

  if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
    const name = memberName(node)
    if (!name) return []
    const type = checker.getTypeAtLocation(node)
    return [
      memberLine(
        ownerKind,
        ownerName,
        "property",
        name,
        `${optional}${visibility}${readonly}${name}: ${formatType(type, checker, location)}`,
      ),
    ]
  }

  if (ts.isMethodSignature(node) || ts.isMethodDeclaration(node)) {
    const name = memberName(node)
    const signature = checker.getSignatureFromDeclaration(node)
    if (!name || !signature) return []
    return [
      memberLine(
        ownerKind,
        ownerName,
        "method",
        name,
        `${optional}${visibility}${formatSignature(signature, checker, location, name)}`,
      ),
    ]
  }

  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    const name = memberName(node)
    if (!name) return []
    const type = checker.getTypeAtLocation(node)
    const accessor = ts.isGetAccessorDeclaration(node) ? "get" : "set"
    return [
      memberLine(
        ownerKind,
        ownerName,
        accessor,
        name,
        `${visibility}${accessor} ${name}: ${formatType(type, checker, location)}`,
      ),
    ]
  }

  if (ts.isCallSignatureDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node)
    return signature
      ? [memberLine(ownerKind, ownerName, "call", "$call", `required ${formatSignature(signature, checker, location)}`)]
      : []
  }

  if (ts.isConstructSignatureDeclaration(node) || ts.isConstructorDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node)
    return signature
      ? [memberLine(ownerKind, ownerName, "construct", "$construct", `required new ${formatSignature(signature, checker, location)}`)]
      : []
  }

  if (ts.isIndexSignatureDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node)
    return signature
      ? [memberLine(ownerKind, ownerName, "index", "$index", `required ${formatSignature(signature, checker, location)}`)]
      : []
  }

  return []
}

function formatObjectDeclaration(ownerKind, name, declarations, checker) {
  const lines = []
  for (const declaration of declarations) {
    const typeParameters = formatTypeParametersFromNodes(declaration.typeParameters, declaration)
    lines.push(`${ownerKind} ${name}${typeParameters}${formatHeritage(declaration)}`)
    for (const member of declaration.members ?? []) {
      lines.push(...formatObjectMember(ownerKind, name, member, checker))
    }
  }
  return lines
}

function formatEnumDeclaration(name, declarations, checker) {
  const lines = [`enum ${name}`]
  for (const declaration of declarations) {
    for (const member of declaration.members) {
      const nameText = memberName(member)
      if (!nameText) continue
      const constant = checker.getConstantValue(member)
      const value = constant === undefined
        ? member.initializer
          ? normalizeDeclarationText(member.initializer.getText(member.getSourceFile()))
          : "<computed>"
        : JSON.stringify(constant)
      lines.push(`enum-member ${name}::${identityPart(nameText)} = ${nameText}: ${value}`)
    }
  }
  return lines
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
      const declarations = (resolved.declarations ?? [declaration]).filter(ts.isClassDeclaration)
      return formatObjectDeclaration("class", name, declarations, checker)
    }
    if (ts.isInterfaceDeclaration(declaration)) {
      const declarations = (resolved.declarations ?? [declaration]).filter(ts.isInterfaceDeclaration)
      return formatObjectDeclaration("interface", name, declarations, checker)
    }
    if (ts.isTypeAliasDeclaration(declaration)) {
      const rhs = normalizeTypeText(declaration.type?.getText(declaration.getSourceFile()) ?? formatType(
        checker.getTypeOfSymbolAtLocation(resolved, declaration),
        checker,
        declaration,
      ))
      return [`type ${name}${formatTypeParametersFromNodes(declaration.typeParameters, declaration)} = ${rhs}`]
    }
    if (ts.isEnumDeclaration(declaration)) {
      const declarations = (resolved.declarations ?? [declaration]).filter(ts.isEnumDeclaration)
      return formatEnumDeclaration(name, declarations, checker)
    }
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

const ALL_DTS = collectDtsFiles(distDir)

const program = ts.createProgram(ALL_DTS, {
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  skipLibCheck: true,
  declaration: true,
  noEmit: true,
})
const checker = program.getTypeChecker()

function snapshotEntry(entryFile) {
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

for (const [name, relPath] of Object.entries(selectedEntries)) {
  const file = entryPath(relPath)
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
  for (const { name, count } of summary) console.log(`  ${name}: ${count} declarations`)
}
process.exit(exitCode)
