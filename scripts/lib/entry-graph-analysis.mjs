import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, relative, resolve } from "node:path"
import { constants, gzipSync } from "node:zlib"
import ts from "typescript"

/** Keep attribution for every ESM build group, including groups built after
 * the primary client graph. These are esbuild bytes BEFORE Terser and the
 * facade passes; only final files determine the gzip budgets. */
export function entryGraphInputsPlugin(outputs, group) {
  return {
    name: "entry-graph-inputs",
    setup(build) {
      build.initialOptions.metafile = true
      build.onEnd((result) => {
        for (const [file, output] of Object.entries(
          result.metafile?.outputs ?? {}
        )) {
          if (!file.endsWith(".js")) continue
          outputs[basename(file)] = {
            group,
            inputs: Object.fromEntries(
              Object.entries(output.inputs).map(([source, input]) => [
                source.replaceAll("\\", "/"),
                input.bytesInOutput
              ])
            )
          }
        }
      })
    }
  }
}

export function measureEntryGraphs(directory, entries, attribution = {}) {
  const root = resolve(directory)
  const chunks = new Map()
  function read(file) {
    if (chunks.has(file)) return chunks.get(file)
    const path = resolve(root, file)
    const buffer = readFileSync(path)
    const source = ts.createSourceFile(
      path,
      buffer.toString(),
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.JS
    )
    const imports = []
    for (const statement of source.statements) {
      if (!(
        ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
      ))
        continue
      const specifier = statement.moduleSpecifier
      if (
        specifier &&
        ts.isStringLiteral(specifier) &&
        specifier.text.startsWith(".")
      ) {
        imports.push(
          relative(root, resolve(dirname(path), specifier.text)).replaceAll(
            "\\",
            "/"
          )
        )
      }
    }
    const chunk = {
      file,
      rawBytes: buffer.length,
      gzipBytes: gzipSync(buffer, { level: constants.Z_BEST_COMPRESSION })
        .length,
      hash: createHash("sha256").update(buffer).digest("hex"),
      imports,
      entries: [],
      ...attribution[file]
    }
    chunks.set(file, chunk)
    return chunk
  }
  const rows = [],
    missing = []
  for (const { entry, label, limitKb } of entries) {
    if (!existsSync(resolve(root, entry))) {
      missing.push({ entry, label })
      continue
    }
    const seen = new Set()
    function visit(file) {
      if (seen.has(file)) return
      seen.add(file)
      const chunk = read(file)
      chunk.entries.push(label)
      for (const dependency of chunk.imports) visit(dependency)
    }
    visit(entry)
    let gzipBytes = 0,
      rawBytes = 0
    for (const file of seen) {
      const chunk = chunks.get(file)
      gzipBytes += chunk.gzipBytes
      rawBytes += chunk.rawBytes
    }
    rows.push({
      entry,
      label,
      limit: limitKb * 1024,
      gzipBytes,
      rawBytes,
      chunks: [...seen].sort()
    })
  }
  return {
    version: 1,
    entries: rows,
    missing,
    chunks: [...chunks.values()].sort((a, b) => a.file.localeCompare(b.file))
  }
}

/** Match hashed chunks by their unique build group + contributing module set.
 * If a split/merge makes that ambiguous, retain honest added/removed records
 * rather than guessing a lineage. Public filenames match directly. */
