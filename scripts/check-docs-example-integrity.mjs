#!/usr/bin/env node
/* global console */
/**
 * Validates the docs examples as a coherent public surface.
 *
 * The examples manifest is deliberately the canonical list for cards and
 * previous/next navigation. This gate catches the remaining hand-maintained
 * registries drifting away from it before a broken card, preview, source view,
 * architecture selector, or internal example link reaches the docs site.
 */

import { Buffer } from "node:buffer"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, extname, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"])
const DYNAMIC_PAGE_TITLES = new Set(["/examples/paris-isometric-landmarks"])

export async function validateDocsExampleIntegrity({ root = ROOT } = {}) {
  const paths = resolvePaths(root)
  const failures = []
  const { EXAMPLES: examples = [], EXAMPLE_FILTERS: filters = {} } = await loadManifest(
    paths.examplesManifest,
  )
  const definitionModule = await loadManifest(paths.exampleDefinitions)
  const exampleDefinitions = definitionModule.EXAMPLE_DEFINITIONS ?? []

  validateManifest(failures, examples, filters)
  validatePilotDefinitions(failures, exampleDefinitions, definitionModule.validateExampleDefinitions)

  const examplePaths = new Set(examples.map((example) => example.path))
  const appRouteEntries = collectAppExampleRoutes(read(paths.appSource))
  const legacySourceLoaderEntries = collectSourceLoaders(read(paths.sourceMap))
  const definitionSourceLoaderEntries = collectDefinitionSourceLoaders(exampleDefinitions)
  const sourceLoaderEntries = [...legacySourceLoaderEntries, ...definitionSourceLoaderEntries]
  const previewKeyEntries = collectPreviewKeys(read(paths.previews))
  const architectureProfileEntries = collectArchitectureProfilePaths(read(paths.architecture))
  const appPaths = new Set(appRouteEntries)
  const sourceLoaders = new Map(sourceLoaderEntries)
  const previewKeys = new Set(previewKeyEntries)
  const architecturePaths = new Set(architectureProfileEntries)
  const examplePageFiles = new Set(readdirSync(paths.examplesDirectory))

  validateDuplicatePaths(failures, "App routes", appRouteEntries)
  validateDuplicatePaths(
    failures,
    "raw source loaders",
    sourceLoaderEntries.map(([path]) => path),
  )
  validateDuplicatePaths(failures, "preview renderers", previewKeyEntries)
  validateDuplicatePaths(failures, "architecture profiles", architectureProfileEntries)

  comparePathSets(failures, "App routes", appPaths, examplePaths)
  comparePathSets(failures, "raw source loaders", new Set(sourceLoaders.keys()), examplePaths)
  comparePathSets(failures, "architecture profiles", architecturePaths, examplePaths)

  for (const example of examples) {
    if (!previewKeys.has(example.preview)) {
      failures.push(`Example ${example.path} has no explicit preview renderer for "${example.preview}"`)
    }

    const sourceFile = sourceLoaders.get(example.path)
    if (!sourceFile) continue
    const sourcePath = resolve(paths.examplesDirectory, sourceFile)
    if (!examplePageFiles.has(sourceFile) || !existsSync(sourcePath)) {
      failures.push(
        `Example ${example.path} source loader points to missing or case-mismatched ${sourceFile}`,
      )
      continue
    }

    const pageTitle = readStaticExamplePageTitle(read(sourcePath))
    if (!pageTitle && !DYNAMIC_PAGE_TITLES.has(example.path)) {
      failures.push(`Example ${example.path} has no static ExamplePageLayout title to verify`)
    } else if (pageTitle && pageTitle !== example.title) {
      failures.push(
        `Example ${example.path} title drift: manifest has "${example.title}", page has "${pageTitle}"`,
      )
    }
  }

  validateNoPrivateSourceImports(failures, paths.examplesDirectory)
  validateStaticExampleLinks(failures, paths.docsSource, examplePaths)

  return {
    ok: failures.length === 0,
    failures,
    exampleCount: examples.length,
    routeCount: appPaths.size,
    sourceLoaderCount: sourceLoaders.size,
    previewCount: previewKeys.size,
    architectureProfileCount: architecturePaths.size,
  }
}

