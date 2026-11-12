import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, relative, resolve } from "node:path"
import ts from "typescript"
import { publicJavaScriptEntrypoints } from "./public-entrypoints.mjs"

export interface ImportPath {
  specifier: string
  name: string
}
export interface SignatureType {
  id: string
  name: string
  file: string
  line: number
  ownership: "package" | "external"
  imports: ImportPath[]
  references: { from: string; file: string; line: number }[]
}
export interface SignatureReview {
  id: string
  classification: "author-facing" | "internal"
  reason: string
  requiredImports?: ImportPath[]
}

function unalias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  const seen = new Set<ts.Symbol>()
  while (symbol.flags & ts.SymbolFlags.Alias) {
    if (seen.has(symbol)) throw new Error(`Cyclic symbol alias: ${symbol.name}`)
    seen.add(symbol)
    symbol = checker.getAliasedSymbol(symbol)
  }
  return symbol
}

/** Walk the bound declaration graph, not printed type strings. Published d.ts
 * signatures already contain inferred return/property types. Visiting their
 * type nodes retains names the checker erases (e.g. aliases of primitives),
 * overloads, generic arguments/constraints and recursive definitions alike.
 * External definitions are boundaries; their package-owned type arguments are
 * still visited at the use site. Private class members are not public inputs.
 */
