#!/usr/bin/env node
/**
 * Generate the repository's current information-artifact surface inventory.
 *
 * Chart and recipe rows come from executable registries. Utility and docs rows
 * are a reviewed classification table whose referenced source files, exports,
 * and navigation routes are checked on every run.
 *
 * Usage:
 *   node scripts/generate-artifact-surface-inventory.mjs
 *   node scripts/generate-artifact-surface-inventory.mjs --check
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, extname, join, relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(SCRIPT_PATH), "..")
const DEFAULT_OUTPUT_PATH = join(ROOT, "ai/artifact-surface-inventory.json")
const CAPABILITY_REGISTRY_PATH = "src/components/ai/chartCapabilities.ts"
const NAVIGATION_PATH = "docs/src/components/navData.js"

export const ARTIFACT_RELATIONS = Object.freeze([
  {
    id: "claim-support",
    question: "What evidence and transformations support each claim?"
  },
  {
    id: "representation-fit",
    question: "Why is this representation suitable for the data and task?"
  },
  {
    id: "reception",
    question: "How can each intended reader or system receive the meaning?"
  },
  {
    id: "time",
    question: "What time, freshness, completeness, and revision state applies?"
  },
  {
    id: "challenge-and-correction",
    question: "How can a claim be questioned, corrected, or superseded?"
  },
  {
    id: "accountability",
    question: "Who authored, reviewed, generated, or acted on the artifact?"
  },
  {
    id: "abstention",
    question: "What must remain unknown, conditional, delayed, or refused?"
  },
  {
    id: "preservation",
    question: "What meaning must survive serialization, export, and reuse?"
  }
])

const RELATION_IDS = ARTIFACT_RELATIONS.map(({ id }) => id)
const VALID_ACTIONS = new Set([
  "keep",
  "wrap",
  "merge",
  "deprecate",
  "investigate"
])

// Keep the reviewed inventory compact enough for the repository's source-file
// size gate while retaining one complete classification per line.
/* prettier-ignore */
const UTILITY_ROWS = [
  ["artifact-inspector", "src/components/artifact/ArtifactInspector.tsx", "inspection", "Presents status, time, claims, evidence, corrections, alternatives, policy, and manual-review signals through accessible disclosure.", "reception-projections", "keep", ["claim-support", "representation-fit", "reception", "time", "challenge-and-correction", "accountability", "abstention", "preservation"]],
  ["chart-capabilities", "src/components/ai/chartCapabilities.ts", "selection", "Registry of chart fit, intent scores, variants, and caveats.", "purpose-and-form", "keep", ["representation-fit", "abstention"]],
  ["chart-suggestions", "src/components/ai/suggestCharts.ts", "selection", "Ranks built-in charts and recipes for profiled data and reader needs.", "purpose-and-form", "wrap", ["representation-fit", "reception", "abstention"]],
  ["recipe-contracts", "src/components/ai/chartRecipes.ts", "selection", "Defines portable custom-chart semantics, layout references, access, and audit metadata.", "form-and-preservation", "keep", ["claim-support", "representation-fit", "reception", "abstention", "preservation"]],
  ["intent-manifest", "src/components/ai/intentManifest.ts", "compatibility", "Packages purpose, audience, form rationale, access, and provenance for review.", "purpose-compatibility-adapter", "wrap", ["representation-fit", "reception", "accountability", "preservation"]],
  ["audience-profile", "src/components/ai/audienceProfile.ts", "policy", "Expresses reader familiarity, learning targets, and reception modality.", "reception", "merge", ["reception", "abstention"]],
  ["accessibility-audit", "src/components/charts/shared/auditAccessibility.ts", "audit", "Checks perceivability, operability, descriptions, navigation, and manual access work.", "reception-evaluation", "merge", ["reception", "abstention"]],
  ["chart-access-contract", "src/components/access/chartAccessContract.ts", "access", "Builds a versioned account of text, keyboard, navigation, preferences, stream state, and SSR access.", "reception", "merge", ["reception", "time", "preservation"]],
  ["data-audit", "src/components/data/auditData.ts", "audit", "Checks numeric inputs, domains, normalization, and chart-specific data assumptions.", "evidence-evaluation", "merge", ["claim-support", "representation-fit", "abstention"]],
  ["visual-hierarchy-audit", "src/components/ai/auditVisualHierarchy.ts", "audit", "Checks emphasis hierarchy against declared communicative priorities.", "form-evaluation", "merge", ["claim-support", "representation-fit", "abstention"]],
  ["semantic-viability", "src/components/ai/semanticViability.ts", "audit", "Detects rendered scenes that contain marks but cannot carry the intended meaning.", "form-evaluation", "merge", ["representation-fit", "abstention"]],
  ["observed-scene-audit", "src/components/ai/observedSceneAudit.ts", "audit", "Compares declared recipe semantics with the scene that was actually produced.", "form-evaluation", "merge", ["claim-support", "representation-fit", "reception", "abstention"]],
  ["chart-evaluation", "src/components/ai/evaluateChart.ts", "evaluation", "Composes validation, data, deception, access, and optional render evidence.", "artifact-evaluation", "wrap", ["claim-support", "representation-fit", "reception", "abstention"]],
  ["evidence-gate", "src/components/evidence/evidenceGate.ts", "evaluation", "Applies a small deterministic pass/fail gate to collected chart evidence.", "artifact-evaluation", "keep", ["claim-support", "representation-fit", "abstention"]],
  ["chart-evidence-envelope", "src/components/evidence/chartEvidenceEnvelope.ts", "evidence", "Serializes input, transforms, render observations, access evidence, claims, audits, and limits.", "claims-and-evidence", "merge", ["claim-support", "reception", "abstention", "preservation"]],
  ["server-render-evidence", "src/components/server/renderEvidence.ts", "evidence", "Records static mark counts, domains, semantic status, annotations, and accessible naming.", "claims-and-evidence", "keep", ["claim-support", "representation-fit", "reception", "preservation"]],
  ["chart-description", "src/components/ai/describeChart.ts", "grounding", "Generates layered descriptions of encoding, statistics, patterns, and communicative act.", "reception-projections", "wrap", ["claim-support", "reception", "abstention"]],
  ["navigation-tree", "src/components/ai/navigationTree.ts", "grounding", "Builds a deterministic semantic navigation tree for chart structure and values.", "reception-projections", "keep", ["reception", "preservation"]],
  ["reader-grounding", "src/components/ai/readerGrounding.ts", "grounding", "Packages descriptions, structure, facts, and intent for non-pixel readers.", "reception-projections", "wrap", ["claim-support", "reception", "abstention", "preservation"]],
  ["annotation-provenance", "src/components/ai/annotationProvenance.ts", "provenance", "Tracks annotation authorship, basis, data version, freshness, editorial status, and supersession.", "accountability-and-correction", "merge", ["claim-support", "time", "challenge-and-correction", "accountability"]],
  ["lifecycle-bands", "src/components/realtime/lifecycleBands.ts", "temporal", "Classifies age into deterministic freshness bands.", "time-and-revision", "keep", ["time", "abstention"]],
  ["conversation-arc", "src/components/ai/conversationArc.ts", "provenance", "Records suggestion, edit, review, export, and annotation-status events with pluggable sinks.", "accountability-history", "wrap", ["challenge-and-correction", "accountability", "preservation"]],
  ["conversation-arc-types", "src/components/ai/conversationArcTypes.ts", "provenance", "Defines the event vocabulary used by the conversation history.", "accountability-history", "merge", ["challenge-and-correction", "accountability", "preservation"]],
  ["chart-config-serialization", "src/components/export/chartConfig.ts", "serialization", "Converts chart components and props to JSON, URLs, clipboard text, and JSX.", "preservation", "keep", ["preservation", "abstention"]],
  ["portable-metadata-spec", "src/components/data/portability/spec.ts", "serialization", "Defines library-neutral capability, audience, and annotation metadata.", "compatibility-adapters", "wrap", ["reception", "accountability", "preservation"]],
  ["vega-lite-portability", "src/components/data/portability/vegaLite.ts", "serialization", "Carries portable metadata through supported Vega-Lite round trips.", "compatibility-adapters", "wrap", ["claim-support", "reception", "accountability", "preservation", "abstention"]],
  ["aesthetic-evaluation", "src/components/ai/evaluateAesthetics.ts", "policy", "Measures design evidence and applies separately declared organizational weights.", "form-policy", "wrap", ["representation-fit", "reception", "abstention"]],
  ["data-quality-bridge", "src/components/ai/dataQualityBridge.ts", "evidence", "Translates external quality results into placed or unplaced chart findings.", "claims-and-evidence", "wrap", ["claim-support", "time", "accountability", "abstention"]],
  ["data-pitfalls-bridge", "src/components/ai/dataPitfallsBridge.ts", "audit", "Combines external artifact critique with local chart, data, and access checks.", "artifact-evaluation", "investigate", ["claim-support", "representation-fit", "reception", "abstention"]],
  ["generative-chart-loop", "src/components/ai/generativeChart.ts", "evaluation", "Runs deterministic generate, validate, diagnose, repair, and render-evidence stages.", "artifact-evaluation", "wrap", ["claim-support", "representation-fit", "reception", "abstention", "preservation"]],
  ["chart-repair", "src/components/ai/repairChartConfig.ts", "evaluation", "Produces bounded repairs or explicit refusals for invalid chart configurations.", "artifact-evaluation", "keep", ["representation-fit", "abstention", "preservation"]],
  ["selection-provenance", "src/components/store/selectionProvenance.ts", "provenance", "Associates coordinated-view selections with their source chart and interaction.", "accountability-history", "merge", ["accountability", "preservation"]]
]

