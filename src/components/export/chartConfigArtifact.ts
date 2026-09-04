import type { Datum } from "../charts/shared/datumTypes"
import {
  ARTIFACT_CONTRACT_VERSION,
  type ArtifactContract
} from "../artifact/types"
import {
  requireSerializableArtifactContract,
  serializeArtifactContract,
  type ArtifactTransferStatus
} from "../artifact/serialization"
import { fingerprintValue } from "../artifact/fingerprint"
import {
  artifactConfigurationValue,
  artifactDataValue,
  compareArtifactIdentity as compareIdentity
} from "../artifact/identity"
import type {
  ChartArtifactTransferStatus,
  ChartConfig,
  FromConfigResult
} from "./chartConfig"

const DATA_PROPS = new Set([
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows"
])

export type ChartArtifactBindingContext = Pick<
  ChartConfig,
  | "version"
  | "createdAt"
  | "recipeId"
  | "portable"
  | "manifest"
  | "reason"
  | "warnings"
  | "selections"
>

function compareArtifactIdentity(
  contract: ArtifactContract,
  props: Datum,
  component?: string
): { mismatchPaths: string[] } {
  const comparison = compareIdentity(contract, props, component)
  return {
    mismatchPaths: [
      ...comparison.mismatchPaths,
      ...(component !== undefined &&
      comparison.unknownPaths.includes("artifact.component")
        ? ["artifact.component"]
        : [])
    ]
  }
}

function changedPropPaths(
  sourceProps: Datum,
  serializedProps: Datum
): string[] {
  return [
    ...new Set([...Object.keys(sourceProps), ...Object.keys(serializedProps)])
  ]
    .filter((key) => {
      const sourcePresent = Object.prototype.hasOwnProperty.call(
        sourceProps,
        key
      )
      const serializedPresent = Object.prototype.hasOwnProperty.call(
        serializedProps,
        key
      )
      if (sourcePresent !== serializedPresent) return true
      const source = fingerprintValue(sourceProps[key])
      const serialized = fingerprintValue(serializedProps[key])
      return (
        source.excludedPaths.length > 0 ||
        source.fingerprint !== serialized.fingerprint
      )
    })
    .map((key) => `props.${key}`)
    .sort()
}

function omittedPropKey(path: string): string | undefined {
  if (!path.startsWith("props.")) return undefined
  return path.slice("props.".length).split(/[.[\]]/, 1)[0]
}

function omittedPropsExplainMismatch(
  mismatchPath: string,
  omittedPaths: string[]
): boolean {
  const omittedPropKeys = omittedPaths
    .map(omittedPropKey)
    .filter((key): key is string => key !== undefined)
  if (mismatchPath === "artifact.dataFingerprint") {
    return omittedPropKeys.some((key) => DATA_PROPS.has(key))
  }
  if (mismatchPath === "artifact.configFingerprint") {
    return omittedPropKeys.some((key) => !DATA_PROPS.has(key))
  }
  return false
}

const ARTIFACT_TRANSFER_STATUSES = new Set([
  "preserved",
  "unsupported-version",
  "invalid",
  "excluded"
])

function isArtifactTransferStatus(
  value: unknown
): value is ChartArtifactTransferStatus {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<ChartArtifactTransferStatus>
  const serializedDataFingerprint = candidate.serializedDataFingerprint
  return (
    typeof candidate.status === "string" &&
    ARTIFACT_TRANSFER_STATUSES.has(candidate.status) &&
    Array.isArray(candidate.omittedPaths) &&
    candidate.omittedPaths.every((path) => typeof path === "string") &&
    Array.isArray(candidate.warnings) &&
    candidate.warnings.every((warning) => typeof warning === "string") &&
    (candidate.serializedConfigFingerprint === undefined ||
      typeof candidate.serializedConfigFingerprint === "string") &&
    (serializedDataFingerprint === undefined ||
      serializedDataFingerprint === null ||
      typeof serializedDataFingerprint === "string") &&
    (candidate.transferFingerprint === undefined ||
      typeof candidate.transferFingerprint === "string")
  )
}

