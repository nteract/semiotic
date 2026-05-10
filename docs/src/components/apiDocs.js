const KIND_INTERFACE = 256
const KIND_PROPERTY = 1024
const KIND_TYPE_ALIAS = 2097152

// Map components whose public component name differs from the exported
// props type. The default lookup is `${componentName}Props`; when the
// canonical interface lives under a different name, list the override
// here so `findPropsInterface` short-circuits the type-alias walk.
//
// `RealtimeHistogram` exports `RealtimeHistogramProps` as a type-alias
// pointing at the canonical `RealtimeTemporalHistogramProps` interface.
// Type-alias resolution finds the underlying interface either way, but
// the explicit entry keeps the component → interface mapping
// discoverable without walking the TypeDoc tree, and matches the
// expectation downstream fixtures/tests assert against
// (api-docs-extraction.test.js: "resolves component-specific props
// aliases" pins `propsInterface.name` to the canonical alias target).
export const COMPONENT_PROPS_NAME_MAP = {
  RealtimeHistogram: "RealtimeTemporalHistogramProps",
}

// Per-apiData index cache. The reflection index is expensive to build
// (full TypeDoc tree walk) and ApiReferencePage renders ~40 components in a
// loop; a WeakMap keyed on the apiData object lets every caller in a page
// pass share a single index without changing the public function signatures.
const _indexCache = new WeakMap()

export function buildReflectionIndex(apiData) {
  if (apiData && typeof apiData === "object") {
    const cached = _indexCache.get(apiData)
    if (cached) return cached
  }

  const byId = new Map()
  const byName = new Map()

  function visit(node) {
    if (!node || typeof node !== "object") return

    if (typeof node.id === "number") byId.set(node.id, node)
    if (node.name) {
      const existing = byName.get(node.name)
      if (existing) existing.push(node)
      else byName.set(node.name, [node])
    }

    for (const child of node.children || []) visit(child)
    for (const signature of node.signatures || []) visit(signature)
    if (node.type?.declaration) visit(node.type.declaration)
  }

  visit(apiData)
  const index = { byId, byName }
  if (apiData && typeof apiData === "object") {
    _indexCache.set(apiData, index)
  }
  return index
}

export function resolveReflection(reflection, index, seen = new Set()) {
  if (!reflection || typeof reflection !== "object") return null
  if (seen.has(reflection.id)) return reflection
  if (typeof reflection.id === "number") seen.add(reflection.id)

  const directTarget = typeof reflection.target === "number"
    ? reflection.target
    : undefined
  if (directTarget !== undefined) {
    return resolveReflection(index.byId.get(directTarget), index, seen)
  }

  const typeTarget = typeof reflection.type?.target === "number"
    ? reflection.type.target
    : undefined
  if (reflection.kind === KIND_TYPE_ALIAS && typeTarget !== undefined) {
    return resolveReflection(index.byId.get(typeTarget), index, seen)
  }

  return reflection
}

export function findPropsInterface(apiData, componentName) {
  const propsName = COMPONENT_PROPS_NAME_MAP[componentName] || `${componentName}Props`
  const index = buildReflectionIndex(apiData)
  const candidates = index.byName.get(propsName) || []
  const resolved = uniqueById(candidates.map((candidate) => resolveReflection(candidate, index)))

  return resolved.find(hasPropertyChildren)
    || resolved.find((candidate) => candidate?.kind === KIND_INTERFACE)
    || null
}

export function getComponentDocs(apiData, componentName) {
  if (!apiData) return null

  const index = buildReflectionIndex(apiData)
  const candidates = index.byName.get(componentName) || []
  const resolved = uniqueById(candidates.map((candidate) => resolveReflection(candidate, index)))

  // A reflection is useful if EITHER its comment has a summary OR at least
  // one `@example` block tag — components that document only via examples
  // (no leading summary) should still surface those examples here.
  const hasUsefulComment = (comment) =>
    Boolean(commentSummary(comment)) || blockTagTexts(comment, "@example").length > 0

  const reflection = resolved.find((candidate) => hasUsefulComment(candidate.comment))
    || resolved.find((candidate) => hasUsefulComment(candidate.signatures?.[0]?.comment))

  if (!reflection) return null

  const comment = hasUsefulComment(reflection.comment)
    ? reflection.comment
    : reflection.signatures?.[0]?.comment
  return {
    summary: commentSummary(comment),
    examples: blockTagTexts(comment, "@example").map(cleanExampleText),
    source: formatSource(reflection.sources?.[0]),
  }
}

