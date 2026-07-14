import React, { useCallback, useMemo } from "react"
import { NetworkCustomChart, networkHitTarget } from "semiotic/network"
import { XYCustomChart, hitTargetPoint } from "semiotic/xy"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"

const XY_VIEWS = new Set(["reed-kellogg", "dependency", "ambiguity"])
const COLORS = {
  ink: "#23302d",
  muted: "#6f7771",
  paper: "#f4eedf",
  paperDeep: "#e7ddc8",
  coral: "#ce533e",
  coralSoft: "#efb19f",
  teal: "#2f7270",
  tealSoft: "#9bc4bd",
  gold: "#c4932e",
  violet: "#71618a",
  white: "#fffdf7",
}

function raw(value) {
  return value?.data ?? value
}

function tokenLabel(token) {
  return token?.text ?? token?.label ?? ""
}

function tokenPositions(tokens, width, y) {
  const left = Math.min(74, Math.max(34, width * 0.08))
  const right = Math.min(74, Math.max(34, width * 0.08))
  const step = tokens.length > 1 ? (width - left - right) / (tokens.length - 1) : 0
  return new Map(tokens.map((token, index) => [token.id, { x: left + step * index, y, index }]))
}

function tokenIndexById(tokens) {
  return new Map(tokens.map((token, index) => [token.id, index]))
}

function tokenIdAt(tokens, index) {
  return tokens[index]?.id
}

function endpointId(value) {
  const datum = raw(value)
  return typeof datum === "object" && datum !== null ? datum.id : datum
}

function sourceIdFor(value) {
  return value?.sourceId ?? value?.sourceIds?.[0] ?? value?.sources?.[0]?.id ?? null
}

function tokenIdsForSpan(tokens, tokenStart = 0, tokenEnd = tokens.length) {
  return tokens
    .filter((token, index) => {
      const tokenIndex = token.index ?? index
      return tokenIndex >= tokenStart && tokenIndex < tokenEnd
    })
    .map((token) => token.id)
}

function structureActionLabel(value, fallback) {
  const label = String(fallback ?? value?.id ?? "Structure").replace(/[.\s]+$/, "")
  const actions = []
  if (value?.selectTokenId) actions.push("Activate to follow the related word")
  if (sourceIdFor(value)) actions.push("Activate to recover a source sentence")
  return `${[label, ...actions].join(". ")}.`
}

function labelWidth(text, minimum = 38) {
  return Math.max(minimum, String(text ?? "").length * 7.4 + 20)
}

function relatedToSelection(ids, selectedTokenIds) {
  if (!selectedTokenIds?.length) return false
  return ids?.some((id) => selectedTokenIds.includes(id))
}

function activateOnKeyboard(event, callback) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  callback()
}

