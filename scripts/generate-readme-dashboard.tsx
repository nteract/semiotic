#!/usr/bin/env tsx
/**
 * Generate the README "living dashboard" with Semiotic's own SSR renderer.
 *
 * The dashboard is intentionally checked in as an SVG asset so it is visible
 * on npm/GitHub without client-side JavaScript. It is regenerated from tagged
 * release artifacts plus the current working tree, then gated in release:check.
 */

import { execFileSync } from "node:child_process"
import { constants as zlibConstants, gzipSync } from "node:zlib"
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { renderChart } from "../src/components/server/renderToStaticSVG"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const checkOnly = process.argv.includes("--check")

const README_PATH = resolve(repoRoot, "README.md")
const OUTPUT_PATH = resolve(
  repoRoot,
  "docs/public/assets/img/semiotic-release-dashboard.svg"
)
const MARKER_START = "<!-- semiotic-readme-dashboard:start -->"
const MARKER_END = "<!-- semiotic-readme-dashboard:end -->"

const RELEASE_TAGS = [
  "v3.0.0",
  "v3.1.0",
  "v3.2.0",
  "v3.3.0",
  "v3.4.0",
  "v3.5.0",
  "v3.5.2",
  "v3.5.3",
  "v3.6.0",
  "v3.7.0",
  "v3.7.1",
  "v3.7.2",
  "v3.7.3",
  "v3.7.4"
]

const CURRENT_COLORS = {
  bg: "#f4f4f4",
  panel: "#ffffff",
  border: "#c6c6c6",
  text: "#161616",
  muted: "#525252",
  faint: "#e0e0e0",
  blue: "#0f62fe",
  cyan: "#1192e8",
  teal: "#007d79",
  purple: "#8a3ffc",
  magenta: "#d02670",
  green: "#198038",
  orange: "#ff832b",
  red: "#da1e28"
}

const BLURBS: Record<string, string> = {
  ".": "Everything below (full bundle)",
  "./xy": "XY charts",
  "./ordinal": "Ordinal charts",
  "./network": "Network charts",
  "./geo": "Geo charts",
  "./realtime": "Realtime charts",
  "./server": "SSR/server tools",
  "./utils": "Utilities",
  "./recipes": "Recipes",
  "./themes": "Themes",
  "./data": "Data helpers",
  "./value": "Value KPI",
  "./ai": "AI catalog"
}

const ORDER = [
  "./xy",
  "./ordinal",
  "./network",
  "./geo",
  "./realtime",
  "./server",
  "./utils",
  "./recipes",
  "./themes",
  "./data",
  "./value",
  "./ai",
  "."
]

const DOC_CATEGORIES = [
  "XY Charts",
  "Ordinal Charts",
  "Network Charts",
  "Geo Charts",
  "Frames",
  "Features",
  "Custom Charts",
  "Accessibility",
  "Annotations",
  "Intelligence",
  "Interoperability",
  "Theming",
  "Cookbook",
  "Recipes",
  "Playground",
  "Server Rendering",
  "API Reference"
]

const DOC_CATEGORY_COLORS: Record<string, string> = {
  "XY Charts": "#0f62fe",
  "Ordinal Charts": "#4589ff",
  "Network Charts": "#78a9ff",
  "Geo Charts": "#a6c8ff",
  Frames: "#007d79",
  Features: "#009d9a",
  "Custom Charts": "#24a148",
  Theming: "#42be65",
  Cookbook: "#6fdc8c",
  Recipes: "#a7f0ba",
  Accessibility: "#8a3ffc",
  Annotations: "#a56eff",
  Intelligence: "#be95ff",
  Interoperability: "#d4bbff",
  Playground: "#d02670",
  "Server Rendering": "#ee5396",
  "API Reference": "#ff7eb6"
}

const XY_CHART_PAGES = new Set([
  "LineChartPage",
  "AreaChartPage",
  "DifferenceChartPage",
  "StackedAreaChartPage",
  "ScatterplotPage",
  "ConnectedScatterplotPage",
  "BubbleChartPage",
  "HeatmapPage",
  "ScatterplotMatrixPage",
  "QuadrantChartPage",
  "MultiAxisLineChartPage",
  "CandlestickChartPage",
  "RealtimeLineChartPage",
  "RealtimeSwarmChartPage",
  "RealtimeWaterfallChartPage",
  "RealtimeHeatmapPage"
])