function resolvePaths(root) {
  return {
    examplesManifest: resolve(root, "docs/src/pages/examples/examplesManifest.js"),
    exampleDefinitions: resolve(root, "docs/src/pages/examples/exampleDefinitions.js"),
    appSource: resolve(root, "docs/src/App.jsx"),
    sourceMap: resolve(root, "docs/src/pages/examples/exampleSourceMap.js"),
    previews: resolve(root, "docs/src/pages/examples/ExamplesOverviewPage.jsx"),
    architecture: resolve(root, "docs/src/pages/examples/data/semioticArchitecture.js"),
    examplesDirectory: resolve(root, "docs/src/pages/examples"),
    docsSource: resolve(root, "docs/src"),
  }
}

function validatePilotDefinitions(failures, definitions, validateDefinitions) {
  if (!Array.isArray(definitions)) {
    failures.push("Example definitions registry is not an array")
    return
  }

  if (typeof validateDefinitions === "function") {
    const result = validateDefinitions(definitions)
    if (!result?.ok) {
      for (const error of result?.errors ?? ["Example definitions registry is invalid"]) {
        failures.push(`Example definitions registry: ${error}`)
      }
    }
  }

  for (const definition of definitions.filter((definition) => definition?.isPilot)) {
    if (!definition.path || !definition.sourceFile) {
      failures.push("Pilot example definition must declare path and sourceFile")
    }
  }
}

async function loadManifest(filePath) {
  const source = read(filePath)
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
}

function validateManifest(failures, examples, filters) {
  const paths = new Set()
  const frames = new Set(filters.frames?.map((filter) => filter.id) ?? [])
  const topics = new Set(filters.topics?.map((filter) => filter.id) ?? [])

  if (examples.length === 0) failures.push("Examples manifest has no entries")

  for (const example of examples) {
    if (!example.path?.startsWith("/examples/")) {
      failures.push(`Example has an invalid path: ${String(example.path)}`)
      continue
    }
    if (paths.has(example.path)) failures.push(`Examples manifest repeats ${example.path}`)
    paths.add(example.path)

    for (const field of ["title", "eyebrow", "description", "preview"]) {
      if (typeof example[field] !== "string" || example[field].trim() === "") {
        failures.push(`Example ${example.path} has no ${field}`)
      }
    }
    validateTags(failures, example.path, "frame", example.frames, frames)
    validateTags(failures, example.path, "topic", example.topics, topics)
    validateDuplicateTags(failures, example.path, "badge", example.badges ?? [])
  }

  for (const filter of [...(filters.frames ?? []), ...(filters.topics ?? [])]) {
    if (!filter?.id || !filter?.label) failures.push("Example filter metadata has an empty id or label")
  }

  for (const frame of frames) {
    if (!examples.some((example) => example.frames?.includes(frame))) {
      failures.push(`Example frame filter "${frame}" is stale because no example uses it`)
    }
  }
  for (const topic of topics) {
    if (!examples.some((example) => example.topics?.includes(topic))) {
      failures.push(`Example topic filter "${topic}" is stale because no example uses it`)
    }
  }
}

function validateTags(failures, path, kind, values, allowed) {
  if (!Array.isArray(values) || values.length === 0) {
    failures.push(`Example ${path} has no ${kind} tags`)
    return
  }
  validateDuplicateTags(failures, path, kind, values)
  for (const value of values) {
    if (!allowed.has(value)) failures.push(`Example ${path} uses unknown ${kind} tag "${value}"`)
  }
}

function validateDuplicateTags(failures, path, kind, values) {
  const seen = new Set()
  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") {
      failures.push(`Example ${path} has an empty ${kind} tag`)
    } else if (seen.has(value)) {
      failures.push(`Example ${path} repeats ${kind} tag "${value}"`)
    }
    seen.add(value)
  }
}