function TokenStrip({
  tokens,
  positions,
  selectedTokenIds,
  onSelectToken,
  y,
  compact = false,
  showPos = false,
  dimUnselected = false,
}) {
  return (
    <g className="sentence-diagram__tokens">
      <line
        x1={Math.min(...[...positions.values()].map((position) => position.x)) - 22}
        x2={Math.max(...[...positions.values()].map((position) => position.x)) + 22}
        y1={y + 14}
        y2={y + 14}
        stroke={COLORS.paperDeep}
        strokeWidth="2"
      />
      {tokens.map((token) => {
        const position = positions.get(token.id)
        const selected = selectedTokenIds.includes(token.id)
        const punctuation = /^[.,;:!?]$/.test(tokenLabel(token))
        return (
          <g
            key={token.id}
            className={`sentence-diagram__token ${selected ? "is-selected" : ""}`}
            transform={`translate(${position.x} ${y})`}
            role="button"
            tabIndex="0"
            aria-pressed={selected}
            aria-label={`${tokenLabel(token)}, ${token.posLabel ?? token.partOfSpeech ?? "word"}. ${selected ? "Selected" : "Activate to follow this word"}.`}
            onClick={() => onSelectToken(token.id)}
            onKeyDown={(event) => activateOnKeyboard(event, () => onSelectToken(token.id))}
            style={{
              cursor: "pointer",
              pointerEvents: "all",
              opacity: dimUnselected && selectedTokenIds.length && !selected ? 0.42 : 1,
            }}
          >
            {!punctuation ? (
              <rect
                x={-labelWidth(tokenLabel(token), compact ? 28 : 36) / 2}
                y={compact ? -16 : -20}
                width={labelWidth(tokenLabel(token), compact ? 28 : 36)}
                height={compact ? 27 : 34}
                rx="3"
                fill={selected ? COLORS.coral : COLORS.white}
                stroke={selected ? COLORS.coral : COLORS.ink}
                strokeWidth={selected ? 3 : 1.5}
              />
            ) : null}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={compact ? -2 : -3}
              fill={selected ? COLORS.white : COLORS.ink}
              fontSize={compact ? 11 : 13}
              fontWeight={selected ? 900 : 750}
            >
              {tokenLabel(token)}
            </text>
            {showPos && !punctuation ? (
              <text y="28" textAnchor="middle" fill={COLORS.muted} fontSize="8" fontWeight="800">
                {token.partOfSpeech ?? "TOKEN"}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

function DiagramDefs() {
  return (
    <defs>
      <marker id="sentence-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10Z" fill={COLORS.teal} />
      </marker>
      <marker id="sentence-arrow-coral" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10Z" fill={COLORS.coral} />
      </marker>
      <pattern id="sentence-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke={COLORS.paperDeep} strokeWidth="3" />
      </pattern>
    </defs>
  )
}

function DiagramLabel({ x = 18, y = 24, children, accent = COLORS.coral, align = "start" }) {
  return (
    <g className="sentence-diagram__label">
      <line x1={align === "start" ? x : x - 42} x2={align === "start" ? x + 42 : x} y1={y + 7} y2={y + 7} stroke={accent} strokeWidth="3" />
      <text x={x} y={y} textAnchor={align} fill={COLORS.ink} fontSize="10" fontWeight="900" letterSpacing="1.4">
        {children}
      </text>
    </g>
  )
}

function ReedKelloggDiagram({ width, height, tokens, selectedTokenIds, onSelectToken }) {
  const baselineY = Math.max(190, height * 0.5)
  const positions = tokenPositions(tokens, width, baselineY - 23)
  const rootIndex = Math.max(1, tokens.findIndex((token) => token.role === "root" || token.partOfSpeech === "VERB"))
  const objectIndex = tokens.findIndex((token) => /object|patient/i.test(token.role ?? ""))
  const subjectIndices = tokens.map((token, index) => ({ token, index })).filter(({ token }) => /subject|agent/i.test(token.role ?? ""))
  const modifierIndices = tokens.map((token, index) => ({ token, index })).filter(({ token }) => /modifier|determiner|case|adverb|instrument|possess/i.test(token.role ?? ""))
  const contentTokens = tokens.filter((token) => !/^[.,;:!?]$/.test(tokenLabel(token)))
  const firstX = positions.get(contentTokens[0]?.id)?.x ?? 40
  const lastX = positions.get(contentTokens.at(-1)?.id)?.x ?? width - 40

  return (
    <g className="sentence-diagram sentence-diagram--reed">
      <DiagramDefs />
      <DiagramLabel>REED–KELLOGG / AUTHORED PLATE</DiagramLabel>
      <text x={width - 18} y="24" textAnchor="end" fill={COLORS.muted} fontSize="9">roles become rails</text>
      <line x1={firstX - 30} x2={lastX + 30} y1={baselineY} y2={baselineY} stroke={COLORS.ink} strokeWidth="3" />
      {[rootIndex, objectIndex].filter((index) => index > 0).map((index, divider) => {
        const left = positions.get(tokens[index - 1]?.id)?.x ?? 0
        const right = positions.get(tokens[index]?.id)?.x ?? left
        const x = (left + right) / 2
        return (
          <g key={`${index}-${divider}`}>
            <line x1={x} x2={x} y1={baselineY - (divider ? 18 : 28)} y2={baselineY + 28} stroke={COLORS.coral} strokeWidth="3" />
            <text x={x + 6} y={baselineY + 25} fill={COLORS.coral} fontSize="8" fontWeight="900">
              {divider ? "OBJECT" : "PREDICATE"}
            </text>
          </g>
        )
      })}
      {subjectIndices.map(({ token }) => {
        const position = positions.get(token.id)
        return <text key={token.id} x={position.x} y={baselineY - 40} textAnchor="middle" fill={COLORS.teal} fontSize="8" fontWeight="900">SUBJECT</text>
      })}
      {modifierIndices.map(({ token, index }, modifierIndex) => {
        const position = positions.get(token.id)
        const anchorIndex = Math.max(0, index - 1)
        const anchor = positions.get(tokens[anchorIndex]?.id) ?? position
        const lowerY = baselineY + 70 + (modifierIndex % 2) * 42
        const lowerX = Math.max(34, Math.min(width - 34, (position.x + anchor.x) / 2 + (modifierIndex % 2 ? 16 : -16)))
        const selected = selectedTokenIds.includes(token.id)
        return (
          <g key={`modifier-${token.id}`}>
            <line x1={anchor.x} y1={baselineY} x2={lowerX - 16} y2={lowerY} stroke={selected ? COLORS.coral : COLORS.teal} strokeWidth={selected ? 4 : 2} />
            <line x1={lowerX - 16} y1={lowerY} x2={lowerX + 36} y2={lowerY} stroke={selected ? COLORS.coral : COLORS.ink} strokeWidth="2" />
            <text x={lowerX + 4} y={lowerY - 8} textAnchor="middle" fill={selected ? COLORS.coral : COLORS.ink} fontSize="11" fontWeight="750">{token.text}</text>
            <text x={lowerX + 4} y={lowerY + 14} textAnchor="middle" fill={COLORS.muted} fontSize="7" fontWeight="800">{String(token.role ?? "MODIFIER").toUpperCase()}</text>
          </g>
        )
      })}
      {tokens.map((token) => {
        if (/^[.,;:!?]$/.test(token.text) || modifierIndices.some((candidate) => candidate.token.id === token.id)) return null
        const position = positions.get(token.id)
        const selected = selectedTokenIds.includes(token.id)
        return (
          <g
            key={token.id}
            transform={`translate(${position.x} ${baselineY - 15})`}
            role="button"
            tabIndex="0"
            aria-label={`${token.text}, ${token.posLabel ?? token.partOfSpeech}. Activate to follow.`}
            aria-pressed={selected}
            onClick={() => onSelectToken(token.id)}
            onKeyDown={(event) => activateOnKeyboard(event, () => onSelectToken(token.id))}
            style={{ cursor: "pointer", pointerEvents: "all" }}
          >
            {selected ? <rect x={-labelWidth(token.text) / 2} y="-21" width={labelWidth(token.text)} height="29" fill={COLORS.coral} rx="2" /> : null}
            <text textAnchor="middle" fill={selected ? COLORS.white : COLORS.ink} fontSize="14" fontWeight="850">{token.text}</text>
          </g>
        )
      })}
      <text x="18" y={height - 20} fill={COLORS.muted} fontSize="9">
        Curated geometry — arbitrary sentence diagramming is intentionally out of scope.
      </text>
    </g>
  )
}

function flattenConstituency(node, depth = 0, parentId = null, rows = []) {
  if (!node) return rows
  rows.push({ ...node, depth, parentId })
  for (const child of node.children ?? []) flattenConstituency(child, depth + 1, node.id, rows)
  return rows
}

function constituencyGeometry(width, height, specimen, tokens) {
  const phrases = flattenConstituency(specimen?.constituency)
  const displayed = phrases.length ? phrases : specimen?.phrases ?? []
  const maxDepth = Math.max(1, ...displayed.map((phrase) => phrase.depth ?? 0))
  const tokenY = height - 58
  const positions = tokenPositions(tokens, width, tokenY)
  const tokenByIndex = new Map(tokens.map((token, index) => [token.index ?? index, token]))
  const phrasePosition = new Map(
    displayed.map((phrase) => {
      const startToken = tokenByIndex.get(phrase.tokenStart) ?? tokens[phrase.tokenStart]
      const endIndex = Math.max(phrase.tokenStart ?? 0, (phrase.tokenEnd ?? phrase.tokenStart ?? 0) - 1)
      const endToken = tokenByIndex.get(endIndex) ?? tokens[endIndex]
      const startX = positions.get(startToken?.id)?.x ?? width / 2
      const endX = positions.get(endToken?.id)?.x ?? startX
      const depth = phrase.depth ?? 0
      return [phrase.id, { x: (startX + endX) / 2, y: 54 + (depth / maxDepth) * (tokenY - 130) }]
    }),
  )

  return { displayed, phrasePosition, positions, tokenY }
}

function ConstituencyDiagram({ width, height, specimen, tokens, selectedTokenIds, onSelectToken }) {
  const { displayed, phrasePosition, positions, tokenY } = constituencyGeometry(
    width,
    height,
    specimen,
    tokens,
  )

  return (
    <g className="sentence-diagram sentence-diagram--constituency">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.violet}>CONSTITUENCY / PHRASE UNITS</DiagramLabel>
      {displayed.map((phrase) => {
        const position = phrasePosition.get(phrase.id)
        const parent = phrasePosition.get(phrase.parentId)
        if (!parent) return null
        return <path key={`edge-${phrase.id}`} d={`M${parent.x} ${parent.y + 14}L${position.x} ${position.y - 14}`} stroke={COLORS.paperDeep} strokeWidth="2" fill="none" />
      })}
      {displayed.map((phrase) => {
        const position = phrasePosition.get(phrase.id)
        const tokenIds = tokens
          .filter((token, index) => {
            const tokenIndex = token.index ?? index
            return tokenIndex >= (phrase.tokenStart ?? 0) && tokenIndex < (phrase.tokenEnd ?? tokens.length)
          })
          .map((token) => token.id)
        const selected = relatedToSelection(tokenIds, selectedTokenIds)
        const widthForLabel = labelWidth(phrase.label, 36)
        return (
          <g key={phrase.id} transform={`translate(${position.x} ${position.y})`}>
            <rect x={-widthForLabel / 2} y="-14" width={widthForLabel} height="28" rx="14" fill={selected ? COLORS.coral : COLORS.white} stroke={selected ? COLORS.coral : COLORS.violet} strokeWidth={selected ? 3 : 1.5} />
            <text textAnchor="middle" dominantBaseline="middle" fill={selected ? COLORS.white : COLORS.ink} fontSize="10" fontWeight="900">{phrase.label}</text>
          </g>
        )
      })}
      {displayed.filter((phrase) => !(phrase.children?.length)).map((phrase) => {
        const position = phrasePosition.get(phrase.id)
        const token = tokens.find((candidate, index) => (candidate.index ?? index) === phrase.tokenStart)
        const tokenPosition = positions.get(token?.id)
        return tokenPosition ? <line key={`leaf-${phrase.id}`} x1={position.x} y1={position.y + 14} x2={tokenPosition.x} y2={tokenY - 24} stroke={COLORS.paperDeep} strokeWidth="2" /> : null
      })}
      <TokenStrip tokens={tokens} positions={positions} selectedTokenIds={selectedTokenIds} onSelectToken={onSelectToken} y={tokenY} compact showPos />
    </g>
  )
}

function parseFor(specimen, interpretationId) {
  return specimen?.alternateDependencies?.find((parse) => parse.id === interpretationId)
}

function dependencyEdges(specimen, interpretationId) {
  return parseFor(specimen, interpretationId)?.edges ?? specimen?.dependencies ?? []
}

function edgeEndpoints(edge) {
  return {
    source: edge.sourceTokenId ?? edge.source,
    target: edge.targetTokenId ?? edge.target,
  }
}

function DependencyArcSet({ edges, positions, baselineY, selectedTokenIds, rowOffset = 0, disputedIds = new Set() }) {
  const ordered = [...edges].sort((a, b) => {
    const aEnds = edgeEndpoints(a)
    const bEnds = edgeEndpoints(b)
    return Math.abs((positions.get(aEnds.source)?.index ?? 0) - (positions.get(aEnds.target)?.index ?? 0)) -
      Math.abs((positions.get(bEnds.source)?.index ?? 0) - (positions.get(bEnds.target)?.index ?? 0))
  })
  return ordered.map((edge, edgeIndex) => {
    const { source, target } = edgeEndpoints(edge)
    const sourcePosition = positions.get(source)
    const targetPosition = positions.get(target)
    if (!sourcePosition || !targetPosition) return null
    const distance = Math.abs(sourcePosition.index - targetPosition.index)
    const peakY = baselineY - 30 - distance * 20 - (edgeIndex % 3) * 9 + rowOffset
    const selected = relatedToSelection([source, target], selectedTokenIds)
    const disputed = disputedIds.has(edge.id) || edge.disputed
    const color = selected || disputed ? COLORS.coral : COLORS.teal
    const midX = (sourcePosition.x + targetPosition.x) / 2
    return (
      <g key={`${edge.id ?? `${source}-${target}`}-${rowOffset}`} className={disputed ? "is-disputed" : ""}>
        <path
          d={`M${sourcePosition.x} ${baselineY - 24}Q${midX} ${peakY} ${targetPosition.x} ${baselineY - 24}`}
          fill="none"
          stroke={color}
          strokeWidth={selected || disputed ? 3.5 : 2}
          strokeDasharray={disputed ? "7 4" : undefined}
          markerEnd={`url(#${selected || disputed ? "sentence-arrow-coral" : "sentence-arrow"})`}
        />
        <rect x={midX - labelWidth(edge.label ?? edge.relation, 28) / 2} y={peakY + 5} width={labelWidth(edge.label ?? edge.relation, 28)} height="18" rx="9" fill={COLORS.paper} />
        <text x={midX} y={peakY + 17} textAnchor="middle" fill={color} fontSize="8" fontWeight="900">
          {edge.label ?? edge.relation}
        </text>
      </g>
    )
  })
}

function DependencyDiagram({ width, height, specimen, tokens, selectedTokenIds, interpretationId, onSelectToken }) {
  const baselineY = height - 72
  const positions = tokenPositions(tokens, width, baselineY)
  const edges = dependencyEdges(specimen, interpretationId)
  const activeParse = parseFor(specimen, interpretationId)
  return (
    <g className="sentence-diagram sentence-diagram--dependency">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.teal}>DEPENDENCIES / GOVERNOR → DEPENDENT</DiagramLabel>
      <text x={width - 18} y="24" textAnchor="end" fill={COLORS.coral} fontSize="9" fontWeight="850">
        {activeParse?.interpretation ?? activeParse?.label ?? "authored dependency analysis"}
      </text>
      <DependencyArcSet edges={edges} positions={positions} baselineY={baselineY} selectedTokenIds={selectedTokenIds} />
      <TokenStrip tokens={tokens} positions={positions} selectedTokenIds={selectedTokenIds} onSelectToken={onSelectToken} y={baselineY} showPos dimUnselected />
    </g>
  )
}

function AmbiguityDiagram({ width, height, specimen, tokens, selectedTokenIds, interpretationId, onSelectToken, onSelectInterpretation }) {
  const parses = specimen?.alternateDependencies?.length
    ? specimen.alternateDependencies.slice(0, 3)
    : [{ id: "default", label: "Authored parse", edges: specimen?.dependencies ?? [] }]
  const rowHeight = Math.max(118, (height - 54) / parses.length)
  const index = tokenIndexById(tokens)
  const signatures = new Map()
  for (const parse of parses) {
    for (const edge of parse.edges ?? []) {
      const endpoints = edgeEndpoints(edge)
      const signature = `${endpoints.source}:${endpoints.target}:${edge.relation}`
      signatures.set(signature, (signatures.get(signature) ?? 0) + 1)
    }
  }
  return (
    <g className="sentence-diagram sentence-diagram--ambiguity">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.coral}>PARSE FOREST / SHARED + DISPUTED</DiagramLabel>
      {parses.map((parse, parseIndex) => {
        const rowTop = 47 + parseIndex * rowHeight
        const baselineY = rowTop + rowHeight - 30
        const positions = tokenPositions(tokens, width, baselineY)
        const active = parse.id === interpretationId
        const disputed = new Set(
          (parse.edges ?? []).filter((edge) => {
            const endpoints = edgeEndpoints(edge)
            return signatures.get(`${endpoints.source}:${endpoints.target}:${edge.relation}`) !== parses.length
          }).map((edge) => edge.id),
        )
        return (
          <g
            key={parse.id}
            role="button"
            tabIndex="0"
            aria-pressed={active}
            aria-label={`${parse.label}. ${parse.interpretation ?? "Choose this interpretation"}`}
            onClick={() => onSelectInterpretation(parse.id)}
            onKeyDown={(event) => activateOnKeyboard(event, () => onSelectInterpretation(parse.id))}
            style={{ cursor: "pointer", pointerEvents: "all", opacity: interpretationId && !active ? 0.52 : 1 }}
          >
            <rect x="6" y={rowTop - 6} width={width - 12} height={rowHeight - 4} rx="7" fill={active ? "rgba(206,83,62,.07)" : "transparent"} stroke={active ? COLORS.coral : COLORS.paperDeep} strokeWidth={active ? 2.5 : 1} />
            <text x="18" y={rowTop + 12} fill={active ? COLORS.coral : COLORS.ink} fontSize="10" fontWeight="900">
              {String(parseIndex + 1).padStart(2, "0")} · {parse.label}
            </text>
            <text x={width - 18} y={rowTop + 12} textAnchor="end" fill={COLORS.muted} fontSize="8">
              {parse.probability != null ? `${Math.round(parse.probability * 100)}% authored confidence` : parse.interpretation}
            </text>
            <DependencyArcSet edges={parse.edges ?? []} positions={positions} baselineY={baselineY} selectedTokenIds={selectedTokenIds} disputedIds={disputed} />
            {tokens.map((token) => {
              const position = positions.get(token.id)
              const selected = selectedTokenIds.includes(token.id)
              return (
                <text key={token.id} x={position.x} y={baselineY + 2} textAnchor="middle" fill={selected ? COLORS.coral : COLORS.ink} fontSize="9" fontWeight={selected ? 900 : 700}>
                  {token.text}
                </text>
              )
            })}
          </g>
        )
      })}
      <text x="18" y={height - 8} fill={COLORS.muted} fontSize="8">
        {index.size} surface tokens · only dashed relationships differ
      </text>
    </g>
  )
}

function semanticPositions(width, height, semanticNodes) {
  const center = { x: width / 2, y: Math.max(170, height * 0.42) }
  const radiusX = Math.max(100, width * 0.34)
  const radiusY = Math.max(80, Math.min(145, height * 0.28))
  return new Map(semanticNodes.map((node, index) => {
    const angle = -Math.PI * 0.83 + (index / Math.max(1, semanticNodes.length - 1)) * Math.PI * 1.66
    return [node.id, { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY }]
  }))
}

function SemanticsDiagram({ width, height, specimen, tokens, selectedTokenIds, onSelectToken }) {
  const semanticNodes = specimen?.semantics?.nodes ?? []
  const semanticEdges = specimen?.semantics?.edges ?? []
  const positions = semanticPositions(width, height, semanticNodes)
  const tokenY = height - 50
  const tokenPos = tokenPositions(tokens, width, tokenY)
  return (
    <g className="sentence-diagram sentence-diagram--semantics">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.gold}>SEMANTIC GRAPH / CONCEPTS + ROLES</DiagramLabel>
      {semanticEdges.map((edge) => {
        const source = positions.get(edge.source)
        const target = positions.get(edge.target)
        if (!source || !target) return null
        const connected = semanticNodes.find((node) => node.id === edge.source)?.tokenIds?.concat(semanticNodes.find((node) => node.id === edge.target)?.tokenIds ?? []) ?? []
        const selected = relatedToSelection(connected, selectedTokenIds)
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        return (
          <g key={edge.id}>
            <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={selected ? COLORS.coral : COLORS.tealSoft} strokeWidth={selected ? 4 : 2} markerEnd={`url(#${selected ? "sentence-arrow-coral" : "sentence-arrow"})`} />
            <text x={midX} y={midY - 6} textAnchor="middle" fill={selected ? COLORS.coral : COLORS.teal} fontSize="8" fontWeight="900">{edge.label ?? edge.relation}</text>
          </g>
        )
      })}
      {(specimen?.semantics?.tokenAlignments ?? []).map((alignment) => {
        const token = tokenPos.get(alignment.tokenId)
        const concept = positions.get(alignment.nodeId)
        if (!token || !concept) return null
        const selected = selectedTokenIds.includes(alignment.tokenId)
        return <line key={`${alignment.tokenId}-${alignment.nodeId}`} x1={token.x} y1={tokenY - 24} x2={concept.x} y2={concept.y + 22} stroke={selected ? COLORS.coral : COLORS.paperDeep} strokeWidth={selected ? 3 : 1} strokeDasharray="3 4" />
      })}
      {semanticNodes.map((node) => {
        const position = positions.get(node.id)
        const selected = relatedToSelection(node.tokenIds ?? [], selectedTokenIds)
        const w = labelWidth(node.label, 70)
        return (
          <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
            <rect x={-w / 2} y="-22" width={w} height="44" rx={node.inferred ? 22 : 5} fill={selected ? COLORS.coral : node.inferred ? "url(#sentence-hatch)" : COLORS.white} stroke={selected ? COLORS.coral : node.inferred ? COLORS.gold : COLORS.teal} strokeWidth={selected ? 3 : 1.5} />
            <text textAnchor="middle" y="-2" fill={selected ? COLORS.white : COLORS.ink} fontSize="10" fontWeight="900">{node.label}</text>
            <text textAnchor="middle" y="12" fill={selected ? COLORS.white : COLORS.muted} fontSize="7" fontWeight="800">{node.inferred ? "INFERRED" : String(node.type ?? "CONCEPT").toUpperCase()}</text>
          </g>
        )
      })}
      <TokenStrip tokens={tokens} positions={tokenPos} selectedTokenIds={selectedTokenIds} onSelectToken={onSelectToken} y={tokenY} compact dimUnselected />
    </g>
  )
}

function fallbackRhetoric(specimen, tokens) {
  const split = Math.max(1, Math.floor(tokens.length / 2))
  return {
    nodes: [
      { id: "claim", label: "main claim", role: "nucleus", tokenStart: 0, tokenEnd: split },
      { id: "qualification", label: "qualifying detail", role: "satellite", relation: "elaboration", tokenStart: split, tokenEnd: tokens.length },
    ],
    edges: [{ id: "claim-qualification", source: "claim", target: "qualification", relation: "elaboration" }],
    fallback: true,
    source: specimen?.text,
  }
}

function rhetoricGeometry(width, nodes) {
  const cardGap = 14
  const cardWidth = Math.max(120, (width - 48 - cardGap * Math.max(0, nodes.length - 1)) / Math.max(1, nodes.length))
  const positions = new Map(nodes.map((node, index) => [node.id, { x: 24 + index * (cardWidth + cardGap), y: 105 + (node.role === "satellite" ? 62 : 0) }]))
  return { cardWidth, positions }
}

function RhetoricDiagram({ width, height, specimen, tokens, selectedTokenIds, onSelectToken }) {
  const rhetoric = specimen?.rhetoric ?? fallbackRhetoric(specimen, tokens)
  const nodes = rhetoric.nodes ?? []
  const { cardWidth, positions } = rhetoricGeometry(width, nodes)
  const tokenY = height - 54
  const tokenPos = tokenPositions(tokens, width, tokenY)
  return (
    <g className="sentence-diagram sentence-diagram--rhetoric">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.violet}>RHETORICAL STRUCTURE / NUCLEUS + SATELLITES</DiagramLabel>
      {rhetoric.fallback ? <text x={width - 18} y="24" textAnchor="end" fill={COLORS.coral} fontSize="8" fontWeight="900">LOAD THE ANALYST SPECIMEN FOR THE FULL PLATE</text> : null}
      {(rhetoric.edges ?? []).map((edge) => {
        const source = positions.get(edge.source)
        const target = positions.get(edge.target)
        if (!source || !target) return null
        return (
          <g key={edge.id}>
            <path d={`M${source.x + cardWidth / 2} ${source.y + 74}Q${(source.x + target.x + cardWidth) / 2} ${source.y + 115} ${target.x + cardWidth / 2} ${target.y + 74}`} fill="none" stroke={COLORS.violet} strokeWidth="2.5" />
            <text x={(source.x + target.x + cardWidth) / 2} y={(source.y + target.y) / 2 + 95} textAnchor="middle" fill={COLORS.violet} fontSize="8" fontWeight="900">{edge.relation}</text>
          </g>
        )
      })}
      {nodes.map((node, index) => {
        const position = positions.get(node.id)
        const tokenIds = tokens.filter((token, tokenIndex) => {
          const value = token.index ?? tokenIndex
          return value >= (node.tokenStart ?? 0) && value < (node.tokenEnd ?? tokens.length)
        }).map((token) => token.id)
        const selected = relatedToSelection(tokenIds, selectedTokenIds)
        const span = tokens.filter((token) => tokenIds.includes(token.id)).map((token) => token.text).join(" ").replace(/\s+([.,;:!?])/g, "$1")
        return (
          <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
            <rect width={cardWidth} height="74" rx="5" fill={selected ? COLORS.coral : node.role === "nucleus" ? COLORS.ink : COLORS.white} stroke={selected ? COLORS.coral : node.role === "nucleus" ? COLORS.ink : COLORS.violet} strokeWidth="2" />
            <text x="12" y="18" fill={selected || node.role === "nucleus" ? COLORS.white : COLORS.violet} fontSize="8" fontWeight="900" letterSpacing="1">{String(node.role ?? "span").toUpperCase()} · {String(index + 1).padStart(2, "0")}</text>
            <text x="12" y="37" fill={selected || node.role === "nucleus" ? COLORS.white : COLORS.ink} fontSize="11" fontWeight="900">{node.label}</text>
            <text x="12" y="55" fill={selected || node.role === "nucleus" ? COLORS.paperDeep : COLORS.muted} fontSize="8">{span.slice(0, 34)}{span.length > 34 ? "…" : ""}</text>
            <text x="12" y="67" fill={selected || node.role === "nucleus" ? COLORS.paperDeep : COLORS.muted} fontSize="7" fontWeight="800">{String(node.relation ?? "central claim").toUpperCase()}</text>
          </g>
        )
      })}
      <TokenStrip tokens={tokens} positions={tokenPos} selectedTokenIds={selectedTokenIds} onSelectToken={onSelectToken} y={tokenY} compact dimUnselected />
    </g>
  )
}

function flattenTrie(root) {
  const nodes = []
  const edges = []
  function walk(node, depth = 0, parentId = null) {
    if (!node) return
    const id = node.id ?? `${parentId ?? "root"}:${node.token ?? node.label ?? depth}`
    nodes.push({ ...node, id, depth: node.depth ?? depth, parentId })
    if (parentId) edges.push({ id: `${parentId}->${id}`, source: parentId, target: id })
    for (const child of node.children ?? []) walk(child, depth + 1, id)
  }
  walk(root)
  return { nodes, edges }
}

function normalizeTree(wordTree) {
  if (wordTree?.nodes?.length) return { nodes: wordTree.nodes, edges: wordTree.edges ?? [] }
  return flattenTrie(wordTree?.root)
}

function wordTreePositions(width, height, nodes, direction) {
  const byDepth = new Map()
  for (const node of nodes) {
    const depth = node.depth ?? 0
    if (!byDepth.has(depth)) byDepth.set(depth, [])
    byDepth.get(depth).push(node)
  }
  const maxDepth = Math.max(1, ...byDepth.keys())
  const positions = new Map()
  for (const [depth, level] of byDepth) {
    level.forEach((node, index) => {
      const progress = depth / maxDepth
      const x = direction === "backward" ? width - 70 - progress * (width - 140) : 70 + progress * (width - 140)
      const y = 65 + ((index + 1) / (level.length + 1)) * (height - 110)
      positions.set(node.id, { x, y })
    })
  }
  return positions
}

function WordTreeDiagram({ width, height, wordTree, direction, selectedTokenIds, onSelectSource }) {
  const normalized = normalizeTree(wordTree)
  const nodes = normalized.nodes.slice(0, 34)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = normalized.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  const positions = wordTreePositions(width, height, nodes, direction)
  return (
    <g className="sentence-diagram sentence-diagram--word-tree">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.gold}>WORD PATHS / {String(direction).toUpperCase()} CONTEXT</DiagramLabel>
      <text x={width - 18} y="24" textAnchor="end" fill={COLORS.muted} fontSize="8">
        line weight = frequency · leaf = recoverable source
      </text>
      {edges.map((edge) => {
        const source = positions.get(edge.source)
        const target = positions.get(edge.target)
        if (!source || !target) return null
        const targetNode = nodes.find((node) => node.id === edge.target)
        const sourceNode = nodes.find((node) => node.id === edge.source)
        const sourceId = sourceIdFor(edge)
        const weight = Math.max(1.2, Math.min(8, Number(edge.count ?? targetNode?.count ?? 1)))
        const bend = (source.x + target.x) / 2
        const sourceLabel = sourceNode?.label ?? sourceNode?.token ?? edge.source
        const targetLabel = targetNode?.label ?? targetNode?.token ?? edge.target
        return (
          <g
            key={edge.id ?? `${edge.source}-${edge.target}`}
            role={sourceId ? "button" : undefined}
            tabIndex={sourceId ? "0" : undefined}
            aria-label={sourceId ? `${sourceLabel} to ${targetLabel}. Activate to recover a source sentence.` : undefined}
            onClick={sourceId ? () => onSelectSource(sourceId) : undefined}
            onKeyDown={sourceId ? (event) => activateOnKeyboard(event, () => onSelectSource(sourceId)) : undefined}
            style={{ cursor: sourceId ? "pointer" : "default", pointerEvents: sourceId ? "all" : undefined }}
          >
            <path d={`M${source.x} ${source.y}C${bend} ${source.y} ${bend} ${target.y} ${target.x} ${target.y}`} fill="none" stroke={COLORS.tealSoft} strokeWidth={weight} opacity={0.5 + Math.min(0.4, weight / 14)} />
          </g>
        )
      })}
      {nodes.map((node) => {
        const position = positions.get(node.id)
        const label = node.label ?? node.token ?? node.word ?? node.id
        const sourceId = sourceIdFor(node)
        const root = (node.depth ?? 0) === 0
        const selected = node.tokenIds?.some((id) => selectedTokenIds.includes(id))
        const w = labelWidth(label, root ? 72 : 40)
        return (
          <g
            key={node.id}
            transform={`translate(${position.x} ${position.y})`}
            role={sourceId ? "button" : undefined}
            tabIndex={sourceId ? "0" : undefined}
            aria-label={`${label}, ${node.count ?? 1} path${node.count === 1 ? "" : "s"}${sourceId ? ". Activate to recover source." : ""}`}
            onClick={sourceId ? () => onSelectSource(sourceId) : undefined}
            onKeyDown={sourceId ? (event) => activateOnKeyboard(event, () => onSelectSource(sourceId)) : undefined}
            style={{ cursor: sourceId ? "pointer" : "default", pointerEvents: sourceId ? "all" : undefined }}
          >
            <rect x={-w / 2} y="-15" width={w} height="30" rx={root ? 15 : 3} fill={root ? COLORS.coral : selected ? COLORS.gold : COLORS.white} stroke={root ? COLORS.coral : selected ? COLORS.gold : COLORS.teal} strokeWidth={root || selected ? 3 : 1.5} />
            <text textAnchor="middle" dominantBaseline="middle" fill={root ? COLORS.white : COLORS.ink} fontSize={root ? 11 : 9} fontWeight="900">{label}</text>
            {node.count != null ? <text x={w / 2 - 2} y="-11" textAnchor="end" fill={root ? COLORS.white : COLORS.coral} fontSize="7" fontWeight="900">{node.count}</text> : null}
          </g>
        )
      })}
      {!nodes.length ? <text x={width / 2} y={height / 2} textAnchor="middle" fill={COLORS.muted}>No matching source paths. Try another subject or corpus.</text> : null}
    </g>
  )
}

function phraseNetPositions(width, height, nodes) {
  const center = { x: width / 2, y: height / 2 + 12 }
  const radius = Math.min(width * 0.36, height * 0.36)
  return new Map(nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2
    return [node.id ?? node.label, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }]
  }))
}