const ORDINAL_CHART_PAGES = new Set([
  "BarChartPage",
  "StackedBarChartPage",
  "LikertChartPage",
  "SwarmPlotPage",
  "BoxPlotPage",
  "HistogramPage",
  "ViolinPlotPage",
  "DotPlotPage",
  "PieChartPage",
  "DonutChartPage",
  "GaugeChartPage",
  "GroupedBarChartPage",
  "FunnelChartPage",
  "SwimlaneChartPage",
  "RealtimeHistogramPage",
  "BigNumberPage"
])

const NETWORK_CHART_PAGES = new Set([
  "ForceDirectedGraphPage",
  "ChordDiagramPage",
  "SankeyDiagramPage",
  "ProcessSankeyPage",
  "TreeDiagramPage",
  "TreemapPage",
  "CirclePackPage",
  "OrbitDiagramPage"
])

const GEO_CHART_PAGES = new Set([
  "ChoroplethMapPage",
  "ProportionalSymbolMapPage",
  "FlowMapPage",
  "DistanceCartogramPage",
  "TileMapPage"
])

function readJsonAtTag<T>(tag: string, path: string): T {
  const text = execFileSync("git", ["show", `${tag}:${path}`], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 20 * 1024 * 1024
  })
  return JSON.parse(text) as T
}

function readTextAtVersion(version: string, path: string): string {
  if (!version.startsWith("v")) {
    return readFileSync(resolve(repoRoot, path), "utf8")
  }
  return execFileSync("git", ["show", `${version}:${path}`], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 20 * 1024 * 1024
  })
}

function tagDate(tag: string): string {
  return execFileSync("git", ["show", "-s", "--format=%cs", tag], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim()
}

function currentVersion(): string {
  const pkg = JSON.parse(
    readFileSync(resolve(repoRoot, "package.json"), "utf8")
  )
  return String(pkg.version)
}

function currentReleaseDate(version: string): string {
  const changelog = readFileSync(resolve(repoRoot, "CHANGELOG.md"), "utf8")
  const match = changelog.match(
    new RegExp(
      `^## \\\\[${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\\\] - (\\d{4}-\\d{2}-\\d{2})`,
      "m"
    )
  )
  return match?.[1] ?? new Date().toISOString().slice(0, 10)
}

function schemaCount(version: string): number {
  const schema = version.startsWith("v")
    ? readJsonAtTag<{ tools?: unknown[] }>(version, "ai/schema.json")
    : JSON.parse(readFileSync(resolve(repoRoot, "ai/schema.json"), "utf8"))
  return schema.tools?.length ?? 0
}

type Capabilities = {
  charts: Record<
    string,
    {
      category: string
      supportsSSR: boolean
      supportsPush: boolean
      supportsLinkedHover: boolean
      supportsSelection: boolean
    }
  >
}

function capabilities(version: string): Capabilities | null {
  try {
    if (version.startsWith("v"))
      return readJsonAtTag<Capabilities>(version, "ai/capabilities.json")
    return JSON.parse(
      readFileSync(resolve(repoRoot, "ai/capabilities.json"), "utf8")
    ) as Capabilities
  } catch {
    return null
  }
}

function exportCount(version: string): number {
  const pkg = version.startsWith("v")
    ? readJsonAtTag<{ exports?: Record<string, unknown> }>(
        version,
        "package.json"
      )
    : JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"))
  return Object.keys(pkg.exports ?? {}).filter(
    (key) => key !== "./package.json"
  ).length
}

function subpathToImportPath(subpath: string): string {
  if (subpath === ".") return "semiotic"
  if (subpath.startsWith("./")) return `semiotic/${subpath.slice(2)}`
  return subpath
}

function resolveBundleFile(exportValue: unknown): string | null {
  if (typeof exportValue === "string") return exportValue
  if (exportValue && typeof exportValue === "object") {
    const value = exportValue as Record<string, string>
    return value.import ?? value.module ?? value.default ?? null
  }
  return null
}

function localModuleSpecifiers(text: string): string[] {
  const specs = new Set<string>()
  const patterns = [
    /\b(?:import|export)\s*[^"'()]*?\s*from\s*["'](\.\/[^"']+)["']/g,
    /\bimport\s*["'](\.\/[^"']+)["']/g,
    /\bimport\(\s*["'](\.\/[^"']+)["']\s*\)/g
  ]
  for (const re of patterns) {
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) specs.add(match[1])
  }
  return [...specs]
}

