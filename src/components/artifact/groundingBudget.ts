import type { ArtifactContract, TemporalContext } from "./types"
import type {
  ArtifactGrounding,
  GroundedClaim,
  GroundedEvidence
} from "./grounding"

export interface ArtifactGroundingBudget {
  /** Budget requested by the caller or reception channel. */
  requestedTokens: number
  /**
   * Applied upper bound using the documented four-serialized-characters per
   * token approximation. A 256-token minimum retains identity, safety, and
   * omission metadata even when the requested budget is smaller.
   */
  effectiveTokens: number
  /** Exact JSON.stringify length of this grounding payload. */
  serializedCharacters: number
  minimumEnvelopeApplied: boolean
}

export const MINIMUM_GROUNDING_TOKENS = 256

const CHARACTERS_PER_TOKEN = 4
const MAX_EFFECTIVE_TOKENS = Math.floor(
  Number.MAX_SAFE_INTEGER / CHARACTERS_PER_TOKEN
)
const UNTRUSTED_CONTENT_BEGIN = "BEGIN UNTRUSTED ARTIFACT CONTENT"
const UNTRUSTED_CONTENT_END = "END UNTRUSTED ARTIFACT CONTENT"
const GROUNDING_TRUNCATION_NOTICE =
  "[Grounding truncated to the declared token budget.]"

function safeDelimitedText(value: string): string {
  const boundarySafe = value
    .replace(/\b(?:BEGIN|END) UNTRUSTED ARTIFACT CONTENT\b/gi, (match) =>
      match.replace(/ /g, "\\u0020")
    )
    .replace(/<\|/g, "<\\|")
    .replace(/\|>/g, "\\|>")
  return JSON.stringify(boundarySafe).slice(1, -1)
}

export function buildGroundingText(input: {
  artifact: ArtifactGrounding["artifact"]
  purpose: ArtifactContract["purpose"]
  claims: GroundedClaim[]
  evidence: GroundedEvidence[]
  time?: TemporalContext
  form?: ArtifactContract["form"]
  uncertainty: string[]
  contestability?: ArtifactContract["contestability"]
  accountability?: ArtifactContract["accountability"]
}): string {
  const {
    artifact,
    purpose,
    claims,
    evidence,
    time,
    form,
    uncertainty,
    contestability,
    accountability
  } = input
  const lines = [
    UNTRUSTED_CONTENT_BEGIN,
    `Artifact: ${safeDelimitedText(artifact.title ?? artifact.id)}`,
    `Purpose: ${
      purpose.intents.map(({ id }) => safeDelimitedText(id)).join(", ") ||
      "unknown"
    }`,
    `Claims: ${claims.length}`
  ]
  for (const claim of claims) {
    lines.push(
      `- [${claim.status}/${claim.kind}] ${safeDelimitedText(claim.id)}: ${safeDelimitedText(claim.text ?? "No readable text")}`
    )
    if (claim.evidenceIds.length) {
      lines.push(
        `  Evidence: ${claim.evidenceIds.map(safeDelimitedText).join(", ")}`
      )
    }
  }
  lines.push(`Evidence records: ${evidence.length}`)
  for (const item of evidence) {
    lines.push(
      `- [${item.role}] ${safeDelimitedText(item.id)}${
        item.label ? `: ${safeDelimitedText(item.label)}` : ""
      }`
    )
  }
  const asOf =
    time?.publishedAt ??
    time?.snapshotAt ??
    time?.observedAt ??
    time?.eventTime?.value
  const timeState =
    time?.completeness?.status ?? time?.window?.status ?? "unknown"
  lines.push(`As of: ${safeDelimitedText(asOf ?? "unknown")}`)
  lines.push(`Time state: ${safeDelimitedText(timeState)}`)
  if (form?.whyThisForm) {
    lines.push(`Form rationale: ${safeDelimitedText(form.whyThisForm)}`)
  }
  for (const alternative of form?.rejectedAlternatives ?? []) {
    lines.push(
      `Alternative: ${safeDelimitedText(alternative.representation)} — ${safeDelimitedText(alternative.reason)}`
    )
  }
  lines.push(
    `Source requests: ${
      contestability?.sourceRequestsAllowed === true
        ? "allowed"
        : contestability?.sourceRequestsAllowed === false
          ? "not allowed"
          : "not declared"
    }`
  )
  for (const challenge of contestability?.challenges ?? []) {
    lines.push(
      `Challenge [${safeDelimitedText(challenge.status)}] ${safeDelimitedText(challenge.id)}: ${safeDelimitedText(challenge.reason)}`
    )
  }
  for (const correction of contestability?.corrections ?? []) {
    lines.push(
      `Correction ${safeDelimitedText(correction.id)}: ${safeDelimitedText(correction.reason)}`
    )
  }
  const reviews = accountability?.reviews ?? []
  if (accountability) {
    lines.push(
      `Accountability: ${accountability.authors?.length ?? 0} author record(s), ${reviews.length} review record(s)`
    )
  }
  if (uncertainty.length) {
    lines.push("Uncertainty and open status:")
    uncertainty.forEach((note) => lines.push(`- ${safeDelimitedText(note)}`))
  }
  lines.push(UNTRUSTED_CONTENT_END)
  return lines.join("\n")
}