function PhraseNetDiagram({ width, height, phraseNet, onSelectSource }) {
  const nodes = phraseNet?.nodes ?? []
  const edges = phraseNet?.edges ?? []
  const center = { x: width / 2, y: height / 2 + 12 }
  const positions = phraseNetPositions(width, height, nodes)
  return (
    <g className="sentence-diagram sentence-diagram--phrase-net">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.teal}>PHRASE NET / CONSTRUCTION-PRESERVING EDGES</DiagramLabel>
      {edges.map((edge) => {
        const source = positions.get(edge.source)
        const target = positions.get(edge.target)
        if (!source || !target) return null
        const sourceId = sourceIdFor(edge)
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        const weight = Math.max(1.5, Math.min(10, Number(edge.weight ?? edge.count ?? 1) * 1.3))
        return (
          <g
            key={edge.id ?? `${edge.source}-${edge.target}`}
            role={sourceId ? "button" : undefined}
            tabIndex={sourceId ? "0" : undefined}
            aria-label={`${edge.label ?? edge.pattern ?? "phrase relationship"}, ${edge.count ?? edge.weight ?? 1} examples. ${sourceId ? "Activate to recover a source phrase." : ""}`}
            onClick={sourceId ? () => onSelectSource(sourceId) : undefined}
            onKeyDown={sourceId ? (event) => activateOnKeyboard(event, () => onSelectSource(sourceId)) : undefined}
            style={{ cursor: sourceId ? "pointer" : "default", pointerEvents: sourceId ? "all" : undefined }}
          >
            <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={COLORS.tealSoft} strokeWidth={weight} opacity="0.72" />
            <rect x={midX - 30} y={midY - 10} width="60" height="20" rx="10" fill={COLORS.paper} />
            <text x={midX} y={midY + 3} textAnchor="middle" fill={COLORS.teal} fontSize="7" fontWeight="900">{edge.label ?? edge.pattern ?? edge.count}</text>
          </g>
        )
      })}
      {nodes.map((node) => {
        const id = node.id ?? node.label
        const position = positions.get(id)
        const label = node.label ?? node.word ?? id
        const w = labelWidth(label, 54)
        return (
          <g key={id} transform={`translate(${position.x} ${position.y})`}>
            <circle r={Math.max(24, Math.min(42, 18 + Number(node.count ?? node.value ?? 1) * 3))} fill={COLORS.white} stroke={COLORS.coral} strokeWidth="2" />
            <text textAnchor="middle" dominantBaseline="middle" fill={COLORS.ink} fontSize={w > 100 ? 8 : 10} fontWeight="900">{label}</text>
            <text y="18" textAnchor="middle" fill={COLORS.coral} fontSize="7" fontWeight="900">{node.count ?? node.value ?? ""}</text>
          </g>
        )
      })}
      {!nodes.length ? <text x={center.x} y={center.y} textAnchor="middle" fill={COLORS.muted}>No matching phrase relationships. Try X and Y in Shakespeare.</text> : null}
    </g>
  )
}

