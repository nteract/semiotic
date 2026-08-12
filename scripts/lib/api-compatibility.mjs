/**
 * Pure helpers for comparing generated public declaration snapshots.
 *
 * A declaration key remains stable when its type changes. This lets the
 * compatibility gate distinguish a changed member from a newly added one.
 */

export function snapshotLines(markdown) {
  const match = String(markdown).match(/```\n([\s\S]*?)\n```/)
  if (!match) throw new Error("API snapshot has no fenced declaration block")
  return match[1].split("\n").filter(Boolean).sort()
}

export function declarationKey(line) {
  const memberMatch = line.match(
    /^(?:class-member|enum-member|interface-member)\s+(.+?)\s+=\s+/,
  )
  if (memberMatch) return `${line.split(" ", 1)[0]} ${memberMatch[1]}`

  const match = line.match(
    /^(?:class|const|enum|export|function|interface|namespace|type)\s+([^\s<(:=]+)/,
  )
  return match?.[1] ?? line
}

export function declarationsByKey(lines) {
  const declarations = new Map()
  for (const line of lines) {
    const key = declarationKey(line)
    const values = declarations.get(key) ?? []
    values.push(line)
    declarations.set(key, values)
  }
  for (const values of declarations.values()) values.sort()
  return declarations
}

function interfaceOwner(key) {
  const match = /^interface-member\s+(.+?)::/.exec(key)
  return match?.[1] ?? null
}

function isCompatibleAddition(key, lines, previous) {
  if (!key.startsWith("interface-member ")) return true
  const owner = interfaceOwner(key)
  if (owner && !previous.has(owner)) return true
  // Adding an optional interface field/method preserves assignability for
  // existing consumers. Required additions make every existing implementer
  // invalid and must be reviewed like any other breaking signature change.
  return lines.every((line) => /\s=\s+optional\s/.test(line))
}

function splitTopLevelUnion(type) {
  const values = []
  const stack = []
  const pairs = { "(": ")", "[": "]", "{": "}", "<": ">" }
  let quote = null
  let escaped = false
  let start = 0
  for (let index = 0; index < type.length; index += 1) {
    const char = type[index]
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
    else if (stack.length === 0 && char === "|") {
      values.push(type.slice(start, index).trim())
      start = index + 1
    }
  }
  values.push(type.slice(start).trim())
  return values
}

function propertyShape(line) {
  if (!/^interface-member\s+.+?::property::/.test(line)) return null
  const match = /\s=\s+(optional|required)\s+(?:protected\s+)?(?:static\s+)?(?:readonly\s+)?[^:]+:\s+(.+)$/.exec(line)
  return match ? { presence: match[1], type: match[2] } : null
}

function isTypeWidening(previousType, currentType) {
  if (previousType === currentType) return true
  const previousTerms = new Set(splitTopLevelUnion(previousType))
  const currentTerms = new Set(splitTopLevelUnion(currentType))
  return [...previousTerms].every((term) => currentTerms.has(term))
}

function isCallbackTrailingArgumentAddition(previousType, currentType) {
  const callback = /^\(\((.*)\) => (.+)\) \| undefined$/
  const previous = callback.exec(previousType)
  const current = callback.exec(currentType)
  if (!previous || !current || previous[2] !== current[2]) return false
  const previousParameters = splitTopLevelComma(previous[1])
  const currentParameters = splitTopLevelComma(current[1])
  if (currentParameters.length <= previousParameters.length) return false
  return previousParameters.every((parameter, index) => currentParameters[index] === parameter)
}

function splitTopLevelComma(value) {
  const protectedCommas = value.replace(/,/g, (comma, index) => {
    const prefix = value.slice(0, index)
    const opens = [...prefix].filter((character) => "([{<".includes(character)).length
    const closes = [...prefix].filter((character) => ")]}>".includes(character)).length
    return opens === closes ? "\u0000" : comma
  })
  return protectedCommas.split("\u0000").map((part) => part.trim()).filter(Boolean)
}

function isOptionalInterfaceExtension(previousDeclarations, currentDeclarations, current) {
  if (previousDeclarations.length !== 1 || currentDeclarations.length !== 1) return false
  const previousLine = previousDeclarations[0]
  const currentLine = currentDeclarations[0]
  if (!previousLine.startsWith("interface ") || !currentLine.startsWith(`${previousLine} extends `)) {
    return false
  }
  const bases = currentLine
    .slice(`${previousLine} extends `.length)
    .split(",")
    .map((base) => /^([^<\s]+)/.exec(base.trim())?.[1])
    .filter(Boolean)
  if (bases.length === 0) return false
  return bases.every((base) => {
    const prefix = `interface-member ${base}::`
    const members = [...current]
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, lines]) => lines)
    return members.length > 0 && members.every((line) => /\s=\s+optional\s/.test(line))
  })
}

function isCompatibleChange(previousDeclarations, currentDeclarations, currentMap) {
  if (isOptionalInterfaceExtension(previousDeclarations, currentDeclarations, currentMap)) return true
  if (previousDeclarations.length !== 1 || currentDeclarations.length !== 1) return false
  const previous = propertyShape(previousDeclarations[0])
  const currentShape = propertyShape(currentDeclarations[0])
  if (!previous || !currentShape) return false
  if (previous.presence === "optional" && currentShape.presence === "required") return false
  return isTypeWidening(previous.type, currentShape.type) ||
    isCallbackTrailingArgumentAddition(previous.type, currentShape.type)
}

export function compareDeclarationLines(previousLines, currentLines) {
  const previous = declarationsByKey(previousLines)
  const current = declarationsByKey(currentLines)
  const changes = []

  for (const [symbol, previousDeclarations] of previous) {
    const currentDeclarations = current.get(symbol)
    if (!currentDeclarations) {
      changes.push({
        kind: "removed",
        symbol,
        previous: previousDeclarations,
        current: [],
      })
      continue
    }
    if (
      JSON.stringify(previousDeclarations) !== JSON.stringify(currentDeclarations) &&
      !isCompatibleChange(previousDeclarations, currentDeclarations, current)
    ) {
      changes.push({
        kind: "changed",
        symbol,
        previous: previousDeclarations,
        current: currentDeclarations,
      })
    }
  }

  for (const [symbol, currentDeclarations] of current) {
    if (previous.has(symbol) || isCompatibleAddition(symbol, currentDeclarations, previous)) continue
    changes.push({
      kind: "required-added",
      symbol,
      previous: [],
      current: currentDeclarations,
    })
  }

  return changes.sort((left, right) => left.symbol.localeCompare(right.symbol))
}