const UTILITY_GROUPS = Object.freeze(
  UTILITY_ROWS.map(
    ([id, source, category, currentRole, futureHome, action, relations]) => ({
      id,
      source,
      category,
      currentRole,
      futureHome,
      action,
      relations
    })
  )
)

/* prettier-ignore */
const DOCUMENTATION_ROWS = [
  ["/artifacts/overview", "docs/src/pages/artifacts/ArtifactContractsOverviewPage.jsx", "Contract workflow and reusable progressive-disclosure inspector.", "Artifact Contracts / Overview", "keep", ["claim-support", "representation-fit", "reception", "time", "challenge-and-correction", "accountability", "abstention", "preservation"]],
  ["/intelligence/suggestions", "docs/src/pages/features/SuggestionsPage.jsx", "Chart selection by data shape, purpose, scale, and reader needs.", "Artifact Contracts / Purpose and form", "link", ["representation-fit", "reception", "abstention"]],
  ["/accessibility/audit", "docs/src/pages/accessibility/AccessibilityAuditPage.jsx", "Static access checks and explicit manual-review boundaries.", "Artifact Contracts / Reception", "link", ["reception", "abstention"]],
  ["/accessibility/descriptions", "docs/src/pages/accessibility/DescribeChartPage.jsx", "Layered chart descriptions and communicative acts.", "Artifact Contracts / Reception", "link", ["claim-support", "reception"]],
  ["/accessibility/navigation", "docs/src/pages/accessibility/NavigationTreePage.jsx", "Structured non-visual navigation through chart content.", "Artifact Contracts / Reception", "link", ["reception", "preservation"]],
  ["/intelligence/reader-grounding", "docs/src/pages/features/ReaderGroundingPage.jsx", "Agent-readable descriptions, facts, intent, and structure.", "Artifact Contracts / Reception projections", "link", ["claim-support", "reception", "abstention", "preservation"]],
  ["/intelligence/temporal-lifecycle", "docs/src/pages/features/TemporalLifecyclePage.jsx", "Freshness and editorial lifecycle for annotations.", "Artifact Contracts / Time and correction", "merge", ["time", "challenge-and-correction", "accountability"]],
  ["/annotations/provenance-lifecycle", "docs/src/pages/features/AnnotationProvenancePage.jsx", "Annotation authorship, evidence basis, status, and supersession.", "Artifact Contracts / Accountability and correction", "merge", ["claim-support", "time", "challenge-and-correction", "accountability"]],
  ["/intelligence/serialization", "docs/src/pages/features/SerializationPage.jsx", "Chart configuration serialization, sharing, and reconstruction.", "Artifact Contracts / Preservation", "extend", ["preservation", "abstention"]],
  ["/interoperability/portability-spec", "docs/src/pages/features/PortabilitySpecPage.jsx", "Portable capability, audience, and provenance metadata.", "Artifact Contracts / Compatibility", "bridge", ["reception", "accountability", "preservation"]],
  ["/interoperability/data-quality-bridge", "docs/src/pages/features/DataQualityBridgePage.jsx", "External data-quality findings attached to chart interpretation.", "Artifact Contracts / Claims and evidence", "link", ["claim-support", "time", "accountability", "abstention"]],
  ["/interoperability/generative-ui", "docs/src/pages/features/GenerativeUIPage.jsx", "Validated generation, repair, refusal, and render proof.", "Artifact Contracts / Evaluation", "link", ["claim-support", "representation-fit", "reception", "abstention", "preservation"]],
  ["/examples/what-the-machine-sees", "docs/src/pages/examples/WhatTheMachineSeesExamplePage.jsx", "End-to-end local selection, description, access audit, navigation, and recipe inspection.", "Artifact Contracts / Inspector example", "upgrade", ["representation-fit", "reception", "abstention", "preservation"]]
]

