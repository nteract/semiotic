import type { Datum } from "../charts/shared/datumTypes"
import type { IntentManifest } from "../ai/intentManifest"
import { canonicalJson, fingerprintValue } from "./fingerprint"
import { nonJsonValuePaths } from "./jsonCompatibility"
import {
  artifactConfigurationValue,
  artifactDataFingerprint,
  artifactDataValue
} from "./identity"
import {
  ARTIFACT_CONTRACT_VERSION,
  type ArtifactContract,
  type ArtifactContractInput,
  type ArtifactFieldState,
  type JsonObject,
  type PurposeIntent,
  type ReceptionChannel
} from "./types"
export {
  ARTIFACT_FIELD_POLICIES,
  type ArtifactFieldPolicy
} from "./fieldPolicies"
export {
  validateArtifactContract,
  type ArtifactContractValidation
} from "./validation"

function normalizedIntents(input: ArtifactContractInput): PurposeIntent[] {
  const source = input.intents ?? input.purpose?.intents ?? []
  if (typeof source === "string") {
    return [{ id: source, strength: "primary", source: "author" }]
  }
  if (source.length === 0) return []
  if (source.every((intent) => typeof intent === "string")) {
    return (source as string[]).map((id, index) => ({
      id,
      strength: index === 0 ? "primary" : "secondary",
      source: "author"
    }))
  }
  return (source as PurposeIntent[]).map((intent) => ({ ...intent }))
}

function slug(value: string): string {
  return (
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "artifact"
  )
}

function unknownState(reason: string): ArtifactFieldState {
  return { status: "unknown", reason, suppliedBy: "system", derived: true }
}

/**
 * Build the optional interpretation sidecar for a chart. Only configuration
 * and data identities are inferred automatically; purpose, stakes, evidence,
 * time, review, and approval remain unknown unless a caller supplies them.
 */
export function buildArtifactContract(
  component: string,
  props: Datum = {},
  input: ArtifactContractInput = {}
): ArtifactContract {
  const configuration = artifactConfigurationValue(props)
  const configFingerprint = fingerprintValue(configuration)
  const configIsSerializable = nonJsonValuePaths(configuration).length === 0
  const data = artifactDataValue(props)
  const dataIsSerializable =
    data === undefined ||
    (nonJsonValuePaths(data).length === 0 &&
      nonJsonValuePaths(input.evidence ?? []).length === 0)
  const dataFingerprint = dataIsSerializable
    ? artifactDataFingerprint(data, input.evidence)
    : undefined
  const intents = normalizedIntents(input)
  const title =
    input.title ?? (typeof props.title === "string" ? props.title : undefined)
  const fieldStatus: Record<string, ArtifactFieldState> = {
    ...(!configIsSerializable
      ? {
          "artifact.configFingerprint": unknownState(
            "The chart configuration contains runtime-only values and cannot receive a portable configuration identity."
          )
        }
      : {}),
    ...(intents.length === 0
      ? {
          "purpose.intents": unknownState(
            "No author, import, or deterministic classifier supplied a purpose."
          )
        }
      : {}),
    ...(dataFingerprint
      ? {}
      : {
          "artifact.dataFingerprint": unknownState(
            data === undefined
              ? "No serializable chart data was supplied."
              : "The chart data or transformation record contains values that cannot receive a portable data identity."
          )
        }),
    ...((input.claims ?? []).length === 0
      ? {
          claims: unknownState("No artifact-level claims were supplied.")
        }
      : {}),
    ...((input.evidence ?? []).length === 0
      ? {
          evidence: unknownState("No artifact-level evidence was supplied.")
        }
      : {}),
    ...(!input.time
      ? {
          time: unknownState(
            "No event, processing, publication, or snapshot time was supplied."
          )
        }
      : {}),
    ...input.fieldStatus
  }
  const id =
    input.id ?? `${slug(component)}-${configFingerprint.digest.slice(0, 12)}`

  return {
    contractVersion: ARTIFACT_CONTRACT_VERSION,
    artifact: {
      id,
      kind: input.kind ?? "chart",
      component,
      ...(title ? { title } : {}),
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      ...(input.revision ? { revision: input.revision } : {}),
      ...(configIsSerializable
        ? { configFingerprint: configFingerprint.fingerprint }
        : {}),
      ...(dataFingerprint ? { dataFingerprint } : {})
    },
    purpose: {
      ...input.purpose,
      intents
    },
    claims: (input.claims ?? []).map((claim) => ({ ...claim })),
    evidence: (input.evidence ?? []).map((evidence) => ({ ...evidence })),
    ...(input.time ? { time: input.time } : {}),
    ...(input.reception ? { reception: input.reception } : {}),
    ...(input.form ? { form: input.form } : {}),
    ...(input.contestability ? { contestability: input.contestability } : {}),
    ...(input.accountability ? { accountability: input.accountability } : {}),
    ...(input.inheritance ? { inheritance: input.inheritance } : {}),
    ...(Object.keys(fieldStatus).length > 0 ? { fieldStatus } : {}),
    ...(input.extensions ? { extensions: input.extensions } : {})
  }
}