function variantTokenRows(specimen, tokens, rewrites) {
  const rows = [
    {
      id: "surface",
      label: "canonical sentence",
      tokens: specimen?.tokens ?? tokens,
      color: COLORS.ink,
      canonical: true,
    },
    ...(specimen?.variants ?? []).slice(0, 4).map((variant, index) => ({
      ...variant,
      tokens: variant.tokens ?? String(variant.text ?? "").match(/[\w’'-]+|[^\s\w]/g)?.map((text, tokenIndex) => ({ id: `${variant.id}:${tokenIndex}`, text })) ?? [],
      color: [COLORS.teal, COLORS.violet, COLORS.gold, COLORS.coral][index % 4],
    })),
  ]
  if (Object.keys(rewrites ?? {}).length) {
    rows.push({ id: "reader-rewrite", label: "your rewrite", tokens, color: COLORS.coral, rewritten: true })
  }
  return rows
}

function variantRowPositions(width, height, rows) {
  const rowHeight = Math.max(56, (height - 62) / Math.max(1, rows.length))
  const usableWidth = width - 130
  const positionsByRow = rows.map((row, rowIndex) => {
    const step = usableWidth / Math.max(1, row.tokens.length)
    return new Map(row.tokens.map((token, tokenIndex) => [token.id, { x: 112 + step * tokenIndex + step / 2, y: 55 + rowIndex * rowHeight }]))
  })
  return { positionsByRow, rowHeight }
}

function VariantsDiagram({ width, height, specimen, tokens, selectedTokenIds, rewrites, alignment, onSelectToken }) {
  const rows = variantTokenRows(specimen, tokens, rewrites)
  const { positionsByRow, rowHeight } = variantRowPositions(width, height, rows)
  return (
    <g className="sentence-diagram sentence-diagram--variants">
      <DiagramDefs />
      <DiagramLabel accent={COLORS.violet}>TEXTUAL VARIANTS / ALIGNED BY {String(alignment).toUpperCase()}</DiagramLabel>
      {rows.slice(0, -1).map((row, rowIndex) => {
        const next = rows[rowIndex + 1]
        const currentPositions = positionsByRow[rowIndex]
        const nextPositions = positionsByRow[rowIndex + 1]
        return row.tokens.map((token) => {
          const current = currentPositions.get(token.id)
          const same = next.tokens.find((candidate) => String(candidate.lemma ?? candidate.text).toLowerCase() === String(token.lemma ?? token.text).toLowerCase())
          const target = same ? nextPositions.get(same.id) : null
          return target ? <path key={`${row.id}-${token.id}-${next.id}`} d={`M${current.x} ${current.y + 12}C${current.x} ${current.y + rowHeight / 2} ${target.x} ${target.y - rowHeight / 2} ${target.x} ${target.y - 12}`} fill="none" stroke={COLORS.paperDeep} strokeWidth="2" /> : null
        })
      })}
      {rows.map((row, rowIndex) => (
        <g key={row.id}>
          <text x="12" y={55 + rowIndex * rowHeight + 3} fill={row.color} fontSize="8" fontWeight="900">{String(row.label ?? row.id).toUpperCase()}</text>
          {row.tokens.map((token, tokenIndex) => {
            const position = positionsByRow[rowIndex].get(token.id)
            const originalId = rowIndex === 0 ? token.id : row.alignments?.find((alignment) => alignment.variantTokenId === token.id)?.tokenId
            const selected = originalId ? selectedTokenIds.includes(originalId) : false
            const canSelect = rowIndex === 0
            return (
              <g
                key={`${row.id}-${token.id}-${tokenIndex}`}
                transform={`translate(${position.x} ${position.y})`}
                role={canSelect ? "button" : undefined}
                tabIndex={canSelect ? "0" : undefined}
                aria-pressed={canSelect ? selected : undefined}
                aria-label={canSelect ? `${token.text}. Activate to follow this word.` : undefined}
                onClick={canSelect ? () => onSelectToken(token.id) : undefined}
                onKeyDown={canSelect ? (event) => activateOnKeyboard(event, () => onSelectToken(token.id)) : undefined}
                style={{ cursor: canSelect ? "pointer" : "default", pointerEvents: canSelect ? "all" : undefined }}
              >
                <rect x={-labelWidth(token.text, 26) / 2} y="-13" width={labelWidth(token.text, 26)} height="26" rx="3" fill={selected || row.rewritten ? COLORS.coral : COLORS.white} stroke={selected || row.rewritten ? COLORS.coral : row.color} strokeWidth={selected ? 3 : 1.3} />
                <text textAnchor="middle" dominantBaseline="middle" fill={selected || row.rewritten ? COLORS.white : COLORS.ink} fontSize="8.5" fontWeight="800">{token.text}</text>
              </g>
            )
          })}
        </g>
      ))}
    </g>
  )
}

function renderDiagram(props) {
  switch (props.view) {
    case "reed-kellogg":
      return <ReedKelloggDiagram {...props} />
    case "constituency":
      return <ConstituencyDiagram {...props} />
    case "dependency":
      return <DependencyDiagram {...props} />
    case "ambiguity":
      return <AmbiguityDiagram {...props} />
    case "semantics":
      return <SemanticsDiagram {...props} />
    case "rhetoric":
      return <RhetoricDiagram {...props} />
    case "word-tree":
      return <WordTreeDiagram {...props} />
    case "phrase-net":
      return <PhraseNetDiagram {...props} />
    case "variants":
      return <VariantsDiagram {...props} />
    default:
      return <ConstituencyDiagram {...props} />
  }
}

function variantStageGraph(specimen, tokens, rewrites) {
  const rows = variantTokenRows(specimen, tokens, rewrites)
  const nodes = []
  const edges = []

  rows.forEach((row, rowIndex) => {
    let previousId = null
    row.tokens.forEach((token, tokenIndex) => {
      const id = `variant-stage:${row.id}:${tokenIndex}`
      const canonicalTokenId = row.canonical || row.rewritten
        ? token.id
        : row.alignments?.find((entry) => entry.variantTokenId === token.id)?.tokenId ?? null
      nodes.push({
        ...token,
        id,
        label: token.text,
        tokenId: token.id,
        canonicalTokenId,
        selectTokenId: canonicalTokenId,
        rowId: row.id,
        rowLabel: row.label,
        rowIndex,
        tokenIndex,
        rewritten: Boolean(row.rewritten),
        entityType: "variant-token",
      })
      if (previousId) {
        edges.push({
          id: `${previousId}->${id}`,
          source: previousId,
          target: id,
          label: row.label,
          relation: "next token",
          rowId: row.id,
          rewritten: Boolean(row.rewritten),
          entityType: "variant-path",
        })
      }
      previousId = id
    })
  })

  return { nodes, edges, rows }
}

function stageGraph(view, specimen, tokens, wordTree, phraseNet, rewrites) {
  if (view === "constituency") {
    const flattened = flattenConstituency(specimen?.constituency)
    const phrases = flattened.length ? flattened : specimen?.phrases ?? []
    const nodes = phrases.map((node) => {
      const tokenIds = node.tokenIds?.length
        ? node.tokenIds
        : tokenIdsForSpan(
          tokens,
          node.tokenStart ?? 0,
          node.tokenEnd ?? tokens.length,
        )
      return {
        ...node,
        tokenIds,
        selectTokenId: tokenIds[0] ?? null,
        entityType: "constituency-phrase",
      }
    })
    return {
      nodes,
      edges: nodes
        .filter((node) => node.parentId)
        .map((node) => ({
          id: `${node.parentId}->${node.id}`,
          source: node.parentId,
          target: node.id,
          label: "contains",
          relation: "contains",
          entityType: "phrase-containment",
        })),
    }
  }
  if (view === "semantics") {
    const tokenIdSet = new Set(tokens.map((token) => token.id))
    return {
      nodes: (specimen?.semantics?.nodes ?? []).map((node) => ({
        ...node,
        selectTokenId: node.tokenIds?.find((tokenId) => tokenIdSet.has(tokenId)) ?? null,
        entityType: "semantic-concept",
      })),
      edges: specimen?.semantics?.edges ?? [],
    }
  }
  if (view === "rhetoric") {
    const rhetoric = specimen?.rhetoric ?? fallbackRhetoric(specimen, tokens)
    return {
      nodes: (rhetoric.nodes ?? []).map((node) => {
        const tokenIds = node.tokenIds?.length
          ? node.tokenIds
          : tokenIdsForSpan(
            tokens,
            node.tokenStart ?? 0,
            node.tokenEnd ?? tokens.length,
          )
        return {
          ...node,
          tokenIds,
          selectTokenId: tokenIds[0] ?? null,
          entityType: "rhetoric-span",
        }
      }),
      edges: rhetoric.edges ?? [],
    }
  }
  if (view === "word-tree") {
    const normalized = normalizeTree(wordTree)
    const nodes = normalized.nodes.slice(0, 34)
    const ids = new Set(nodes.map((node) => node.id))
    return {
      nodes,
      edges: normalized.edges.filter(
        (edge) => ids.has(endpointId(edge.source)) && ids.has(endpointId(edge.target)),
      ),
    }
  }
  if (view === "phrase-net") {
    return { nodes: phraseNet?.nodes ?? [], edges: phraseNet?.edges ?? [] }
  }
  if (view === "variants") return variantStageGraph(specimen, tokens, rewrites)
  return { nodes: tokens, edges: [] }
}

function fallbackNetworkPositions(width, height, nodes) {
  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) * 0.32
  return new Map(nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2
    return [node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    }]
  }))
}