const DOCUMENTATION_SURFACES = Object.freeze(
  DOCUMENTATION_ROWS.map(
    ([route, source, currentRole, futurePlacement, action, relations]) => ({
      route,
      source,
      currentRole,
      futurePlacement,
      action,
      relations
    })
  )
)

function read(root, source) {
  return readFileSync(join(root, source), "utf8")
}

function scriptKind(filePath) {
  const extension = extname(filePath)
  if (extension === ".tsx") return ts.ScriptKind.TSX
  if (extension === ".jsx") return ts.ScriptKind.JSX
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

function parse(root, source) {
  const filePath = join(root, source)
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath)
  )
}

function unwrap(node) {
  let current = node
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression(current))
  ) {
    current = current.expression
  }
  return current
}

function nodeName(node) {
  if (!node) return undefined
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text
  }
  return undefined
}

function objectProperties(node) {
  const object = unwrap(node)
  const result = new Map()
  if (!object || !ts.isObjectLiteralExpression(object)) return result
  for (const property of object.properties) {
    const name = nodeName(property.name)
    if (!name) continue
    if (ts.isPropertyAssignment(property))
      result.set(name, unwrap(property.initializer))
    else result.set(name, property)
  }
  return result
}

function topLevelStringConstants(sourceFile) {
  const constants = new Map()
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      const value = unwrap(declaration.initializer)
      if (
        value &&
        (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
      ) {
        constants.set(declaration.name.text, value.text)
      }
    }
  }
  return constants
}