export interface IntentManifestProjection {
  manifest: IntentManifest
  omittedPaths: string[]
}

/** Update mapped legacy fields, removing stale values when explicitly absent. */
function updateFields<T extends object>(target: T, fields: Partial<T>): T {
  for (const key of Object.keys(fields) as (keyof T)[]) {
    if (fields[key] === undefined) delete target[key]
    else target[key] = fields[key] as T[typeof key]
  }
  return target
}

const RECEPTION_CHANNELS: ReadonlyArray<ReceptionChannel> = [
  "visual",
  "screen-reader",
  "sonified",
  "agent",
  "print",
  "low-bandwidth"
]

/** Adapt the earlier intent manifest into the broader artifact contract. */
export function fromIntentManifest(manifest: IntentManifest): ArtifactContract {
  const intents: PurposeIntent[] = [
    {
      id: manifest.intent.primary,
      strength: "primary",
      source: "import"
    },
    ...(manifest.intent.secondary ?? []).map((id) => ({
      id,
      strength: "secondary" as const,
      source: "import" as const
    }))
  ]
  const importedChannels = manifest.reception?.channels ?? []
  const channels = importedChannels
    .filter((channel): channel is ReceptionChannel =>
      RECEPTION_CHANNELS.includes(channel as ReceptionChannel)
    )
    .map((channel) => ({ channel }))
  const unsupportedChannels = importedChannels.filter(
    (channel) => !RECEPTION_CHANNELS.includes(channel as ReceptionChannel)
  )
  return {
    contractVersion: ARTIFACT_CONTRACT_VERSION,
    artifact: {
      id: manifest.chartId,
      kind: "chart",
      ...(manifest.title ? { title: manifest.title } : {}),
      ...(manifest.createdAt ? { createdAt: manifest.createdAt } : {})
    },
    purpose: {
      intents,
      ...(manifest.intent.communicativeAct
        ? { communicativeAct: manifest.intent.communicativeAct }
        : {})
    },
    claims: [],
    evidence: [],
    ...(manifest.reception || manifest.audience || manifest.accessibility
      ? {
          reception: {
            channels,
            ...(manifest.audience?.primary
              ? { audience: manifest.audience.primary }
              : {}),
            ...(manifest.reception?.strengths
              ? { strengths: manifest.reception.strengths }
              : {}),
            ...(manifest.reception?.risks
              ? { risks: manifest.reception.risks }
              : {}),
            ...(manifest.reception?.scaffolds
              ? { scaffolds: manifest.reception.scaffolds }
              : {}),
            ...(manifest.accessibility?.description
              ? { description: manifest.accessibility.description }
              : {}),
            ...(manifest.accessibility?.dataFallback !== undefined
              ? { dataFallback: manifest.accessibility.dataFallback }
              : {}),
            ...(manifest.accessibility?.manualChecks
              ? { manualChecks: manifest.accessibility.manualChecks }
              : {})
          }
        }
      : {}),
    ...(manifest.designContract
      ? {
          form: {
            chartFamily: manifest.designContract.chartFamily,
            whyThisForm:
              manifest.designContract.whyThisForm ??
              manifest.designContract.whyNotDefault,
            risks: manifest.designContract.risks,
            misuse: manifest.designContract.misuse
          }
        }
      : {}),
    ...(manifest.provenance || manifest.author
      ? {
          accountability: {
            ...(manifest.author
              ? { authors: [{ name: manifest.author, kind: "human" as const }] }
              : {}),
            dataSources: manifest.provenance?.dataSources,
            codeRef: manifest.provenance?.code,
            generatedBy: manifest.provenance?.generatedBy,
            ...(manifest.provenance?.reviewStatus
              ? {
                  reviews: [
                    {
                      id: "imported-review",
                      status:
                        manifest.provenance.reviewStatus === "approved"
                          ? ("approved" as const)
                          : ("pending" as const),
                      rationale: manifest.provenance.reviewStatus
                    }
                  ]
                }
              : {})
          }
        }
      : {}),
    fieldStatus: {
      claims: unknownState(
        "The earlier manifest format did not represent artifact-level claims."
      ),
      evidence: unknownState(
        "The earlier manifest format did not represent artifact-level evidence."
      ),
      time: unknownState(
        manifest.lifecycle
          ? "The earlier manifest supplied a refresh policy but no event, processing, publication, or snapshot clock."
          : "The earlier manifest supplied no lifecycle or clock metadata."
      ),
      ...(unsupportedChannels.length > 0
        ? {
            "reception.channels": unknownState(
              `Unsupported imported channels were preserved only in the source manifest: ${unsupportedChannels.join(", ")}.`
            )
          }
        : {})
    },
    extensions: {
      "semiotic.intent-manifest.v0.1": canonicalJson(manifest)
        .value as JsonObject
    }
  }
}