function resolveBundleFiles(entryAbs: string): string[] {
  const seen = new Set<string>()
  const files: string[] = []
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    if (!existsSync(file)) throw new Error(`Missing bundle file: ${file}`)
    const text = readFileSync(file, "utf8")
    files.push(file)
    for (const spec of localModuleSpecifiers(text))
      visit(resolve(dirname(file), spec))
  }
  visit(entryAbs)
  return files
}

function gzipSize(files: string[]): number {
  return files.reduce((sum, file) => {
    const raw = readFileSync(file)
    return (
      sum + gzipSync(raw, { level: zlibConstants.Z_BEST_COMPRESSION }).length
    )
  }, 0)
}

function currentBundleRows() {
  const pkg = JSON.parse(
    readFileSync(resolve(repoRoot, "package.json"), "utf8")
  )
  return ORDER.map((subpath) => {
    const bundleRel = resolveBundleFile(pkg.exports?.[subpath])
    if (!bundleRel) throw new Error(`Could not resolve bundle for ${subpath}`)
    const bundleAbs = resolve(repoRoot, bundleRel)
    statSync(bundleAbs)
    return {
      subpath,
      importPath: subpathToImportPath(subpath),
      kb: Math.round(gzipSize(resolveBundleFiles(bundleAbs)) / 1024),
      blurb: BLURBS[subpath]
    }
  })
}

function chartDocCategory(component: string): string | null {
  if (XY_CHART_PAGES.has(component)) return "XY Charts"
  if (ORDINAL_CHART_PAGES.has(component)) return "Ordinal Charts"
  if (NETWORK_CHART_PAGES.has(component)) return "Network Charts"
  if (GEO_CHART_PAGES.has(component)) return "Geo Charts"
  return null
}

function docsCategoryForRoute(fullPath: string, component: string): string | null {
  const top = fullPath.split("/")[0]
  if (top === "charts") return chartDocCategory(component)
  if (top === "frames") return "Frames"
  if (top === "features") return "Features"
  if (top === "custom-charts") return "Custom Charts"
  if (top === "accessibility") return "Accessibility"
  if (top === "annotations") return "Annotations"
  if (top === "intelligence") return "Intelligence"
  if (top === "interoperability") return "Interoperability"
  if (top === "theming") return "Theming"
  if (top === "cookbook") return "Cookbook"
  if (top === "recipes") return "Recipes"
  if (top === "playground") return "Playground"
  if (top === "api") return "API Reference"
  if (
    fullPath === "using-ssr" ||
    fullPath === "ssr-gallery" ||
    top === "server"
  ) {
    return "Server Rendering"
  }
  return null
}