function transferFingerprintValue(
  transfer: ChartArtifactTransferStatus,
  component: string,
  artifactContract: ChartConfig["artifactContract"],
  context: ChartArtifactBindingContext
): string {
  const boundReport = {
    component,
    version: context.version,
    createdAt: context.createdAt,
    ...(context.recipeId !== undefined ? { recipeId: context.recipeId } : {}),
    ...(context.portable !== undefined ? { portable: context.portable } : {}),
    ...(context.manifest !== undefined ? { manifest: context.manifest } : {}),
    ...(context.reason !== undefined ? { reason: context.reason } : {}),
    ...(context.warnings !== undefined ? { warnings: context.warnings } : {}),
    ...(context.selections !== undefined
      ? { selections: context.selections }
      : {}),
    artifactContract,
    status: transfer.status,
    omittedPaths: transfer.omittedPaths,
    warnings: transfer.warnings,
    ...(transfer.serializedConfigFingerprint !== undefined
      ? {
          serializedConfigFingerprint: transfer.serializedConfigFingerprint
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(
      transfer,
      "serializedDataFingerprint"
    )
      ? { serializedDataFingerprint: transfer.serializedDataFingerprint }
      : {})
  }
  return fingerprintValue(boundReport).fingerprint
}

function withSerializedIdentity(
  transfer: ArtifactTransferStatus,
  component: string,
  props: Datum,
  artifactContract: ChartConfig["artifactContract"],
  context: ChartArtifactBindingContext
): ChartArtifactTransferStatus {
  const data = artifactDataValue(props)
  const boundReport: ChartArtifactTransferStatus = {
    ...transfer,
    serializedConfigFingerprint: fingerprintValue(
      artifactConfigurationValue(props)
    ).fingerprint,
    serializedDataFingerprint:
      data === undefined ? null : fingerprintValue(data).fingerprint
  }
  return {
    ...boundReport,
    transferFingerprint: transferFingerprintValue(
      boundReport,
      component,
      artifactContract,
      context
    )
  }
}

function transferBindingProblems(
  transfer: ChartArtifactTransferStatus,
  config: ChartConfig
): string[] {
  const problems: string[] = []
  const configurationFingerprint = fingerprintValue(
    artifactConfigurationValue(config.props)
  ).fingerprint
  const data = artifactDataValue(config.props)
  const dataFingerprint =
    data === undefined ? null : fingerprintValue(data).fingerprint
  if (
    transfer.transferFingerprint !== undefined &&
    transfer.transferFingerprint !==
      transferFingerprintValue(
        transfer,
        config.component,
        config.artifactContract,
        config
      )
  ) {
    problems.push("artifactTransfer.transferFingerprint")
  }
  if (
    transfer.serializedConfigFingerprint !== undefined &&
    transfer.serializedConfigFingerprint !== configurationFingerprint
  ) {
    problems.push("artifactTransfer.serializedConfigFingerprint")
  }
  if (
    Object.prototype.hasOwnProperty.call(
      transfer,
      "serializedDataFingerprint"
    ) &&
    transfer.serializedDataFingerprint !== dataFingerprint
  ) {
    problems.push("artifactTransfer.serializedDataFingerprint")
  }
  return problems
}

function transferPathIsPresent(config: ChartConfig, path: string): boolean {
  if (path === "artifactContract" || path === "$.artifactContract") {
    return config.artifactContract !== undefined
  }
  let current: unknown
  let normalized: string
  if (path === "props" || path.startsWith("props.")) {
    current = config
    normalized = path
  } else {
    current = config.artifactContract
    normalized = path.startsWith("$.") ? path.slice(2) : path
  }
  if (normalized === "$" || normalized === "") return current !== undefined
  const segments = [
    ...normalized.matchAll(/(?:^|\.)([^.[\]]+)|\[(\d+)\]/g)
  ].map((match) => match[1] ?? Number(match[2]))
  if (segments.length === 0) return false
  for (const segment of segments) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return false
    }
    current = (current as Record<string | number, unknown>)[segment]
  }
  return true
}