/**
 * Project a contract back to the earlier manifest format and report the richer
 * paths that format cannot carry.
 */
export function toIntentManifest(
  contract: ArtifactContract
): IntentManifestProjection {
  const primary =
    contract.purpose.intents.find((intent) => intent.strength === "primary") ??
    contract.purpose.intents[0]
  const secondary = contract.purpose.intents
    .filter((intent) => intent !== primary)
    .map((intent) => intent.id)
  const channels =
    contract.reception?.channels.map(({ channel }) => channel) ?? []
  const review = contract.accountability?.reviews?.at(-1)
  const preserved = contract.extensions?.[
    "semiotic.intent-manifest.v0.1"
  ] as unknown as IntentManifest | undefined
  const omittedPaths = [
    ...(contract.artifact.kind !== "chart" ? ["artifact.kind"] : []),
    ...(contract.artifact.component ? ["artifact.component"] : []),
    ...(contract.artifact.configFingerprint
      ? ["artifact.configFingerprint"]
      : []),
    ...(contract.artifact.dataFingerprint ? ["artifact.dataFingerprint"] : []),
    ...(contract.artifact.revision ? ["artifact.revision"] : []),
    ...(contract.purpose.intents.some(({ source }) => source !== undefined)
      ? ["purpose.intents[].source"]
      : []),
    ...(contract.purpose.intents.some(
      ({ rationale }) => rationale !== undefined
    )
      ? ["purpose.intents[].rationale"]
      : []),
    ...(contract.purpose.decisionContext ? ["purpose.decisionContext"] : []),
    ...(contract.purpose.stakes ? ["purpose.stakes"] : []),
    ...(contract.purpose.allowedUses?.length ? ["purpose.allowedUses"] : []),
    ...(contract.purpose.prohibitedUses?.length
      ? ["purpose.prohibitedUses"]
      : []),
    ...(contract.claims.length > 0 ? ["claims"] : []),
    ...(contract.evidence.length > 0 ? ["evidence"] : []),
    ...(contract.time ? ["time"] : []),
    ...(contract.reception?.channels.some(
      ({
        disclosure,
        navigation,
        interactionInstructions,
        rawData,
        tokenBudget,
        privacyNotes
      }) =>
        disclosure !== undefined ||
        navigation !== undefined ||
        interactionInstructions !== undefined ||
        rawData !== undefined ||
        tokenBudget !== undefined ||
        (privacyNotes?.length ?? 0) > 0
    )
      ? ["reception.channels[]"]
      : []),
    ...(contract.form?.rejectedAlternatives?.length
      ? ["form.rejectedAlternatives"]
      : []),
    ...(contract.contestability ? ["contestability"] : []),
    ...(contract.inheritance ? ["inheritance"] : []),
    ...((contract.accountability?.authors?.length ?? 0) > 1 ||
    contract.accountability?.authors?.some(
      ({ id, name, kind }) => id !== undefined || !name || kind !== "human"
    )
      ? ["accountability.authors"]
      : []),
    ...(contract.accountability?.reviews?.length
      ? ["accountability.reviews"]
      : []),
    ...(contract.accountability?.actions?.length
      ? ["accountability.actions"]
      : []),
    ...(Object.keys(contract.fieldStatus ?? {}).length > 0
      ? ["fieldStatus"]
      : []),
    ...(Object.keys(contract.extensions ?? {}).some(
      (key) => key !== "semiotic.intent-manifest.v0.1"
    )
      ? ["extensions"]
      : [])
  ]
  const manifest: IntentManifest = preserved
    ? (JSON.parse(JSON.stringify(preserved)) as IntentManifest)
    : {
        ididVersion: "0.1",
        chartId: contract.artifact.id,
        intent: {
          primary: primary?.id ?? "unknown"
        }
      }

  updateFields(manifest, {
    chartId: contract.artifact.id,
    title: contract.artifact.title,
    createdAt: contract.artifact.createdAt,
    author: contract.accountability?.authors?.[0]?.name
  })
  manifest.intent = updateFields(
    {
      ...manifest.intent,
      primary: primary?.id ?? "unknown"
    },
    {
      secondary: secondary.length ? secondary : undefined,
      communicativeAct: contract.purpose.communicativeAct || undefined
    }
  )

  if (contract.reception) {
    manifest.reception = updateFields(
      {
        ...manifest.reception,
        channels
      },
      {
        strengths: contract.reception.strengths,
        risks: contract.reception.risks,
        scaffolds: contract.reception.scaffolds
      }
    )
    const audience = updateFields(
      { ...manifest.audience },
      {
        primary: contract.reception.audience
      }
    )
    if (Object.keys(audience).length > 0) manifest.audience = audience
    else delete manifest.audience

    const accessibility = updateFields(
      { ...manifest.accessibility },
      {
        description: contract.reception.description,
        dataFallback: contract.reception.dataFallback,
        manualChecks: contract.reception.manualChecks
      }
    )
    if (Object.keys(accessibility).length > 0)
      manifest.accessibility = accessibility
    else delete manifest.accessibility
  } else {
    delete manifest.reception
    delete manifest.audience
    delete manifest.accessibility
  }
  if (contract.form) {
    const designContract = updateFields(
      { ...manifest.designContract },
      {
        chartFamily: contract.form.chartFamily,
        whyThisForm: contract.form.whyThisForm,
        risks: contract.form.risks,
        misuse: contract.form.misuse
      }
    )
    if (contract.form.whyThisForm === undefined) {
      delete designContract.whyNotDefault
    }
    if (Object.keys(designContract).length > 0)
      manifest.designContract = designContract
    else delete manifest.designContract
  } else {
    delete manifest.designContract
  }
  if (contract.accountability) {
    const provenance = updateFields(
      { ...manifest.provenance },
      {
        dataSources: contract.accountability.dataSources,
        code: contract.accountability.codeRef,
        generatedBy: contract.accountability.generatedBy,
        reviewStatus: review?.rationale ?? review?.status
      }
    )
    if (Object.keys(provenance).length > 0) manifest.provenance = provenance
    else delete manifest.provenance
  } else {
    delete manifest.provenance
  }

  return {
    manifest,
    omittedPaths
  }
}