function stringValue(node, constants = new Map()) {
  const value = unwrap(node)
  if (!value) return undefined
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
    return value.text
  if (ts.isIdentifier(value)) return constants.get(value.text)
  return undefined
}

function findVariable(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name)
        return declaration
    }
  }
  return undefined
}

function arrayIdentifiers(node) {
  const array = unwrap(node)
  if (!array || !ts.isArrayLiteralExpression(array)) return []
  return array.elements
    .map((element) => unwrap(element))
    .filter(ts.isIdentifier)
    .map((element) => element.text)
}

function resolveImportSource(root, registrySource, modulePath) {
  const base = resolve(root, dirname(registrySource), modulePath)
  for (const suffix of [".ts", ".tsx", ".js", ".jsx"]) {
    if (existsSync(`${base}${suffix}`))
      return relative(root, `${base}${suffix}`)
  }
  throw new Error(`Cannot resolve ${modulePath} imported by ${registrySource}`)
}

function capabilityRelationCoverage(fields) {
  const has = (name) => fields.includes(name)
  return {
    "claim-support": {
      status: has("intentScores") ? "partial" : "not-represented",
      evidence: has("intentScores") ? ["intentScores"] : []
    },
    "representation-fit": {
      status:
        has("fits") && has("buildProps") && has("rubric")
          ? "represented"
          : "partial",
      evidence: ["fits", "buildProps", "rubric"].filter(has)
    },
    reception: {
      status: has("mobile") ? "partial" : "not-represented",
      evidence: has("mobile") ? ["mobile"] : []
    },
    time: { status: "not-represented", evidence: [] },
    "challenge-and-correction": { status: "not-represented", evidence: [] },
    accountability: { status: "not-represented", evidence: [] },
    abstention: {
      status: [
        "caveats",
        "numericContracts",
        "qualityFit",
        "semanticViability"
      ].some(has)
        ? "partial"
        : "not-represented",
      evidence: [
        "caveats",
        "numericContracts",
        "qualityFit",
        "semanticViability"
      ].filter(has)
    },
    preservation: {
      status:
        has("component") && has("importPath") ? "partial" : "not-represented",
      evidence: ["component", "importPath"].filter(has)
    }
  }
}

