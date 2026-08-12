import { existsSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import ts from "typescript"

function collectDeclarations(root) {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && entry.name.endsWith(".d.ts")) files.push(path)
    }
  }
  visit(root)
  return files
}

function resolveAlias(symbol, checker) {
  let current = symbol
  for (let hops = 0; (current.flags & ts.SymbolFlags.Alias) && hops < 32; hops += 1) {
    const resolved = checker.getAliasedSymbol(current)
    if (!resolved || resolved === current) break
    current = resolved
  }
  return current
}

function exportedSymbol(sourceFile, name, checker) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  const exported = moduleSymbol && checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.getName() === name)
  return exported ? resolveAlias(exported, checker) : null
}

function symbolLocation(symbol) {
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null
}

function symbolType(symbol, checker) {
  const location = symbolLocation(symbol)
  return location ? checker.getTypeOfSymbolAtLocation(symbol, location) : null
}

function declaredType(symbol, checker) {
  try {
    return checker.getDeclaredTypeOfSymbol(symbol)
  } catch {
    return null
  }
}

function optionalOnlyHeritage(symbol, checker) {
  const declarations = symbol?.declarations?.filter(ts.isInterfaceDeclaration) ?? []
  if (declarations.length === 0) return false
  const heritageTypes = declarations.flatMap((declaration) =>
    declaration.heritageClauses?.flatMap((clause) => clause.types) ?? [],
  )
  if (heritageTypes.length === 0) return false

  return heritageTypes.every((heritage) => {
    const type = checker.getTypeAtLocation(heritage)
    if (
      type.getCallSignatures().length > 0 ||
      type.getConstructSignatures().length > 0 ||
      checker.getIndexTypeOfType(type, ts.IndexKind.String) ||
      checker.getIndexTypeOfType(type, ts.IndexKind.Number)
    ) {
      return false
    }
    const properties = checker.getPropertiesOfType(type)
    return properties.length > 0 && properties.every((property) =>
      property.declarations?.length > 0 &&
      property.declarations.every((declaration) => Boolean(declaration.questionToken)),
    )
  })
}

function isUnsafeTopLevelType(type) {
  return !type || Boolean(type.flags & ts.TypeFlags.Any) || type.intrinsicName === "error"
}

function propertyPresence(line) {
  return /\s=\s+(optional|required)\s/.exec(line)?.[1] ?? null
}

function memberParts(symbol) {
  const match = /^(interface|class)-member\s+(.+?)::(?:property|method|get|set|call|construct|index)::(.+)$/.exec(symbol)
  if (!match) return null
  return {
    ownerKind: match[1],
    owner: match[2],
    member: decodeURIComponent(match[3]),
  }
}

/**
 * Build one TypeScript type universe containing both published and current
 * declarations. Text snapshots remain the fail-closed primary signal; this
 * secondary check dismisses only changes for which TypeScript proves the old
 * accepted type is assignable to the new accepted type (or, for exported
 * functions/values, that the new value still satisfies the old contract).
 */
export function createDeclarationAssignability({ previousDist, currentDist }) {
  const previousRoot = resolve(previousDist)
  const currentRoot = resolve(currentDist)
  if (!existsSync(previousRoot) || !existsSync(currentRoot)) {
    throw new Error("Declaration assignability requires both previous and current dist directories")
  }

  const program = ts.createProgram(
    [...collectDeclarations(previousRoot), ...collectDeclarations(currentRoot)],
    {
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
  )
  const syntacticDiagnostics = program.getSyntacticDiagnostics()
  if (syntacticDiagnostics.length > 0) {
    const diagnostic = syntacticDiagnostics[0]
    throw new Error(
      `Could not parse declarations for semantic compatibility: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
    )
  }
  const checker = program.getTypeChecker()

  function entrySources(entry) {
    const fileName = `${entry}.d.ts`
    const previous = program.getSourceFile(join(previousRoot, fileName))
    const current = program.getSourceFile(join(currentRoot, fileName))
    return previous && current ? { previous, current } : null
  }

  function memberCompatible(sources, change, parts) {
    const previousPresence = propertyPresence(change.previous[0] ?? "")
    const currentPresence = propertyPresence(change.current[0] ?? "")
    if (previousPresence === "optional" && currentPresence === "required") return false

    const previousOwner = exportedSymbol(sources.previous, parts.owner, checker)
    const currentOwner = exportedSymbol(sources.current, parts.owner, checker)
    if (!previousOwner || !currentOwner) return false
    const previousOwnerType = declaredType(previousOwner, checker)
    const currentOwnerType = declaredType(currentOwner, checker)
    if (!previousOwnerType || !currentOwnerType) return false
    const previousMember = checker.getPropertyOfType(previousOwnerType, parts.member)
    const currentMember = checker.getPropertyOfType(currentOwnerType, parts.member)
    if (!previousMember || !currentMember) return false
    const previousType = symbolType(previousMember, checker)
    const currentType = symbolType(currentMember, checker)
    if (isUnsafeTopLevelType(previousType) || isUnsafeTopLevelType(currentType)) return false
    return parts.ownerKind === "class"
      ? checker.isTypeAssignableTo(currentType, previousType)
      : checker.isTypeAssignableTo(previousType, currentType)
  }

  return {
    isCompatible(entry, change) {
      const sources = entrySources(entry)
      if (!sources) return false

      const member = memberParts(change.symbol)
      if (member) return memberCompatible(sources, change, member)

      const previousLine = change.previous[0] ?? ""
      const currentLine = change.current[0] ?? ""
      const name = change.symbol
      const previousSymbol = exportedSymbol(sources.previous, name, checker)
      const currentSymbol = exportedSymbol(sources.current, name, checker)
      if (!previousSymbol || !currentSymbol) return false

      if (previousLine.startsWith("interface ") && currentLine.startsWith("interface ")) {
        const previousType = declaredType(previousSymbol, checker)
        const currentType = declaredType(currentSymbol, checker)
        if (isUnsafeTopLevelType(previousType) || isUnsafeTopLevelType(currentType)) return false
        return checker.isTypeAssignableTo(previousType, currentType) ||
          (
            currentLine.startsWith(`${previousLine} extends `) &&
            optionalOnlyHeritage(currentSymbol, checker)
          )
      }

      if (previousLine.startsWith("type ") && currentLine.startsWith("type ")) {
        const previousType = declaredType(previousSymbol, checker)
        const currentType = declaredType(currentSymbol, checker)
        if (isUnsafeTopLevelType(previousType) || isUnsafeTopLevelType(currentType)) return false
        return checker.isTypeAssignableTo(previousType, currentType)
      }

      if (
        /^(?:const|function)\s/.test(previousLine) &&
        /^(?:const|function)\s/.test(currentLine)
      ) {
        const previousType = symbolType(previousSymbol, checker)
        const currentType = symbolType(currentSymbol, checker)
        if (isUnsafeTopLevelType(previousType) || isUnsafeTopLevelType(currentType)) return false
        // Consumers receive the current export but compiled against the old
        // callable/value contract, so exported values use the reverse direction.
        return checker.isTypeAssignableTo(currentType, previousType)
      }

      return false
    },
  }
}