function truncateTextToCharacters(
  text: string,
  characterBudget: number
): { text: string; truncated: boolean } {
  const framedSuffix = `\n${GROUNDING_TRUNCATION_NOTICE}\n${UNTRUSTED_CONTENT_END}`
  const minimumBudget = UNTRUSTED_CONTENT_BEGIN.length + framedSuffix.length + 1
  const boundedCharacters = Math.max(minimumBudget, characterBudget)
  if (text.length <= boundedCharacters) return { text, truncated: false }
  const prefix = `${UNTRUSTED_CONTENT_BEGIN}\n`
  const body = text
    .slice(prefix.length, -UNTRUSTED_CONTENT_END.length)
    .trimEnd()
  const bodyBudget = Math.max(
    0,
    boundedCharacters - prefix.length - framedSuffix.length
  )
  return {
    text: `${prefix}${body.slice(0, bodyBudget).trimEnd()}${framedSuffix}`,
    truncated: true
  }
}

function normalizeTokenBudget(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_EFFECTIVE_TOKENS, Math.max(0, Math.floor(value)))
}

function serializedGroundingLength(grounding: ArtifactGrounding): number {
  return JSON.stringify(grounding).length
}

function refreshGroundingText(grounding: ArtifactGrounding): void {
  grounding.text = buildGroundingText(grounding)
}

function addGroundingOmissions(
  grounding: ArtifactGrounding,
  paths: ReadonlyArray<string>
): void {
  grounding.omittedPaths = [...new Set([...grounding.omittedPaths, ...paths])]
}

/**
 * Bound the complete serialized payload, not only its readable text. The
 * requested budget uses a deterministic four-character token approximation.
 * Very small requests retain a fixed 256-token identity, safety, and omission
 * envelope; `budget` reports both the requested and effective limits.
 *
 * Reductions remove whole semantic sections or optional record details. Claim
 * and evidence graphs are removed together, so a bounded result never leaves
 * dangling support references. Values are never shortened into new facts.
 */