function recipeRelationCoverage(fields) {
  const has = (name) => fields.includes(name)
  return {
    "claim-support": {
      status:
        has("intents") || has("description") ? "partial" : "not-represented",
      evidence: ["intents", "description", "encodings"].filter(has)
    },
    "representation-fit": {
      status:
        has("dataRoles") && has("designContract") ? "represented" : "partial",
      evidence: ["dataRoles", "encodings", "designContract", "audit"].filter(
        has
      )
    },
    reception: {
      status:
        has("reception") && has("accessibility") ? "represented" : "partial",
      evidence: ["reception", "accessibility", "navigation", "mobile"].filter(
        has
      )
    },
    time: { status: "not-represented", evidence: [] },
    "challenge-and-correction": { status: "not-represented", evidence: [] },
    accountability: { status: "not-represented", evidence: [] },
    abstention: {
      status:
        has("audit") || has("caveats") || has("designContract")
          ? "represented"
          : "not-represented",
      evidence: ["audit", "caveats", "designContract"].filter(has)
    },
    preservation: {
      status:
        has("layout") && has("layoutConfigSchema") ? "represented" : "partial",
      evidence: [
        "portability",
        "layout",
        "layoutConfigSchema",
        "version"
      ].filter(has)
    }
  }
}

// The source-analysis functions stay compact to keep this standalone generator
// within the repository's production source limit.
// prettier-ignore
export function loadRegisteredChartCapabilities({ root = ROOT } = {}) {
  const registry = parse(root, CAPABILITY_REGISTRY_PATH)
  const imports = new Map()
  for (const statement of registry.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      imports.set(element.name.text, {
        importedName: element.propertyName?.text ?? element.name.text,
        source: resolveImportSource(root, CAPABILITY_REGISTRY_PATH, statement.moduleSpecifier.text)
      })
    }
  }

  const registryDeclaration = findVariable(registry, "BUILT_IN_CAPABILITIES")
  const names = arrayIdentifiers(registryDeclaration?.initializer)
  if (!names.length) throw new Error("BUILT_IN_CAPABILITIES is empty or unreadable")
  const navSource = read(root, NAVIGATION_PATH)

  const capabilities = names.map((registryName) => {
    const imported = imports.get(registryName)
    if (!imported) throw new Error(`Cannot resolve capability ${registryName}`)
    const sourceFile = parse(root, imported.source)
    const constants = topLevelStringConstants(sourceFile)
    const declaration = findVariable(sourceFile, imported.importedName)
    const properties = objectProperties(declaration?.initializer)
    const component = stringValue(properties.get("component"), constants)
    const family = stringValue(properties.get("family"), constants)
    const importPath = stringValue(properties.get("importPath"), constants)
    if (!component || !family || !importPath) {
      throw new Error(`${registryName} must declare literal component, family, and importPath fields`)
    }
    const fields = [...properties.keys()].sort()
    const intentScores = [...objectProperties(properties.get("intentScores")).keys()].sort()
    const variantsNode = unwrap(properties.get("variants"))
    const variantCount = variantsNode && ts.isArrayLiteralExpression(variantsNode) ? variantsNode.elements.length : 0
    const slug = component.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
    const docsPage = `docs/src/pages/charts/${component}Page.jsx`
    const expectedRoute = `/charts/${slug}`
    const documentation = existsSync(join(root, docsPage)) && navSource.includes(`path: "${expectedRoute}"`) ? { route: expectedRoute, source: docsPage } : null

    return {
      component,
      family,
      importPath,
      source: imported.source,
      registry: CAPABILITY_REGISTRY_PATH,
      intentScores,
      variantCount,
      declaredFields: fields,
      documentation,
      relations: capabilityRelationCoverage(fields)
    }
  })

  return capabilities.sort((a, b) => a.component.localeCompare(b.component))
}

function codeFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...codeFiles(filePath))
    else if (
      /\.(?:js|jsx|ts|tsx)$/.test(entry.name) &&
      !/\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(filePath)
    }
  }
  return files.sort()
}

function callName(node) {
  const expression = unwrap(node)
  if (!expression || !ts.isCallExpression(expression)) return undefined
  const callee = unwrap(expression.expression)
  return ts.isIdentifier(callee) ? callee.text : undefined
}

// prettier-ignore
function recipeDefinitionsInFile(root, source) {
  const sourceFile = parse(root, source)
  const constants = topLevelStringConstants(sourceFile)
  const directRegistrations = new Set()
  const registryLists = new Set()
  const definitions = []

  function visit(node) {
    if (ts.isCallExpression(node) && callName(node) === "registerChartRecipe") {
      const argument = unwrap(node.arguments[0])
      if (argument && ts.isIdentifier(argument)) directRegistrations.add(argument.text)
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === "BUILT_IN_CHART_RECIPES") {
        for (const name of arrayIdentifiers(node.initializer)) registryLists.add(name)
      }
      const initializer = unwrap(node.initializer)
      if (initializer && ts.isCallExpression(initializer) && callName(initializer) === "defineChartRecipe") {
        const definition = objectProperties(initializer.arguments[0])
        definitions.push({ variable: node.name.text, definition, constants })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return definitions.map(({ variable, definition, constants: values }) => ({
    variable,
    definition,
    constants: values,
    registration: directRegistrations.has(variable) ? "direct" : registryLists.has(variable) ? "built-in-registry" : "not-registered"
  }))
}

function objectArrayField(node, field) {
  const array = unwrap(node)
  if (!array || !ts.isArrayLiteralExpression(array)) return []
  return array.elements.flatMap((element) => {
    const value = stringValue(objectProperties(element).get(field))
    return value ? [value] : []
  })
}

// prettier-ignore
export function discoverRegisteredRecipes({ root = ROOT } = {}) {
  const roots = [join(root, "src/components"), join(root, "docs/src")]
  const definitions = roots.flatMap((directory) =>
    codeFiles(directory).flatMap((filePath) =>
      recipeDefinitionsInFile(root, relative(root, filePath)).map((definition) => ({
        ...definition,
        source: relative(root, filePath)
      }))
    )
  )

  const recipes = definitions.flatMap(({ variable, definition, constants, registration, source }) => {
    const portability = stringValue(definition.get("portability"), constants)
    if (registration === "not-registered") return []
    const id = stringValue(definition.get("id"), constants)
    const name = stringValue(definition.get("name"), constants)
    const version = stringValue(definition.get("version"), constants)
    const frameFamily = stringValue(definition.get("frameFamily"), constants)
    if (!id || !name || !portability) {
      throw new Error(`${variable} in ${source} must declare literal id, name, and portability fields`)
    }
    const fields = [...definition.keys()].sort()
    const layout = objectProperties(definition.get("layout"))
    return [
      {
        id,
        name,
        version: version ?? null,
        frameFamily: frameFamily ?? null,
        portability,
        source,
        registration,
        layout: layout.size
          ? {
              id: stringValue(layout.get("id"), constants) ?? null,
              importPath: stringValue(layout.get("importPath"), constants) ?? null,
              exportName: stringValue(layout.get("exportName"), constants) ?? null
            }
          : null,
        intents: objectArrayField(definition.get("intents"), "id").sort(),
        documentationRoutes: objectArrayField(definition.get("examples"), "path").sort(),
        declaredFields: fields,
        relations: recipeRelationCoverage(fields)
      }
    ]
  })

  const seen = new Set()
  for (const recipe of recipes) {
    if (seen.has(recipe.id)) throw new Error(`Duplicate registered recipe id ${recipe.id}`)
    seen.add(recipe.id)
  }

  return {
    portable: recipes.filter(({ portability }) => portability === "portable").sort((a, b) => a.id.localeCompare(b.id)),
    local: recipes
      .filter(({ portability }) => portability !== "portable")
      .map(({ relations: _relations, ...recipe }) => recipe)
      .sort((a, b) => a.id.localeCompare(b.id))
  }
}

function hasExportModifier(node) {
  return Boolean(
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  )
}

// prettier-ignore
export function collectModuleExports(root, source) {
  const sourceFile = parse(root, source)
  const names = new Set()
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.add(element.name.text)
      continue
    }
    if (!hasExportModifier(statement)) continue
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) {
      if (statement.name) names.add(statement.name.text)
      continue
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
      }
    }
  }
  return [...names].sort()
}