export function compareEntryGraphs(previous, current) {
  if (previous.version !== 1 || current.version !== 1)
    throw new Error("Unsupported entry-graph report version")
  const identity = (chunk) => {
    const sources = Object.keys(chunk.inputs ?? {})
      .filter((key) => chunk.inputs[key] > 0)
      .sort()
    return sources.length ? JSON.stringify([chunk.group, sources]) : null
  }
  const previousByFile = new Map(
    previous.chunks.map((chunk) => [chunk.file, chunk])
  )
  const identities = new Map()
  for (const chunk of previous.chunks) {
    const key = identity(chunk)
    if (key) identities.set(key, identities.has(key) ? null : chunk)
  }
  const currentIdentities = new Map()
  for (const chunk of current.chunks) {
    const key = identity(chunk)
    currentIdentities.set(key, (currentIdentities.get(key) ?? 0) + 1)
  }
  const used = new Set(),
    changes = []
  function change(before, after) {
    const beforeInputs = before?.inputs ?? {},
      afterInputs = after?.inputs ?? {}
    const inputsComparable = Boolean(
      (!before || before.inputs) && (!after || after.inputs)
    )
    const sources = !inputsComparable
      ? []
      : [
          ...new Set([
            ...Object.keys(beforeInputs),
            ...Object.keys(afterInputs)
          ])
        ]
          .map((source) => ({
            source,
            delta: (afterInputs[source] ?? 0) - (beforeInputs[source] ?? 0)
          }))
          .filter(({ delta }) => delta !== 0)
          .sort(
            (a, b) =>
              Math.abs(b.delta) - Math.abs(a.delta) ||
              a.source.localeCompare(b.source)
          )
    return {
      previous: before?.file ?? null,
      current: after?.file ?? null,
      gzipDelta: (after?.gzipBytes ?? 0) - (before?.gzipBytes ?? 0),
      entries: [
        ...new Set([...(before?.entries ?? []), ...(after?.entries ?? [])])
      ].sort(),
      inputsComparable,
      sources
    }
  }
  for (const chunk of current.chunks) {
    const key = identity(chunk)
    const before =
      previousByFile.get(chunk.file) ??
      (currentIdentities.get(key) === 1 ? identities.get(key) : undefined)
    if (before && !used.has(before.file)) {
      used.add(before.file)
      if (before.hash !== chunk.hash) changes.push(change(before, chunk))
    } else changes.push(change(undefined, chunk))
  }
  for (const chunk of previous.chunks)
    if (!used.has(chunk.file)) changes.push(change(chunk, undefined))
  const beforeEntries = new Map(
    previous.entries.map((entry) => [entry.label, entry])
  )
  return {
    entries: current.entries
      .map((entry) => ({
        label: entry.label,
        gzipDelta:
          entry.gzipBytes - (beforeEntries.get(entry.label)?.gzipBytes ?? 0)
      }))
      .filter(({ gzipDelta }) => gzipDelta !== 0),
    chunks: changes.sort((a, b) => b.gzipDelta - a.gzipDelta)
  }
}

const signed = (value) => `${value >= 0 ? "+" : ""}${value} B`

export function formatEntryGraphDetails(report, comparison, labels) {
  const lines = []
  if (comparison) {
    lines.push("Entry graph changes from baseline:")
    for (const entry of comparison.entries)
      lines.push(`  ${entry.label}: ${signed(entry.gzipDelta)} gzip`)
    if (!comparison.entries.length) lines.push("  no gzip changes")
    lines.push("Changed chunks (gzip delta; shared chunks listed once):")
    for (const chunk of comparison.chunks.slice(0, 10)) {
      const name = !chunk.previous
        ? `added ${chunk.current}`
        : !chunk.current
          ? `removed ${chunk.previous}`
          : chunk.previous === chunk.current
            ? chunk.current
            : `${chunk.previous} → ${chunk.current}`
      lines.push(
        `  ${signed(chunk.gzipDelta)} ${name}`,
        `    entries: ${chunk.entries.join(", ")}`
      )
      for (const input of chunk.sources.slice(0, 5))
        lines.push(`    ${signed(input.delta)} ${input.source}`)
      if (!chunk.inputsComparable)
        lines.push(
          "    source delta unavailable: attribution missing in one of the builds"
        )
    }
    if (comparison.chunks.length > 10)
      lines.push(
        `  ${comparison.chunks.length - 10} more changes in the JSON report`
      )
    if (!comparison.chunks.length) lines.push("  no content changes")
  }
  if (labels?.length) {
    lines.push("Largest reachable chunks for selected entries:")
    const chunks = report.chunks
      .filter((chunk) => chunk.entries.some((entry) => labels.includes(entry)))
      .sort((a, b) => b.gzipBytes - a.gzipBytes)
    for (const chunk of chunks.slice(0, 10)) {
      lines.push(
        `  ${(chunk.gzipBytes / 1024).toFixed(1)} KB gzip ${chunk.file}`,
        `    entries: ${chunk.entries.join(", ")}`
      )
      for (const [source, bytes] of Object.entries(chunk.inputs ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)) {
        lines.push(`    ${bytes} B ${source}`)
      }
      if (!chunk.inputs)
        lines.push(
          "    no esbuild attribution: generated facade or older build"
        )
    }
  }
  if (lines.length)
    lines.push(
      "Source bytes are esbuild contributions before post-processing, not per-module gzip sizes."
    )
  return lines.join("\n")
}
