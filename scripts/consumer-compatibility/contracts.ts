import { publicJavaScriptEntrypoints } from "../lib/public-entrypoints.mjs"

export const bundlers = ["webpack", "rspack", "vite"] as const
export type Bundler = (typeof bundlers)[number]
export type Mode = "development" | "production"

export function parseOptions(args: string[]) {
  const options = {
    latest: false,
    tarball: undefined as string | undefined,
    report: "test-results/consumer-compatibility/report.json",
    bundlers: [...bundlers] as Bundler[]
  }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === "--latest") options.latest = true
    else if (["--tarball", "--report", "--bundler"].includes(arg)) {
      const value = args[++index]
      if (!value || value.startsWith("--"))
        throw new Error(`Missing ${arg} value`)
      if (arg === "--tarball") options.tarball = value
      else if (arg === "--report") options.report = value
      else {
        if (!bundlers.includes(value as Bundler))
          throw new Error(`Unknown bundler: ${value}`)
        options.bundlers = [value as Bundler]
      }
    } else throw new Error(`Unknown option: ${arg}`)
  }
  return options
}

export function consumerEntries(
  pkg: Parameters<typeof publicJavaScriptEntrypoints>[0]
) {
  const entries = publicJavaScriptEntrypoints(pkg)
  // These public APIs explicitly require Node. Edge remains in the browser
  // census as well as SSR; new public subpaths enter coverage automatically.
  const nodeOnly = new Set(["./server", "./server/node"])
  return {
    browser: entries.filter((entry) => !nodeOnly.has(entry.subpath)),
    server: entries.filter(
      (entry) =>
        entry.subpath === "./server" || entry.subpath.startsWith("./server/")
    )
  }
}

export function namespaceProbe(entries: { specifier: string }[]) {
  // Namespace objects escape so production tree shaking must retain every
  // export, including lazy worker clients and otherwise unused facades.
  return (
    entries
      .map(
        (entry, index) =>
          `import * as entry${index} from ${JSON.stringify(entry.specifier)};`
      )
      .join("\n") +
    `\nglobalThis.__semioticConsumerEntries = {\n${entries
      .map(
        (entry, index) => `  ${JSON.stringify(entry.specifier)}: entry${index}`
      )
      .join(",\n")}\n};\n`
  )
}

type Diagnostic = string | { message?: string; moduleName?: string }
export interface CompilationStats {
  hasErrors(): boolean
  hasWarnings(): boolean
  toJson(options: Record<string, boolean>): {
    errors?: Diagnostic[]
    warnings?: Diagnostic[]
  }
}

export function assertCleanCompilation(label: string, stats: CompilationStats) {
  if (!stats.hasErrors() && !stats.hasWarnings()) return
  const info = stats.toJson({ all: false, errors: true, warnings: true })
  const diagnostics = [...(info.errors ?? []), ...(info.warnings ?? [])]
  throw new Error(
    `${label}: compiler errors/warnings\n${diagnostics
      .map((item) =>
        typeof item === "string"
          ? item
          : `${item.moduleName ?? ""}: ${item.message ?? "Unknown diagnostic"}`
      )
      .join("\n")}`
  )
}

export function assertNoDiagnostics(label: string, diagnostics: string[]) {
  if (diagnostics.length)
    throw new Error(`${label}:\n${diagnostics.join("\n")}`)
}

// RSC consumers require these directives. A plain Vite SPA has no RSC
// boundary to preserve; removing the directive from the package would break
// Next.js. Keep this exception specific to the diagnostic, directive and
// package, and record every occurrence in the report. See:
// https://rolldown.rs/in-depth/directives#other-directives
export function isExpectedClientDirective(warning: {
  code?: string
  message: string
}) {
  return (
    warning.code === "MODULE_LEVEL_DIRECTIVE" &&
    /directive "use client" in "[^"\n]*node_modules[\\/]semiotic[\\/]dist[\\/][^"\n]+\.js"/.test(
      warning.message
    )
  )
}