function networkHitGeometry(view, width, nodes, node) {
  const label = node.label ?? node.text ?? node.token ?? node.id
  if (view === "constituency") {
    return { width: labelWidth(label, 36), height: 28 }
  }
  if (view === "semantics") {
    return { width: labelWidth(label, 70), height: 44 }
  }
  if (view === "rhetoric") {
    return { width: rhetoricGeometry(width, nodes).cardWidth, height: 74 }
  }
  if (view === "word-tree") {
    return {
      width: labelWidth(label, (node.depth ?? 0) === 0 ? 72 : 40),
      height: 30,
    }
  }
  if (view === "phrase-net") {
    return { r: Math.max(24, Math.min(42, 18 + Number(node.count ?? node.value ?? 1) * 3)) }
  }
  if (view === "variants") {
    return { width: labelWidth(label, 26), height: 26 }
  }
  return { r: 18 }
}

function networkNodePositions(view, width, height, nodes, common) {
  if (view === "constituency") {
    return constituencyGeometry(width, height, common.specimen, common.tokens).phrasePosition
  }
  if (view === "semantics") return semanticPositions(width, height, nodes)
  if (view === "rhetoric") {
    const { cardWidth, positions } = rhetoricGeometry(width, nodes)
    return new Map([...positions].map(([id, position]) => [id, {
      x: position.x + cardWidth / 2,
      y: position.y + 37,
    }]))
  }
  if (view === "word-tree") {
    return wordTreePositions(width, height, nodes, common.direction)
  }
  if (view === "phrase-net") return phraseNetPositions(width, height, nodes)
  if (view === "variants") {
    const rows = variantTokenRows(common.specimen, common.tokens, common.rewrites)
    const { positionsByRow } = variantRowPositions(width, height, rows)
    return new Map(nodes.map((node) => [
      node.id,
      positionsByRow[node.rowIndex]?.get(node.tokenId) ?? { x: width / 2, y: height / 2 },
    ]))
  }
  return fallbackNetworkPositions(width, height, nodes)
}