function utilityInventory(root) {
  return UTILITY_GROUPS.map((group) => {
    const filePath = join(root, group.source)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error(`Utility inventory source is missing: ${group.source}`)
    }
    const exports = collectModuleExports(root, group.source)
    if (!exports.length)
      throw new Error(
        `Utility inventory source has no exports: ${group.source}`
      )
    return { ...group, exports }
  }).sort((a, b) => a.id.localeCompare(b.id))
}

function documentationInventory(root) {
  const navSource = read(root, NAVIGATION_PATH)
  return DOCUMENTATION_SURFACES.map((surface) => {
    if (!existsSync(join(root, surface.source))) {
      throw new Error(
        `Documentation inventory source is missing: ${surface.source}`
      )
    }
    if (!navSource.includes(`path: "${surface.route}"`)) {
      throw new Error(
        `Documentation route is not present in navData: ${surface.route}`
      )
    }
    return surface
  }).sort((a, b) => a.route.localeCompare(b.route))
}

function relationCoverageSummary(items) {
  return Object.fromEntries(
    RELATION_IDS.map((relation) => [
      relation,
      {
        represented: items.filter(
          (item) => item.relations[relation]?.status === "represented"
        ).length,
        partial: items.filter(
          (item) => item.relations[relation]?.status === "partial"
        ).length,
        notRepresented: items.filter(
          (item) => item.relations[relation]?.status === "not-represented"
        ).length
      }
    ])
  )
}

// prettier-ignore
export function validateArtifactSurfaceInventory(inventory) {
  const errors = []
  const expectedRelations = [...RELATION_IDS].sort()
  const inventoryRelations = inventory.relations?.map(({ id }) => id).sort() ?? []
  if (JSON.stringify(inventoryRelations) !== JSON.stringify(expectedRelations)) {
    errors.push("Relation inventory does not match the required relation set")
  }

  const capabilities = inventory.capabilities ?? []
  const recipes = inventory.recipes?.portable ?? []
  const unique = (values) => new Set(values).size === values.length
  if (!capabilities.length) errors.push("No registered chart capabilities were found")
  if (!recipes.length) errors.push("No portable recipes were found")
  if (!unique(capabilities.map(({ component }) => component))) errors.push("Chart capability ids are not unique")
  if (!unique(recipes.map(({ id }) => id))) errors.push("Portable recipe ids are not unique")

  for (const item of [...capabilities, ...recipes]) {
    const relations = Object.keys(item.relations ?? {}).sort()
    if (JSON.stringify(relations) !== JSON.stringify(expectedRelations)) {
      errors.push(`${item.component ?? item.id} does not cover every relation`)
    }
  }
  for (const recipe of recipes) {
    if (recipe.portability !== "portable") errors.push(`${recipe.id} is not portable`)
    if (recipe.registration === "not-registered") errors.push(`${recipe.id} is not registered`)
  }
  for (const utility of inventory.utilities ?? []) {
    if (!VALID_ACTIONS.has(utility.action)) errors.push(`${utility.id} has invalid action ${utility.action}`)
    if (!utility.futureHome) errors.push(`${utility.id} has no future home`)
    if (!utility.exports?.length) errors.push(`${utility.id} has no recorded exports`)
    for (const relation of utility.relations ?? []) {
      if (!RELATION_IDS.includes(relation)) errors.push(`${utility.id} has unknown relation ${relation}`)
    }
  }

  const summary = inventory.summary ?? {}
  if (summary.registeredChartCapabilities !== capabilities.length) {
    errors.push("Chart capability summary count is stale")
  }
  if (summary.portableRecipes !== recipes.length) errors.push("Portable recipe summary count is stale")
  if (summary.utilityGroups !== (inventory.utilities?.length ?? 0)) errors.push("Utility summary count is stale")
  if (summary.documentationSurfaces !== (inventory.documentation?.length ?? 0)) {
    errors.push("Documentation summary count is stale")
  }
  return errors
}