const deepClone: <T>(obj: T) => T =
  typeof structuredClone === "function"
    ? structuredClone
    : <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T

export function artifactConfigFields(
  component: string,
  contract: ArtifactContract | undefined,
  sourceProps: Datum,
  serializedProps: Datum,
  context: ChartArtifactBindingContext
): Pick<ChartConfig, "artifactContract" | "artifactTransfer"> {
  if (!contract) return {}
  const serialized = requireSerializableArtifactContract(contract)
  const identityComponent = context.recipeId ?? component
  const sourceIdentity = compareArtifactIdentity(
    contract,
    sourceProps,
    identityComponent
  )
  const changedPaths = changedPropPaths(sourceProps, serializedProps)
  const serializedIdentity = compareArtifactIdentity(
    contract,
    serializedProps,
    identityComponent
  )
  if (sourceIdentity.mismatchPaths.length > 0) {
    return {
      artifactContract: serialized.contract,
      artifactTransfer: withSerializedIdentity(
        {
          status: "invalid",
          omittedPaths: sourceIdentity.mismatchPaths,
          warnings: [
            "The artifact contract fingerprints do not match the supplied chart props or data."
          ]
        },
        component,
        serializedProps,
        serialized.contract,
        context
      )
    }
  }
  if (changedPaths.length > 0) {
    return {
      artifactContract: serialized.contract,
      artifactTransfer: withSerializedIdentity(
        {
          status: "excluded",
          omittedPaths: changedPaths,
          warnings: [
            "Chart props or data were excluded from the serialized configuration."
          ]
        },
        component,
        serializedProps,
        serialized.contract,
        context
      )
    }
  }
  if (serializedIdentity.mismatchPaths.length > 0) {
    return {
      artifactContract: serialized.contract,
      artifactTransfer: withSerializedIdentity(
        {
          status: "invalid",
          omittedPaths: serializedIdentity.mismatchPaths,
          warnings: [
            "Serialized chart props or data differ from the values bound to the artifact contract."
          ]
        },
        component,
        serializedProps,
        serialized.contract,
        context
      )
    }
  }
  return {
    artifactContract: serialized.contract,
    artifactTransfer: withSerializedIdentity(
      serialized.transfer,
      component,
      serializedProps,
      serialized.contract,
      context
    )
  }
}