function routeEntriesForVersion(version: string): Array<{ category: string; component: string }> {
  const text = readTextAtVersion(version, "docs/src/App.js")
  const entries: Array<{ category: string; component: string }> = []
  const stack: string[] = []
  const seen = new Set<string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.includes("</Route>")) {
      const closeCount = (line.match(/<\/Route>/g) ?? []).length
      for (let i = 0; i < closeCount; i += 1) stack.pop()
    }
    const outlet = line.match(/<Route\s+path="([^"]+)"\s+element=\{<Outlet\s*\/>\}>/)
    if (outlet) {
      stack.push(outlet[1])
      continue
    }
    const route = line.match(/<Route(?:\s+index)?(?:\s+path="([^"]+)")?\s+element=\{<([A-Z][A-Za-z0-9]*)/)
    if (!route) continue
    const component = route[2]
    if (component === "Navigate" || component === "Outlet" || component === "NotFoundPage") continue
    const path = route[1] ?? ""
    const fullPath = [...stack, path].filter(Boolean).join("/")
    const category = docsCategoryForRoute(fullPath, component)
    if (!category) continue
    const key = `${category}:${component}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ category, component })
  }
  return entries
}

function docsCategoryCounts(version: string): Record<string, number> {
  const counts = Object.fromEntries(DOC_CATEGORIES.map((category) => [category, 0]))
  for (const entry of routeEntriesForVersion(version)) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1
  }
  return counts
}

function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function chartSvg(
  component: Parameters<typeof renderChart>[0],
  idPrefix: string,
  props: Record<string, unknown>
) {
  const svg = renderChart(component, {
    theme: "carbon",
    background: "transparent",
    showGrid: true,
    ...props
  })
  return svg
    .replaceAll("semiotic-title", `${idPrefix}-title`)
    .replaceAll("semiotic-desc", `${idPrefix}-desc`)
    .replaceAll('id="data-area"', `id="${idPrefix}-data-area"`)
    .replaceAll('id="grid"', `id="${idPrefix}-grid"`)
    .replaceAll('id="axes"', `id="${idPrefix}-axes"`)
    .replaceAll('id="chart-title"', `id="${idPrefix}-chart-title"`)
}

function card(
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  subtitle: string,
  body: string,
  footer?: string
) {
  return `
    <g transform="translate(${x},${y})">
      <rect width="${w}" height="${h}" rx="6" fill="${CURRENT_COLORS.panel}" stroke="${CURRENT_COLORS.border}" />
      <text x="20" y="28" font-size="17" font-weight="700" fill="${CURRENT_COLORS.text}">${escapeXml(title)}</text>
      <text x="20" y="49" font-size="11" fill="${CURRENT_COLORS.muted}">${escapeXml(subtitle)}</text>
      <g transform="translate(12,62)">${body}</g>
      ${footer ? `<text x="20" y="${h - 16}" font-size="10" fill="${CURRENT_COLORS.muted}">${escapeXml(footer)}</text>` : ""}
    </g>`
}

function kpi(x: number, label: string, value: string, color: string) {
  return `
    <g transform="translate(${x},0)">
      <text y="0" font-size="24" font-weight="700" fill="${color}">${escapeXml(value)}</text>
      <text y="17" font-size="10" fill="${CURRENT_COLORS.muted}">${escapeXml(label)}</text>
    </g>`
}

function docsLegend() {
  const columns = 6
  const columnWidth = 88
  return DOC_CATEGORIES.map((category, index) => {
    const x = (index % columns) * columnWidth
    const y = Math.floor(index / columns) * 15
    return `
      <g transform="translate(${x},${y})">
        <rect width="8" height="8" rx="1.5" fill="${DOC_CATEGORY_COLORS[category]}" />
        <text x="12" y="7.5" font-size="8" fill="${CURRENT_COLORS.muted}">${escapeXml(category)}</text>
      </g>`
  }).join("")
}

function buildData() {
  const version = currentVersion()
  const currentId = version
  const releaseIds = [...RELEASE_TAGS, currentId]
  const releaseRows = releaseIds.map((id, index) => {
    const label = id.replace(/^v/, "")
    return {
      id,
      label,
      short: label.replace(/^3\./, ""),
      date: id.startsWith("v") ? tagDate(id) : currentReleaseDate(version),
      index,
      charts: schemaCount(id),
      exports: exportCount(id)
    }
  })

  const capabilityRows = releaseIds.flatMap((id, index) => {
    const caps = capabilities(id)
    if (!caps) return []
    const vals = Object.values(caps.charts)
    const metrics = [
      ["SSR renderable", vals.filter((d) => d.supportsSSR).length],
      ["Push capable", vals.filter((d) => d.supportsPush).length],
      ["Linked hover", vals.filter((d) => d.supportsLinkedHover).length],
      ["Selection", vals.filter((d) => d.supportsSelection).length]
    ] as const
    return metrics.map(([metric, value]) => ({
      index,
      release: id.replace(/^v/, ""),
      metric,
      value
    }))
  })

  const currentCaps = capabilities(currentId)
  if (!currentCaps) throw new Error("Missing current ai/capabilities.json")
  const capValues = Object.values(currentCaps.charts)
  const familyRows = Object.entries(
    capValues.reduce<
      Record<
        string,
        { family: string; total: number; ssr: number; push: number }
      >
    >((acc, chart) => {
      acc[chart.category] ??= {
        family: chart.category,
        total: 0,
        ssr: 0,
        push: 0
      }
      acc[chart.category].total += 1
      if (chart.supportsSSR) acc[chart.category].ssr += 1
      if (chart.supportsPush) acc[chart.category].push += 1
      return acc
    }, {})
  )
    .map(([, row]) => row)
    .sort(
      (a, b) =>
        ["xy", "ordinal", "network", "geo", "realtime", "value"].indexOf(
          a.family
        ) -
        ["xy", "ordinal", "network", "geo", "realtime", "value"].indexOf(
          b.family
        )
    )

  const docsCategoryRows = releaseRows.flatMap((row) => {
    const counts = docsCategoryCounts(row.id)
    return DOC_CATEGORIES.map((category) => ({
      index: row.index,
      release: row.short,
      category,
      count: counts[category] ?? 0
    }))
  })

  return {
    version,
    releaseRows,
    capabilityRows,
    familyRows,
    docsCategoryRows,
    bundleRows: currentBundleRows()
  }
}

function buildDashboard() {
  const {
    version,
    releaseRows,
    capabilityRows,
    familyRows,
    docsCategoryRows,
    bundleRows
  } = buildData()
  const latest = releaseRows[releaseRows.length - 1]
  const first = releaseRows[0]
  const capsLatest = capabilities(version)!
  const currentCapValues = Object.values(capsLatest.charts)

  const chartGrowthData = releaseRows.flatMap((row) => [
    {
      index: row.index,
      release: row.short,
      metric: "Charts",
      value: row.charts
    },
    {
      index: row.index,
      release: row.short,
      metric: "Public exports",
      value: row.exports
    }
  ])
  const chartGrowth = chartSvg("LineChart", "catalog-growth", {
    data: chartGrowthData,
    xAccessor: "index",
    yAccessor: "value",
    lineBy: "metric",
    colorBy: "metric",
    width: 356,
    height: 230,
    margin: { top: 14, right: 24, bottom: 44, left: 42 },
    description:
      "Line chart showing chart catalog and public export growth since 3.0.0.",
    showLegend: true
  })

  const bundleChart = chartSvg("BarChart", "bundle-budget", {
    data: bundleRows
      .filter((d) => !["semiotic/ai", "semiotic"].includes(d.importPath))
      .sort((a, b) => b.kb - a.kb),
    categoryAccessor: "importPath",
    valueAccessor: "kb",
    orientation: "horizontal",
    width: 356,
    height: 230,
    margin: { top: 10, right: 20, bottom: 34, left: 104 },
    description:
      "Current production bundle sizes generated from dist artifacts."
  })

  const capabilityChart = chartSvg("LineChart", "capability-surface", {
    data: capabilityRows,
    xAccessor: "index",
    yAccessor: "value",
    lineBy: "metric",
    colorBy: "metric",
    width: 356,
    height: 230,
    margin: { top: 14, right: 24, bottom: 44, left: 42 },
    description:
      "Line chart showing SSR, push, linked hover, and selection coverage since the capability matrix shipped.",
    showLegend: true
  })

  const familyChart = chartSvg("StackedBarChart", "family-render-path", {
    data: familyRows.flatMap((row) => [
      { family: row.family, layer: "SSR", value: row.ssr },
      {
        family: row.family,
        layer: "Browser/live",
        value: Math.max(0, row.total - row.ssr)
      }
    ]),
    categoryAccessor: "family",
    valueAccessor: "value",
    stackBy: "layer",
    colorBy: "layer",
    width: 544,
    height: 250,
    margin: { top: 14, right: 22, bottom: 42, left: 42 },
    description:
      "Stacked bars comparing SSR-renderable and browser/live chart counts by family.",
    showLegend: true
  })

  const docsGrowthChart = chartSvg("StackedAreaChart", "docs-growth", {
    data: docsCategoryRows,
    xAccessor: "index",
    yAccessor: "count",
    areaBy: "category",
    colorBy: "category",
    colorScheme: DOC_CATEGORIES.map((category) => DOC_CATEGORY_COLORS[category]),
    width: 544,
    height: 218,
    margin: { top: 14, right: 26, bottom: 36, left: 42 },
    description:
      "Stacked area chart showing cumulative routed documentation pages by category across release snapshots."
  })
  const docsGrowthPanel = `${docsGrowthChart}<g transform="translate(42,226)">${docsLegend()}</g>`

  const fullBundle = bundleRows.find((d) => d.importPath === "semiotic")!
  const aiBundle = bundleRows.find((d) => d.importPath === "semiotic/ai")!
  const serverBundle = bundleRows.find(
    (d) => d.importPath === "semiotic/server"
  )!
  const ssrCount = currentCapValues.filter((d) => d.supportsSSR).length
  const pushCount = currentCapValues.filter((d) => d.supportsPush).length
  const linkedCount = currentCapValues.filter(
    (d) => d.supportsLinkedHover
  ).length
  const selectionCount = currentCapValues.filter(
    (d) => d.supportsSelection
  ).length

  const width = 1200
  const height = 830
  const kpiTop = 40
  const cardTop = 84
  const gap = 18
  const topW = 376
  const topH = 330
  const bottomW = 573
  const bottomH = 250 + 104

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" style="font-family:'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif">
  <title id="title">Semiotic release dashboard</title>
  <desc id="desc">A server-rendered dashboard showing Semiotic's chart catalog, bundle sizes, capability coverage, chart families, and documentation surface growth since version 3.0.0.</desc>
  <rect width="${width}" height="${height}" fill="${CURRENT_COLORS.bg}" />
  <g transform="translate(34,${kpiTop})">
    ${kpi(0, "schema-backed charts", String(latest.charts), CURRENT_COLORS.blue)}
    ${kpi(158, "SSR renderable", String(ssrCount), CURRENT_COLORS.teal)}
    ${kpi(292, "push capable", String(pushCount), CURRENT_COLORS.purple)}
    ${kpi(421, "linked hover", String(linkedCount), CURRENT_COLORS.magenta)}
    ${kpi(556, "selection-aware", String(selectionCount), CURRENT_COLORS.green)}
    ${kpi(710, "full bundle", `${fullBundle.kb}KB`, CURRENT_COLORS.orange)}
    ${kpi(836, "AI bundle", `${aiBundle.kb}KB`, CURRENT_COLORS.red)}
    ${kpi(958, "server bundle", `${serverBundle.kb}KB`, CURRENT_COLORS.cyan)}
  </g>
  ${card(24, cardTop, topW, topH, "Catalog growth", `${first.charts} charts in ${first.label} → ${latest.charts} in ${latest.label}`, chartGrowth, "AI schema count + public package exports, read from release artifacts")}
  ${card(24 + topW + gap, cardTop, topW, topH, "Bundle budget", "Subpath imports keep production payloads intentional", bundleChart, "Measured from current production dist with gzip -9")}
  ${card(24 + (topW + gap) * 2, cardTop, topW, topH, "Capability surface", "SSR, push, hover, and selection coverage stay explicit", capabilityChart, "Capability matrix began in 3.5.2 and is release-gated")}
  ${card(24, cardTop + topH + gap, bottomW, bottomH, "Families by render path", "SSR is broad; realtime stays browser/live where that is the point", familyChart, "Stacked by SSR-renderable vs browser/live-only chart count")}
  ${card(24 + bottomW + gap, cardTop + topH + gap, bottomW, bottomH, "Docs surface growth", `${releaseRows.length} route snapshots; category moves are reflected in each release`, docsGrowthPanel)}
  <text x="34" y="${height - 24}" font-size="13" fill="${CURRENT_COLORS.muted}">Generated by <tspan font-family="ui-monospace, SFMono-Regular, Menlo, monospace">scripts/generate-readme-dashboard.tsx</tspan> with <tspan font-family="ui-monospace, SFMono-Regular, Menlo, monospace">semiotic/server</tspan> using Semiotic&apos;s Server-Side Rendering (SSR).</text>
</svg>
`
}