export function buildArtifactSurfaceInventory({ root = ROOT } = {}) {
  const packageJson = JSON.parse(read(root, "package.json"))
  const capabilities = loadRegisteredChartCapabilities({ root })
  const recipes = discoverRegisteredRecipes({ root })
  const utilities = utilityInventory(root)
  const documentation = documentationInventory(root)
  const sources = [
    "package.json",
    CAPABILITY_REGISTRY_PATH,
    NAVIGATION_PATH,
    "scripts/generate-artifact-surface-inventory.mjs",
    ...capabilities.map(({ source }) => source),
    ...recipes.portable.map(({ source }) => source),
    ...recipes.local.map(({ source }) => source),
    ...utilities.map(({ source }) => source),
    ...documentation.map(({ source }) => source)
  ]
  const inventory = {
    __generated: true,
    __source: [...new Set(sources)].sort(),
    inventoryVersion: 1,
    repositoryVersion: packageJson.version,
    relations: ARTIFACT_RELATIONS,
    summary: {
      registeredChartCapabilities: capabilities.length,
      portableRecipes: recipes.portable.length,
      registeredLocalRecipes: recipes.local.length,
      utilityGroups: utilities.length,
      documentationSurfaces: documentation.length
    },
    coverage: {
      chartCapabilities: relationCoverageSummary(capabilities),
      portableRecipes: relationCoverageSummary(recipes.portable)
    },
    capabilities,
    recipes,
    utilities,
    documentation,
    baselineLimits: [
      "Capability intent scores indicate task fit but do not declare claims or evidence.",
      "Portable recipes cover form, access, and preservation well but do not yet carry time, correction, or accountability records.",
      "Existing utilities are distributed across several entry points and do not share one evaluation result.",
      "A represented field means metadata exists; it is not a correctness or safety certificate."
    ]
  }
  const errors = validateArtifactSurfaceInventory(inventory)
  if (errors.length)
    throw new Error(
      `Invalid artifact surface inventory:\n- ${errors.join("\n- ")}`
    )
  return inventory
}

export function renderArtifactSurfaceInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`
}

export function checkArtifactSurfaceInventory({
  root = ROOT,
  outputPath = DEFAULT_OUTPUT_PATH
} = {}) {
  const expected = renderArtifactSurfaceInventory(
    buildArtifactSurfaceInventory({ root })
  )
  const actual = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : ""
  return {
    ok: actual === expected,
    expected,
    actual,
    outputPath
  }
}

function run() {
  const args = process.argv.slice(2)
  const unknown = args.filter((argument) => argument !== "--check")
  if (unknown.length)
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`)

  const result = checkArtifactSurfaceInventory()
  if (args.includes("--check")) {
    if (!result.ok) {
      console.error(
        "Artifact surface inventory is stale. Run: node scripts/generate-artifact-surface-inventory.mjs"
      )
      process.exitCode = 1
      return
    }
    console.log("Artifact surface inventory is current.")
    return
  }

  writeFileSync(result.outputPath, result.expected)
  const inventory = JSON.parse(result.expected)
  console.log(`Wrote ${relative(ROOT, result.outputPath)}`)
  console.log(
    `${inventory.summary.registeredChartCapabilities} chart capabilities; ${inventory.summary.portableRecipes} portable recipes; ${inventory.summary.utilityGroups} utility groups`
  )
}

if (resolve(process.argv[1] ?? "") === SCRIPT_PATH) {
  try {
    run()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