export function restoredArtifactFields(
  config: ChartConfig
): Pick<FromConfigResult, "artifactContract" | "artifactTransfer"> {
  if (!config.artifactContract) {
    if (!config.artifactTransfer) return {}
    if (
      isArtifactTransferStatus(config.artifactTransfer) &&
      config.artifactTransfer.status === "excluded" &&
      config.artifactTransfer.omittedPaths.includes("artifactContract")
    ) {
      const presentOmissions = config.artifactTransfer.omittedPaths.filter(
        (path) =>
          path !== "artifactContract" && transferPathIsPresent(config, path)
      )
      if (presentOmissions.length === 0) {
        return { artifactTransfer: deepClone(config.artifactTransfer) }
      }
      return {
        artifactTransfer: {
          status: "invalid",
          omittedPaths: [...config.artifactTransfer.omittedPaths],
          warnings: [
            `The declared omitted path is still present: ${presentOmissions.join(", ")}.`
          ]
        }
      }
    }
    return {
      artifactTransfer: {
        status: "invalid",
        omittedPaths: ["artifactContract"],
        warnings: [
          "An artifact transfer report cannot claim preservation without an artifact contract."
        ]
      }
    }
  }

  const serialized = serializeArtifactContract(config.artifactContract)
  const declared = config.artifactTransfer
  const actual = serialized.transfer
  let transfer: ChartArtifactTransferStatus = (() => {
    if (!declared) {
      return {
        status: "invalid",
        omittedPaths: [
          ...new Set([...actual.omittedPaths, "artifactTransfer"])
        ],
        warnings: [
          ...actual.warnings,
          "The artifact contract has no transfer report, so its transport history cannot be verified."
        ]
      }
    }
    if (!isArtifactTransferStatus(declared)) {
      return {
        status: "invalid",
        omittedPaths: actual.omittedPaths,
        warnings: [
          ...actual.warnings,
          "The declared artifact transfer report is malformed."
        ]
      }
    }
    const presentOmissions =
      declared.status === "excluded" ||
      declared.status === "unsupported-version"
        ? declared.omittedPaths.filter((path) =>
            transferPathIsPresent(config, path)
          )
        : []
    if (presentOmissions.length > 0) {
      return {
        status: "invalid",
        omittedPaths: [
          ...new Set([...declared.omittedPaths, ...actual.omittedPaths])
        ],
        warnings: [
          ...actual.warnings,
          `The declared omitted path is still present: ${presentOmissions.join(", ")}.`
        ]
      }
    }
    if (
      (declared.status === "preserved" && declared.omittedPaths.length > 0) ||
      (declared.status === "excluded" && declared.omittedPaths.length === 0)
    ) {
      return {
        status: "invalid",
        omittedPaths: [
          ...new Set([...declared.omittedPaths, ...actual.omittedPaths])
        ],
        warnings: [
          ...actual.warnings,
          "The declared artifact transfer status contradicts its omitted paths."
        ]
      }
    }
    if (declared.status === actual.status) return deepClone(declared)
    if (
      actual.status === "preserved" &&
      (declared.status === "excluded" || declared.status === "invalid") &&
      declared.omittedPaths.length > 0
    ) {
      return deepClone(declared)
    }
    return {
      status: "invalid",
      omittedPaths: [
        ...new Set([...declared.omittedPaths, ...actual.omittedPaths])
      ],
      warnings: [
        ...new Set([
          ...declared.warnings,
          ...actual.warnings,
          `Declared artifact transfer status ${declared.status} does not match the restored contract status ${actual.status}.`
        ])
      ]
    }
  })()

  if (declared && isArtifactTransferStatus(declared)) {
    const bindingProblems = transferBindingProblems(declared, config)
    const needsBinding = declared.status !== "invalid"
    const missingBindings = [
      ...(needsBinding && declared.serializedConfigFingerprint === undefined
        ? ["artifactTransfer.serializedConfigFingerprint"]
        : []),
      ...(needsBinding &&
      !Object.prototype.hasOwnProperty.call(
        declared,
        "serializedDataFingerprint"
      )
        ? ["artifactTransfer.serializedDataFingerprint"]
        : []),
      ...(needsBinding && declared.transferFingerprint === undefined
        ? ["artifactTransfer.transferFingerprint"]
        : [])
    ]
    if (bindingProblems.length > 0 || missingBindings.length > 0) {
      transfer = {
        status: "invalid",
        omittedPaths: [
          ...new Set([
            ...transfer.omittedPaths,
            ...bindingProblems,
            ...missingBindings
          ])
        ],
        warnings: [
          ...new Set([
            ...transfer.warnings,
            bindingProblems.length > 0
              ? "The serialized chart payload no longer matches its transfer fingerprints."
              : "The declared chart transfer cannot be verified without serialized transfer fingerprints."
          ])
        ]
      }
    }
  }

  if (
    serialized.transfer.status === "preserved" &&
    serialized.contract?.contractVersion === ARTIFACT_CONTRACT_VERSION
  ) {
    const identity = compareArtifactIdentity(
      serialized.contract as ArtifactContract,
      config.props,
      config.recipeId ?? config.component
    )
    const unexplainedMismatches = identity.mismatchPaths.filter(
      (path) => !omittedPropsExplainMismatch(path, transfer.omittedPaths)
    )
    if (unexplainedMismatches.length > 0) {
      transfer = {
        status: "invalid",
        omittedPaths: [
          ...new Set([...transfer.omittedPaths, ...unexplainedMismatches])
        ],
        warnings: [
          ...new Set([
            ...transfer.warnings,
            "Restored chart props or data do not match the artifact contract fingerprints."
          ])
        ]
      }
    }
  }
  return {
    ...(serialized.contract ? { artifactContract: serialized.contract } : {}),
    artifactTransfer: transfer
  }
}