export default function SentenceStructureStage({
  view,
  specimen,
  tokens,
  selectedTokenIds,
  interpretationId,
  wordTree,
  phraseNet,
  direction,
  alignment,
  rewrites,
  reducedMotion,
  onSelectToken,
  onSelectInterpretation,
  onSelectSource,
}) {
  const [width, hostRef] = useResponsiveWidth(220, 920)
  const compact = width < 520
  const height = compact ? 430 : 500
  const summaryText = `${specimen?.text ?? "Sentence"} shown as ${view}. ${selectedTokenIds.length ? `${selectedTokenIds.length} word selections persist.` : "No word is currently selected."}`
  const common = useMemo(
    () => ({
      view,
      specimen,
      tokens,
      selectedTokenIds,
      interpretationId,
      wordTree,
      phraseNet,
      direction,
      alignment,
      rewrites,
      onSelectToken,
      onSelectInterpretation,
      onSelectSource,
    }),
    [alignment, direction, interpretationId, onSelectInterpretation, onSelectSource, onSelectToken, phraseNet, rewrites, selectedTokenIds, specimen, tokens, view, wordTree],
  )
  const xyLayout = useMemo(
    () => (ctx) => {
      const plot = ctx.dimensions.plot
      const positions = tokenPositions(tokens, plot.width, plot.height - 58)
      return {
        nodes: tokens.map((token) => {
          const position = positions.get(token.id)
          return hitTargetPoint({ x: position.x, y: position.y, datum: { ...token, entityType: "token" }, id: token.id, r: 18 })
        }),
        overlays: renderDiagram({ ...common, width: plot.width, height: plot.height }),
      }
    },
    [common, tokens],
  )
  const graph = useMemo(
    () => {
      const result = stageGraph(view, specimen, tokens, wordTree, phraseNet, rewrites)
      return {
        nodes: result.nodes.map((node, index) => ({
          ...node,
          id: node.id ?? `${view}-node-${index}`,
        })),
        edges: result.edges,
      }
    },
    [phraseNet, rewrites, specimen, tokens, view, wordTree],
  )
  const networkLayout = useMemo(
    () => (ctx) => {
      const plot = ctx.dimensions.plot
      const layoutNodes = ctx.nodes.map(raw)
      const layoutEdges = ctx.edges.map(raw)
      const positions = networkNodePositions(
        view,
        plot.width,
        plot.height,
        layoutNodes,
        common,
      )
      return {
        sceneNodes: layoutNodes.map((node, index) => {
          const id = node.id ?? `${view}-node-${index}`
          const position = positions.get(id) ?? { x: plot.width / 2, y: plot.height / 2 }
          const label = node.label ?? node.text ?? node.token ?? String(id)
          const accessibleLabel = structureActionLabel(node, label)
          const datum = {
            ...node,
            id,
            accessibleLabel,
            entityType: node.entityType ?? `${view}-node`,
          }
          const hitGeometry = networkHitGeometry(view, plot.width, layoutNodes, node)
          if ("width" in hitGeometry) {
            return networkHitTarget({
              x: position.x - hitGeometry.width / 2,
              y: position.y - hitGeometry.height / 2,
              width: hitGeometry.width,
              height: hitGeometry.height,
              datum,
              id,
              label: accessibleLabel,
            })
          }
          return networkHitTarget({
            x: position.x,
            y: position.y,
            datum,
            id,
            r: hitGeometry.r,
            label: accessibleLabel,
          })
        }),
        sceneEdges: layoutEdges.flatMap((edge, index) => {
          const source = endpointId(edge.source)
          const target = endpointId(edge.target)
          const sourcePosition = positions.get(source)
          const targetPosition = positions.get(target)
          if (!sourcePosition || !targetPosition) return []
          const edgeLabel = edge.label ?? edge.relation ?? `${source} to ${target}`
          const accessibleLabel = structureActionLabel(edge, edgeLabel)
          return [{
            type: "line",
            x1: sourcePosition.x,
            y1: sourcePosition.y,
            x2: targetPosition.x,
            y2: targetPosition.y,
            style: { stroke: "transparent", strokeWidth: 12, opacity: 0 },
            datum: {
              ...edge,
              id: edge.id ?? `${source}->${target}-${index}`,
              source,
              target,
              accessibleLabel,
              entityType: edge.entityType ?? `${view}-relationship`,
            },
          }]
        }),
        // StreamNetworkFrame can invoke a custom layout once before its node
        // store has reconciled new props. Keep that transient pass empty so it
        // is not mistaken for an intentionally overlay-only visualization.
        overlays: layoutNodes.length
          ? renderDiagram({ ...common, width: plot.width, height: plot.height })
          : null,
      }
    },
    [common, view],
  )
  const handleFrameClick = useCallback((datum) => {
    const value = raw(datum)
    const selectTokenId = value?.selectTokenId ??
      (value?.entityType === "token" ? value.id : null)
    if (selectTokenId) {
      onSelectToken(selectTokenId)
      return
    }
    const sourceId = sourceIdFor(value)
    if (sourceId) onSelectSource(sourceId)
  }, [onSelectSource, onSelectToken])
  const structuralEmpty = !XY_VIEWS.has(view) && graph.nodes.length === 0
  const structuralEmptyText = view === "word-tree"
    ? "No matching source paths. Try another subject or corpus."
    : "No matching phrase relationships. Try X and Y in Shakespeare."

  return (
    <div className="sentence-stage__host" ref={hostRef}>
      <div className={`sentence-stage__frame sentence-stage__frame--${XY_VIEWS.has(view) ? "xy" : "network"}`}>
        {structuralEmpty ? (
          <div className="sentence-stage__empty" role="status">
            <strong>No matching structure</strong>
            <span>{structuralEmptyText}</span>
          </div>
        ) : XY_VIEWS.has(view) ? (
          <XYCustomChart
            data={tokens}
            layout={xyLayout}
            width={width}
            height={height}
            xExtent={[0, Math.max(1, tokens.length - 1)]}
            yExtent={[0, 1]}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            enableHover
            accessibleTable
            description={`An authored ${view} structure for ${specimen?.text}`}
            summary={summaryText}
            onClick={handleFrameClick}
            animate={!reducedMotion}
            frameProps={{
              background: "transparent",
              animate: !reducedMotion,
              description: `An authored ${view} structure for ${specimen?.text}`,
              summary: summaryText,
              accessibleTable: true,
            }}
          />
        ) : (
          <NetworkCustomChart
            nodes={graph.nodes}
            edges={graph.edges}
            layout={networkLayout}
            width={width}
            height={height}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            enableHover
            accessibleTable
            description={`An authored ${view} structure for ${specimen?.text}`}
            summary={summaryText}
            onClick={handleFrameClick}
            animate={!reducedMotion}
            frameProps={{
              background: "transparent",
              animate: !reducedMotion,
              description: `An authored ${view} structure for ${specimen?.text}`,
              summary: summaryText,
              accessibleTable: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