export function inventorySignatureTypes(packageRoot: string): SignatureType[] {
  const root = resolve(packageRoot)
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  const entries = publicJavaScriptEntrypoints(pkg) as {
    specifier: string
    declarationPath?: string
  }[]
  const rootNames = entries.map((entry) => {
    if (
      !entry.declarationPath ||
      !existsSync(resolve(root, entry.declarationPath))
    )
      throw new Error(
        `Missing declarations for ${entry.specifier}; build declarations first`
      )
    return resolve(root, entry.declarationPath)
  })
  if (!rootNames.length) throw new Error("No public declaration entries")
  const program = ts.createProgram(rootNames, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: ["node"]
  })
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getSyntacticDiagnostics()
  ]
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n"
      })
    )
  const checker = program.getTypeChecker()
  const packageFile = (file: string) => {
    const path = relative(root, file)
    const parts = path.split(/[\\/]/)
    return (
      !isAbsolute(path) && parts[0] !== ".." && !parts.includes("node_modules")
    )
  }
  // An unresolved export-star otherwise contributes no symbols and silently
  // shrinks the inventory. Check module bindings even when no type uses them.
  for (const source of program.getSourceFiles()) {
    if (!packageFile(source.fileName)) continue
    for (const statement of source.statements) {
      if (
        (ts.isImportDeclaration(statement) ||
          ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        !checker.getSymbolAtLocation(statement.moduleSpecifier)
      )
        throw new Error(
          `Unresolved module ${statement.moduleSpecifier.getText()} in ${relative(root, source.fileName)}`
        )
    }
  }
  const imports = new Map<ts.Symbol, ImportPath[]>()
  const pending: ts.Symbol[] = []
  const visited = new Set<ts.Symbol>()
  const records = new Map<ts.Symbol, SignatureType>()
  const fileName = (file: string) => relative(root, file).replaceAll("\\", "/")
  const location = (node: ts.Node) => ({
    file: fileName(node.getSourceFile().fileName),
    line:
      node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line +
      1
  })
  const owned = (symbol: ts.Symbol) =>
    symbol.declarations?.some((node) =>
      packageFile(node.getSourceFile().fileName)
    ) ?? false
  const identity = (symbol: ts.Symbol) => {
    const declaration = symbol.declarations?.[0]
    if (!declaration) throw new Error(`Unresolved declaration: ${symbol.name}`)
    // Qualified namespace names distinguish nested types in the same file.
    const name = checker.getFullyQualifiedName(symbol).replace(/^"[^"]+"\./, "")
    return `${location(declaration).file}#${name}`
  }
  const namedType = (symbol: ts.Symbol) =>
    symbol.declarations?.some(
      (node) =>
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isEnumDeclaration(node)
    ) ?? false
  function enqueue(symbol: ts.Symbol, from?: ts.Symbol, site?: ts.Node) {
    symbol = unalias(symbol, checker)
    if (symbol.flags & ts.SymbolFlags.TypeParameter) return
    if (!symbol.declarations?.length)
      throw new Error(
        `Unresolved type ${symbol.name}${site ? ` at ${JSON.stringify(location(site))}` : ""}`
      )
    if (namedType(symbol)) {
      let record = records.get(symbol)
      if (!record) {
        record = {
          id: identity(symbol),
          name: symbol.name,
          ...location(symbol.declarations[0]),
          ownership: owned(symbol) ? "package" : "external",
          imports: [],
          references: []
        }
        records.set(symbol, record)
      }
      if (from && site) {
        const reference = { from: identity(from), ...location(site) }
        if (
          !record.references.some(
            (ref) => JSON.stringify(ref) === JSON.stringify(reference)
          )
        )
          record.references.push(reference)
      }
    }
    if (owned(symbol) && !visited.has(symbol)) {
      visited.add(symbol)
      pending.push(symbol)
    }
  }
  function addImport(symbol: ts.Symbol, path: ImportPath) {
    const paths = imports.get(symbol) ?? []
    if (
      !paths.some((p) => p.specifier === path.specifier && p.name === path.name)
    )
      paths.push(path)
    imports.set(symbol, paths)
  }
  function expose(
    symbol: ts.Symbol,
    path: ImportPath,
    ancestors = new Set<ts.Symbol>()
  ) {
    addImport(symbol, path)
    enqueue(symbol)
    if (!(symbol.flags & ts.SymbolFlags.Module) || ancestors.has(symbol)) return
    for (const child of checker.getExportsOfModule(symbol))
      expose(
        unalias(child, checker),
        { ...path, name: `${path.name}.${child.name}` },
        new Set([...ancestors, symbol])
      )
  }
  entries.forEach((entry, index) => {
    const source = program.getSourceFile(rootNames[index])!
    const module = checker.getSymbolAtLocation(source)
    if (!module) throw new Error(`Not a declaration module: ${entry.specifier}`)
    for (const exported of checker.getExportsOfModule(module)) {
      const symbol = unalias(exported, checker)
      expose(symbol, { specifier: entry.specifier, name: exported.name })
    }
  })
  // Transparent aliases supply a usable name too. Generic arguments must forward
  // each parameter unchanged, with identical constraints/defaults; a specialized
  // alias (e.g. Box<string>) is not a public name for every Box<T>.
  function transparentTarget(symbol: ts.Symbol): ts.Symbol | undefined {
    const declaration = symbol.declarations?.find(ts.isTypeAliasDeclaration)
    if (!declaration || !ts.isTypeReferenceNode(declaration.type)) return
    const target = checker.getSymbolAtLocation(declaration.type.typeName)
    if (!target) return
    const resolved = unalias(target, checker)
    const targetDeclaration = resolved.declarations?.find(
      (node) =>
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)
    )
    if (!targetDeclaration) return
    const parameters = declaration.typeParameters ?? []
    const targetParameters = targetDeclaration.typeParameters ?? []
    const arguments_ = declaration.type.typeArguments ?? []
    if (
      parameters.length !== targetParameters.length ||
      arguments_.length !== parameters.length
    )
      return
    const sameType = (left?: ts.TypeNode, right?: ts.TypeNode) =>
      left && right
        ? checker.getTypeFromTypeNode(left) ===
          checker.getTypeFromTypeNode(right)
        : !left && !right
    if (
      !parameters.every((parameter, index) => {
        const argument = arguments_[index]
        return (
          ts.isTypeReferenceNode(argument) &&
          !argument.typeArguments?.length &&
          checker.getSymbolAtLocation(argument.typeName) ===
            checker.getSymbolAtLocation(parameter.name) &&
          sameType(parameter.constraint, targetParameters[index].constraint) &&
          sameType(parameter.default, targetParameters[index].default)
        )
      })
    )
      return
    return resolved
  }
  for (const [symbol, paths] of imports) {
    const seen = new Set([symbol])
    let target = transparentTarget(symbol)
    while (target && !seen.has(target)) {
      seen.add(target)
      for (const path of paths) addImport(target, path)
      target = transparentTarget(target)
    }
  }
  while (pending.length) {
    const owner = pending.shift()!
    if (owner.flags & ts.SymbolFlags.Module) {
      for (const child of checker.getExportsOfModule(owner)) enqueue(child)
      continue
    }
    const visit = (node: ts.Node) => {
      if (
        ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)
      )
        return
      if (
        "name" in node &&
        node.name &&
        ts.isPrivateIdentifier(node.name as ts.Node)
      )
        return
      let reference: ts.Node | undefined
      if (ts.isTypeReferenceNode(node)) reference = node.typeName
      else if (ts.isExpressionWithTypeArguments(node))
        reference = node.expression
      else if (ts.isTypeQueryNode(node)) reference = node.exprName
      else if (ts.isImportTypeNode(node)) {
        reference = node.qualifier
        if (!reference) {
          const symbol = checker.getTypeAtLocation(node).symbol
          if (!symbol)
            throw new Error(
              `Unresolved import type at ${JSON.stringify(location(node))}`
            )
          enqueue(symbol, owner, node)
        }
      }
      if (reference) {
        const symbol = checker.getSymbolAtLocation(reference)
        if (!symbol)
          throw new Error(
            `Unresolved type ${reference.getText()} at ${JSON.stringify(location(node))}`
          )
        enqueue(symbol, owner, node)
      }
      ts.forEachChild(node, visit)
    }
    for (const declaration of owner.declarations ?? []) visit(declaration)
  }
  return [...records]
    .map(([symbol, record]) => ({
      ...record,
      imports: (imports.get(symbol) ?? []).sort(
        (a, b) =>
          a.specifier.localeCompare(b.specifier) || a.name.localeCompare(b.name)
      ),
      references: record.references.sort(
        (a, b) => a.from.localeCompare(b.from) || a.line - b.line
      )
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** Only reviewed author-facing names gate CI. Unreviewed reachable types remain
 * visible inventory; structural inference and implementation helpers are valid.
 */
export function reviewSignatureTypes(
  types: SignatureType[],
  reviews: SignatureReview[]
) {
  const failures: string[] = []
  const reviewed = new Map<string, SignatureReview>()
  for (const review of reviews) {
    if (reviewed.has(review.id))
      throw new Error(`Duplicate review: ${review.id}`)
    if (!review.reason?.trim() || review.reason.trim().length < 20)
      throw new Error(`Review needs a reason: ${review.id}`)
    if (!["author-facing", "internal"].includes(review.classification))
      throw new Error(`Invalid classification: ${review.id}`)
    const type = types.find((t) => t.id === review.id)
    if (!type || type.ownership !== "package")
      throw new Error(`Stale or external review: ${review.id}`)
    if (review.classification === "author-facing") {
      if (!review.requiredImports?.length)
        throw new Error(
          `Author-facing review needs requiredImports: ${review.id}`
        )
      for (const path of review.requiredImports) {
        if (
          !type.imports.some(
            (p) => p.specifier === path.specifier && p.name === path.name
          )
        )
          failures.push(
            `${review.id}: restore public import ${path.name} from ${path.specifier} (${review.reason})`
          )
      }
    } else if (review.requiredImports)
      throw new Error(`Internal review cannot require imports: ${review.id}`)
    reviewed.set(review.id, review)
  }
  return {
    schemaVersion: 1,
    types: types.map((type) => ({
      ...type,
      classification:
        type.ownership === "external"
          ? "external"
          : (reviewed.get(type.id)?.classification ??
            (type.imports.length ? "public" : "unreviewed")),
      reason: reviewed.get(type.id)?.reason
    })),
    failures
  }
}