function dashboardBlock() {
  return [
    MARKER_START,
    '<img src="./docs/public/assets/img/semiotic-release-dashboard.svg" alt="Semiotic release dashboard showing chart count, bundle sizes, capability coverage, chart families, and documentation growth" width="100%">',
    MARKER_END
  ].join("\n")
}

function upsertBlock(text: string, block: string): string {
  const start = text.indexOf(MARKER_START)
  const end = text.indexOf(MARKER_END)
  if (start >= 0 && end > start) {
    return `${text.slice(0, start)}${block}${text.slice(end + MARKER_END.length)}`
  }
  const anchor = "## What's New"
  const index = text.indexOf(anchor)
  if (index === -1) throw new Error(`Could not find README anchor: ${anchor}`)
  return `${text.slice(0, index)}${block}\n\n${text.slice(index)}`
}

const svg = buildDashboard()
const block = dashboardBlock()
const readme = readFileSync(README_PATH, "utf8")
const nextReadme = upsertBlock(readme, block)
const existingSvg = existsSync(OUTPUT_PATH)
  ? readFileSync(OUTPUT_PATH, "utf8")
  : ""

if (checkOnly) {
  const failures: string[] = []
  if (readme !== nextReadme)
    failures.push("README dashboard block is missing or stale")
  if (existingSvg !== svg)
    failures.push(
      "docs/public/assets/img/semiotic-release-dashboard.svg is stale"
    )
  if (failures.length) {
    console.error("README dashboard check failed:")
    for (const failure of failures) console.error(`  - ${failure}`)
    console.error("Run: npm run docs:readme-dashboard")
    process.exit(1)
  }
  console.log("✓ README dashboard is up to date")
} else {
  writeFileSync(OUTPUT_PATH, svg)
  writeFileSync(README_PATH, nextReadme)
  console.log("✓ README dashboard generated with Semiotic SSR")
}