function collectAppExampleRoutes(source) {
  const paths = []
  const uncommented = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  for (const match of uncommented.matchAll(/\bpath\s*=\s*["'](examples\/[^"']+)["']/g)) {
    paths.push(`/${match[1]}`)
  }
  return paths
}

function collectSourceLoaders(source) {
  const loaders = []
  const pattern = /["'](\/examples\/[^"']+)["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/([^?"']+)\?raw["']\s*\)/g
  for (const match of source.matchAll(pattern)) {
    loaders.push([match[1], match[2]])
  }
  return loaders
}

function collectDefinitionSourceLoaders(definitions) {
  return definitions
    .filter((definition) => definition?.isPilot && definition.path && definition.sourceFile)
    .map((definition) => [definition.path, definition.sourceFile])
}

function collectPreviewKeys(source) {
  const object = source.match(/const PREVIEW_COMPONENTS = \{([\s\S]*?)^\}/m)?.[1] ?? ""
  const keys = []
  for (const match of object.matchAll(/^\s{2}(?:["']([^"']+)["']|([A-Za-z_$][\w$-]*))\s*:/gm)) {
    keys.push(match[1] ?? match[2])
  }
  return keys
}

function collectArchitectureProfilePaths(source) {
  return [...source.matchAll(/\bpath:\s*["'](\/examples\/[^"']+)["']/g)].map((match) => match[1])
}

function readStaticExamplePageTitle(source) {
  return source.match(/<ExamplePageLayout\b[\s\S]*?\btitle="([^"]+)"/)?.[1]
}

function comparePathSets(failures, label, actual, expected) {
  for (const path of expected) {
    if (!actual.has(path)) failures.push(`Examples manifest path ${path} is missing from ${label}`)
  }
  for (const path of actual) {
    if (!expected.has(path)) failures.push(`${label} has an example path absent from the manifest: ${path}`)
  }
}

function validateDuplicatePaths(failures, label, paths) {
  const seen = new Set()
  for (const path of paths) {
    if (seen.has(path)) failures.push(`${label} repeats ${path}`)
    seen.add(path)
  }
}

function validateNoPrivateSourceImports(failures, directory) {
  for (const filePath of collectCodeFiles(directory)) {
    if (/\.test\.[^.]+$/.test(filePath)) continue
    const source = read(filePath)
    if (/\bfrom\s+["'][^"']*\/src\/components(?:\/|["'])/.test(source)) {
      failures.push(`Example source imports a private src/components module: ${relativeToRoot(filePath)}`)
    }
  }
}

function validateStaticExampleLinks(failures, directory, examplePaths) {
  for (const filePath of collectCodeFiles(directory)) {
    if (/\.test\.[^.]+$/.test(filePath)) continue
    const source = read(filePath)
    for (const match of source.matchAll(/\b(?:to|href)\s*=\s*["'](\/examples(?:\/[^"'#?]+)?)["']/g)) {
      const destination = match[1]
      if (destination !== "/examples" && !examplePaths.has(destination)) {
        failures.push(`Broken static example link ${destination} in ${relativeToRoot(filePath)}`)
      }
    }
  }
}

function collectCodeFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectCodeFiles(filePath))
    else if (CODE_EXTENSIONS.has(extname(entry.name))) files.push(filePath)
  }
  return files
}

function read(filePath) {
  return readFileSync(filePath, "utf8")
}

function relativeToRoot(filePath) {
  return filePath.slice(ROOT.length + 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateDocsExampleIntegrity()
  if (!result.ok) {
    console.error("Docs example integrity check failed:")
    for (const failure of result.failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log(
    `✅ docs example integrity passed (${result.exampleCount} examples, ${result.routeCount} routes, ${result.previewCount} previews, ${result.architectureProfileCount} profiles)`,
  )
}