export interface FormatArtifactContractOptions {
  /** Include explicit unknown, manual, and not-applicable field states. */
  includeFieldStatus?: boolean
  /** Override the separator used between output lines. */
  lineSeparator?: string
}

/** Compact text for logs, CLI output, and progressive disclosure headers. */
export function formatArtifactContract(
  contract: ArtifactContract,
  options: FormatArtifactContractOptions = {}
): string {
  const title = contract.artifact.title ?? contract.artifact.id
  const intents =
    contract.purpose.intents.map(({ id }) => id).join(", ") || "unknown"
  const claimCounts = contract.claims.reduce<Record<string, number>>(
    (counts, claim) => {
      counts[claim.status] = (counts[claim.status] ?? 0) + 1
      return counts
    },
    {}
  )
  const claims =
    contract.claims.length === 0
      ? "no declared claims"
      : Object.entries(claimCounts)
          .map(([status, count]) => `${count} ${status}`)
          .join(", ")
  const time =
    contract.time?.completeness?.status ??
    contract.time?.window?.status ??
    contract.fieldStatus?.time?.status ??
    "unknown"
  const lines = [
    `${title} (${contract.artifact.kind})`,
    `Purpose: ${intents}`,
    `Claims: ${claims}`,
    `Time state: ${time}`,
    `Evidence references: ${contract.evidence.length}`
  ]
  if (options.includeFieldStatus) {
    const statuses = Object.entries(contract.fieldStatus ?? {}).sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)
    )
    lines.push(
      statuses.length === 0
        ? "Open fields: none declared"
        : `Open fields: ${statuses
            .map(([path, field]) => `${path}=${field.status}`)
            .join(", ")}`
    )
  }
  return lines.join(options.lineSeparator ?? "\n")
}
