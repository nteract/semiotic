import { dirname, resolve } from "node:path"
import { readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs"
import ts from "typescript"

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_"

function shortName(index) {
  return index < alphabet.length
    ? alphabet[index]
    : shortName(Math.floor(index / alphabet.length) - 1) +
        alphabet[index % alphabet.length]
}

/**
 * Shorten only the module interface of private esbuild chunks. Leaving local
 * identifiers intact lets Terser compress and mangle them together, instead of
 * optimizing identifiers that esbuild has already shortened. Entry points
 * (including lazy ones) and observable module namespaces retain their names.
 * Edits touch specifiers only, preserving bindings, evaluation order and hints.
 */
export function shortenChunkExports(result, workingDirectory = process.cwd(), preferLocalNames = false) {
  const files = result.outputFiles?.filter((file) => /\.m?js$/.test(file.path))
  if (!files?.length || !result.metafile) return
  // esbuild resolves the working directory through symlinks (for example
  // /tmp -> /private/tmp on macOS) before computing output-file paths.
  workingDirectory = realpathSync(workingDirectory)
  const metadata = new Map(
    Object.entries(result.metafile.outputs).map(([file, info]) => [
      resolve(workingDirectory, file),
      info
    ])
  )
  const sources = new Map(
    files.map((file) => [
      file.path,
      ts.createSourceFile(
        file.path,
        file.text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS
      )
    ])
  )
  const names = new Map()
  for (const [file, source] of sources) {
    const info = metadata.get(file)
    if (!info || info.entryPoint) continue
    if (
      source.statements.some((statement) =>
        ts.isExportDeclaration(statement)
          ? !statement.exportClause ||
            !ts.isNamedExports(statement.exportClause)
          : statement.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
            )
      )
    )
      continue
    const aliases = new Map()
    const usedAliases = new Set()
    for (const statement of source.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      )
        continue
      for (const specifier of statement.exportClause.elements) {
        if (specifier.name.text !== "default") {
          let alias = (specifier.propertyName ?? specifier.name).text
          if (!preferLocalNames || !/^[$A-Za-z_][$\w]?$/.test(alias) || usedAliases.has(alias)) {
            let index = aliases.size
            do { alias = shortName(index++) } while (usedAliases.has(alias))
          }
          usedAliases.add(alias)
          aliases.set(specifier.name.text, alias)
        }
      }
    }
    names.set(file, aliases)
  }

  // A namespace or star export exposes the original property names. Preserve
  // the target's interface even if another chunk imports it by name as well.
  for (const [file, source] of sources) {
    const preserve = (specifier) => {
      if (specifier && ts.isStringLiteral(specifier))
        names.delete(resolve(dirname(file), specifier.text))
    }
    const visit = (node) => {
      if (
        ts.isImportDeclaration(node) &&
        node.importClause?.namedBindings &&
        ts.isNamespaceImport(node.importClause.namedBindings)
      )
        preserve(node.moduleSpecifier)
      if (
        ts.isExportDeclaration(node) &&
        (!node.exportClause || ts.isNamespaceExport(node.exportClause))
      )
        preserve(node.moduleSpecifier)
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        preserve(node.arguments[0])
      ts.forEachChild(node, visit)
    }
    visit(source)
  }

  for (const file of files) {
    const source = sources.get(file.path)
    const ownNames = names.get(file.path)
    const edits = []
    const edit = (specifier, replacement) =>
      edits.push([specifier.getStart(source), specifier.end, replacement])
    for (const statement of source.statements) {
      const specifier = statement.moduleSpecifier
      const importedNames =
        specifier && ts.isStringLiteral(specifier)
          ? names.get(resolve(dirname(file.path), specifier.text))
          : undefined
      if (
        ts.isImportDeclaration(statement) &&
        importedNames &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        for (const binding of statement.importClause.namedBindings.elements) {
          const alias = importedNames.get(
            (binding.propertyName ?? binding.name).text
          )
          if (alias) edit(binding, alias === binding.name.text ? alias : `${alias} as ${binding.name.text}`)
        }
      }
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const binding of statement.exportClause.elements) {
          const local = binding.propertyName ?? binding.name
          const imported =
            importedNames?.get(local.text) ?? local.getText(source)
          const exported =
            ownNames?.get(binding.name.text) ?? binding.name.getText(source)
          if (
            imported !== local.getText(source) ||
            exported !== binding.name.getText(source)
          )
            edit(binding, imported === exported ? imported : `${imported} as ${exported}`)
        }
      }
    }
    let code = file.text
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
      code = code.slice(0, start) + replacement + code.slice(end)
    file.contents = new TextEncoder().encode(code)
    const info = metadata.get(file.path)
    if (info && ownNames)
      info.exports = info.exports.map((name) => ownNames.get(name) ?? name)
  }
}

export function shortenChunkExportsPlugin() {
  return {
    name: "shorten-chunk-exports",
    setup(build) {
      build.onEnd((result) => {
        if (!result.errors.length)
          shortenChunkExports(result, build.initialOptions.absWorkingDir)
      })
    }
  }
}

/** Shorten a private interface shared across separately built ESM groups. */
export function shortenBuiltEntryExports(directory, privateEntries) {
  directory = realpathSync(directory)
  const files = readdirSync(directory).filter((file) => /\.m?js$/.test(file))
  for (const entry of privateEntries) {
    if (!files.includes(entry)) throw new Error(`Missing private ESM entry: ${entry}`)
  }
  const outputFiles = files.map((file) => ({
    path: resolve(directory, file),
    contents: readFileSync(resolve(directory, file)),
    get text() { return Buffer.from(this.contents).toString("utf8") }
  }))
  const outputs = Object.fromEntries(files.map((file) => [
    resolve(directory, file),
    { entryPoint: privateEntries.includes(file) ? undefined : file, exports: [] }
  ]))
  shortenChunkExports({ outputFiles, metafile: { outputs } }, directory, true)
  for (const file of outputFiles) writeFileSync(file.path, file.contents)
}