export function applyGroundingBudget(
  grounding: ArtifactGrounding,
  tokenBudget: number
): ArtifactGrounding {
  const requestedTokens = normalizeTokenBudget(tokenBudget)
  const effectiveTokens = Math.max(MINIMUM_GROUNDING_TOKENS, requestedTokens)
  const characterLimit = effectiveTokens * CHARACTERS_PER_TOKEN
  grounding.budget = {
    requestedTokens,
    effectiveTokens,
    serializedCharacters: characterLimit,
    minimumEnvelopeApplied: requestedTokens < MINIMUM_GROUNDING_TOKENS
  }
  let budgetReduced = false
  const exceedsBudget = () =>
    serializedGroundingLength(grounding) > characterLimit
  const reduce = (
    paths: ReadonlyArray<string>,
    action: () => boolean,
    refreshText = true
  ) => {
    if (!exceedsBudget() || !action()) return
    addGroundingOmissions(grounding, paths)
    grounding.truncated = true
    budgetReduced = true
    if (refreshText) refreshGroundingText(grounding)
  }

  reduce(
    ["chart[budget]"],
    () => {
      if (!grounding.chart) return false
      delete grounding.chart
      grounding.security.rawDataIncluded = false
      return true
    },
    false
  )
  reduce(["accountability[budget]"], () => {
    if (!grounding.accountability) return false
    delete grounding.accountability
    return true
  })
  reduce(["form[budget]"], () => {
    if (!grounding.form) return false
    delete grounding.form
    return true
  })
  reduce(["time[budget]"], () => {
    if (!grounding.time) return false
    delete grounding.time
    return true
  })
  reduce(["contestability[budget]"], () => {
    if (!grounding.contestability && grounding.corrections.length === 0) {
      return false
    }
    delete grounding.contestability
    grounding.corrections = []
    return true
  })
  reduce(["uncertainty[budget]"], () => {
    if (grounding.uncertainty.length === 0) return false
    grounding.uncertainty = []
    return true
  })
  reduce(["evidence[].detail[budget]"], () => {
    const projected = grounding.evidence.map((item) => ({
      id: item.id,
      role: item.role,
      ...(item.transformation
        ? {
            transformation: {
              id: item.transformation.id,
              kind: item.transformation.kind,
              inputEvidenceIds: [...item.transformation.inputEvidenceIds]
            }
          }
        : {}),
      ...(item.generatedClaimId
        ? { generatedClaimId: item.generatedClaimId }
        : {})
    }))
    if (JSON.stringify(projected) === JSON.stringify(grounding.evidence)) {
      return false
    }
    grounding.evidence = projected
    grounding.security.evidenceSamplesIncluded = false
    return true
  })
  reduce(["claims[].detail[budget]"], () => {
    const projected = grounding.claims.map((claim) => ({
      id: claim.id,
      kind: claim.kind,
      status: claim.status,
      evidenceIds: [...claim.evidenceIds],
      ...(claim.supersedes ? { supersedes: [...claim.supersedes] } : {})
    }))
    if (JSON.stringify(projected) === JSON.stringify(grounding.claims)) {
      return false
    }
    grounding.claims = projected
    return true
  })
  reduce(["purpose.detail[budget]"], () => {
    const projected = {
      intents: grounding.purpose.intents.map(({ id }) => ({ id }))
    }
    if (JSON.stringify(projected) === JSON.stringify(grounding.purpose)) {
      return false
    }
    grounding.purpose = projected
    return true
  })
  reduce(["artifact.detail[budget]"], () => {
    const { id, kind } = grounding.artifact
    if (Object.keys(grounding.artifact).length === 2) return false
    grounding.artifact = { id, kind }
    return true
  })
  reduce(
    ["text[budget]"],
    () => {
      const result = truncateTextToCharacters(grounding.text, 0)
      if (!result.truncated) return false
      grounding.text = result.text
      return true
    },
    false
  )
  reduce(["claims[budget]", "evidence[budget]"], () => {
    if (grounding.claims.length === 0 && grounding.evidence.length === 0) {
      return false
    }
    grounding.claims = []
    grounding.evidence = []
    grounding.security.evidenceSamplesIncluded = false
    return true
  })
  reduce(["purpose.intents[budget]"], () => {
    if (grounding.purpose.intents.length === 0) return false
    grounding.purpose = { intents: [] }
    return true
  })
  reduce(
    ["omittedPaths[overflow]"],
    () => {
      const budgetPaths = grounding.omittedPaths.filter((path) =>
        path.endsWith("[budget]")
      )
      const projected = [...new Set([...budgetPaths, "omittedPaths[overflow]"])]
      if (
        JSON.stringify(projected) === JSON.stringify(grounding.omittedPaths)
      ) {
        return false
      }
      grounding.omittedPaths = projected
      return true
    },
    false
  )
  reduce(
    [],
    () => {
      const prioritized = grounding.omittedPaths
        .filter((path) => path.endsWith("[budget]"))
        .slice(0, 4)
      grounding.omittedPaths = [
        ...prioritized,
        "content[additional-budget-omissions]",
        "omittedPaths[overflow]"
      ]
      return true
    },
    false
  )
  reduce(
    [],
    () => {
      grounding.omittedPaths = ["$[budget]", "omittedPaths[overflow]"]
      return true
    },
    false
  )

  if (exceedsBudget()) {
    throw new RangeError(
      `Artifact identity and required grounding metadata exceed the ${effectiveTokens}-token effective grounding budget.`
    )
  }
  if (budgetReduced) grounding.truncated = true
  for (let index = 0; index < 4; index += 1) {
    const serializedCharacters = serializedGroundingLength(grounding)
    if (grounding.budget.serializedCharacters === serializedCharacters) break
    grounding.budget.serializedCharacters = serializedCharacters
  }
  return grounding
}