export function extractProps(iface) {
  if (!iface?.children) return []

  return iface.children
    .filter((child) => child.kindString === "Property" || child.kind === KIND_PROPERTY)
    .map((child, sourceOrder) => {
      const description = commentSummary(child.comment)
      const defaultValue = firstBlockTagText(child.comment, "@default")
        || firstBlockTagText(child.comment, "@defaultValue")
        || defaultFromDescription(description)

      return {
        name: child.name,
        type: formatType(child.type),
        description,
        defaultValue,
        examples: blockTagTexts(child.comment, "@example").map(cleanExampleText),
        required: !child.flags?.isOptional,
        inheritedFrom: formatInheritedFrom(child.inheritedFrom),
        source: formatSource(child.sources?.[0]),
        sourceOrder,
      }
    })
    .sort((a, b) => {
      const inheritedDelta = Number(Boolean(a.inheritedFrom)) - Number(Boolean(b.inheritedFrom))
      return inheritedDelta || a.sourceOrder - b.sourceOrder
    })
}

export function formatType(type) {
  if (!type) return "unknown"

  switch (type.type) {
    case "intrinsic":
      return type.name
    case "literal":
      return JSON.stringify(type.value)
    case "union":
      return type.types.map(formatType).join(" | ")
    case "intersection":
      return type.types.map(formatType).join(" & ")
    case "reference":
      return `${type.name}${type.typeArguments ? `<${type.typeArguments.map(formatType).join(", ")}>` : ""}`
    case "array":
      return `${formatType(type.elementType)}[]`
    case "tuple":
      return `[${(type.elements || []).map(formatType).join(", ")}]`
    case "reflection":
      return formatReflectionType(type)
    case "typeOperator":
      return `${type.operator} ${formatType(type.target)}`
    case "indexedAccess":
      return `${formatType(type.objectType)}[${formatType(type.indexType)}]`
    case "query":
      return `typeof ${type.queryType?.name || "unknown"}`
    case "templateLiteral":
      return "template literal"
    default:
      return type.name || type.type || "unknown"
  }
}

export function cleanExampleText(text) {
  return String(text || "")
    .trim()
    .replace(/^```[\w-]*\n/, "")
    .replace(/\n```$/, "")
}

function hasPropertyChildren(reflection) {
  return reflection?.children?.some((child) => child.kindString === "Property" || child.kind === KIND_PROPERTY)
}

function uniqueById(reflections) {
  const seen = new Set()
  const unique = []

  for (const reflection of reflections) {
    if (!reflection) continue
    const key = typeof reflection.id === "number" ? reflection.id : reflection
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(reflection)
  }

  return unique
}

function commentSummary(comment) {
  return textParts(comment?.summary).trim()
}

function blockTagTexts(comment, tag) {
  return (comment?.blockTags || [])
    .filter((blockTag) => blockTag.tag === tag)
    .map((blockTag) => textParts(blockTag.content).trim())
    .filter(Boolean)
}

function firstBlockTagText(comment, tag) {
  return blockTagTexts(comment, tag)[0] || ""
}

function textParts(parts = []) {
  return parts.map((part) => part.text || "").join("")
}

function defaultFromDescription(description) {
  const match = description.match(/\bDefault:\s*([^.\n]+)/i)
  return match?.[1]?.trim() || ""
}

function formatInheritedFrom(inheritedFrom) {
  const name = inheritedFrom?.name || inheritedFrom?.qualifiedName || ""
  if (!name) return ""
  const separatorIndex = name.lastIndexOf(".")
  return separatorIndex === -1 ? name : name.slice(0, separatorIndex)
}

function formatSource(source) {
  if (!source?.fileName) return ""
  return source.line ? `${source.fileName}:${source.line}` : source.fileName
}

function formatReflectionType(type) {
  const declaration = type.declaration
  if (!declaration) return "object"

  if (declaration.signatures?.length) {
    return declaration.signatures.map(formatSignature).join(" | ")
  }

  if (declaration.children?.length) {
    const members = declaration.children
      .filter((child) => child.kindString === "Property" || child.kind === KIND_PROPERTY)
      .map((child) => `${child.name}${child.flags?.isOptional ? "?" : ""}: ${formatType(child.type)}`)
    return members.length ? `{ ${members.join("; ")} }` : "object"
  }

  return "object"
}

function formatSignature(signature) {
  const params = (signature.parameters || [])
    .map((param) => {
      const prefix = param.flags?.isRest ? "..." : ""
      const optional = param.flags?.isOptional ? "?" : ""
      return `${prefix}${param.name}${optional}: ${formatType(param.type)}`
    })
    .join(", ")

  return `(${params}) => ${formatType(signature.type)}`
}
