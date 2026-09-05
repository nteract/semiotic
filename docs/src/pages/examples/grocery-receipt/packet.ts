import {
  buildArtifactContract,
  fingerprintValue,
  requireSerializableArtifactContract,
} from "semiotic/artifact"
import type { JsonObject } from "semiotic/artifact"
import { summary } from "./format"
import { receiptValues } from "./exports"
import { prepareBasket } from "./prepare"
import { QUALIFICATION, STORY_URL } from "./items"
import { contributionChartProps } from "./chart-config"
import type { BasketState, GrocerySnapshot, PreparedBasket } from "./types"

export interface NumericalBinding {
  id: string
  operation: "sum" | "difference" | "percentage-change" | "item-contribution"
  target: "beforeUSD" | "afterUSD" | "differenceUSD" | "percentageChange" | "contributionUSD"
  itemId: string | null
  stateId: string
  baseline: string
  unit: "USD" | "percent"
  inputRowIds: string[]
  expected: number | null
  tolerance: number
  displayDecimals: number
}

export function numericalBindings(receipt: PreparedBasket): NumericalBinding[] {
  const rowIds = [
    ...new Set(receipt.rows.filter((row) => row.included).flatMap((row) => row.sourceRowIds)),
  ].sort()
  const base = { stateId: receipt.stateId, baseline: receipt.state.before, tolerance: 1e-10 }
  return [
    ...(["beforeUSD", "afterUSD", "differenceUSD", "percentageChange"] as const).map((target) => ({
      ...base,
      id: `receipt:${target}`,
      target,
      itemId: null,
      operation: (target === "differenceUSD"
        ? "difference"
        : target === "percentageChange"
          ? "percentage-change"
          : "sum") as NumericalBinding["operation"],
      unit: (target === "percentageChange" ? "percent" : "USD") as NumericalBinding["unit"],
      inputRowIds: rowIds,
      expected: receipt[target],
      displayDecimals: target === "percentageChange" ? 1 : 2,
    })),
    ...receipt.rows.map((row) => ({
      ...base,
      id: `receipt:contribution:${row.itemId}`,
      target: "contributionUSD" as const,
      itemId: row.itemId,
      operation: "item-contribution" as const,
      unit: "USD" as const,
      inputRowIds: [...row.sourceRowIds].sort(),
      expected: row.contributionUSD,
      displayDecimals: 2,
    })),
  ]
}

export function evaluateNumericalBindings(
  snapshot: GrocerySnapshot,
  state: BasketState,
  bindings: NumericalBinding[],
) {
  const actual = numericalBindings(prepareBasket(snapshot, state))
  return actual
    .map((binding) => {
      const candidates = bindings.filter((candidate) => candidate.id === binding.id)
      if (candidates.length !== 1)
        return {
          id: binding.id,
          status: "fail",
          reason: "Missing or duplicated numerical binding.",
        }
      const expected = candidates[0]
      const { expected: assertion, ...meaning } = expected
      const { expected: result, ...actualMeaning } = binding
      if (fingerprintValue(meaning).fingerprint !== fingerprintValue(actualMeaning).fingerprint)
        return {
          id: binding.id,
          status: "fail",
          reason: "Identity, operation, units, inputs, or baseline differ.",
        }
      if (result === null)
        return {
          id: binding.id,
          status: assertion === null ? "unknown" : "fail",
          reason: "Required price or eligible denominator is unavailable.",
        }
      return {
        id: binding.id,
        status:
          typeof assertion === "number" &&
          Number.isFinite(assertion) &&
          Math.abs(assertion - result) <= binding.tolerance
            ? "pass"
            : "fail",
        reason: "Recomputed from the named source rows and fixed quantities.",
      }
    })
    .concat(
      bindings
        .filter((binding) => !actual.some((candidate) => candidate.id === binding.id))
        .map((binding) => ({ id: binding.id, status: "fail", reason: "Unknown numerical claim." })),
    )
}

export function buildReceiptPacket(snapshot: GrocerySnapshot, state: BasketState) {
  const receipt = prepareBasket(snapshot, state)
  const bindings = numericalBindings(receipt)
  const props = contributionChartProps(receipt)
  const json = (value: unknown): JsonObject => JSON.parse(JSON.stringify(value))
  const contract = buildArtifactContract("BarChart", props, {
    id: "E01-receipt-contributions",
    title: "Your grocery bill has a memory",
    revision: receipt.stateId,
    createdAt: snapshot.retrievedAt,
    intents: ["compare", "explain"],
    purpose: {
      allowedUses: ["Compare a fixed illustrative basket across two observation months"],
      prohibitedUses: [
        "Official CPI estimate",
        "Local store quote",
        "Household inflation estimate",
        "Causal attribution",
      ],
    },
    claims: bindings.map((binding) => ({
      id: binding.id,
      kind: "aggregation",
      status: binding.expected === null ? "unknown" : "provisional",
      text: `${binding.id}: ${binding.expected === null ? "unavailable" : binding.expected} ${binding.unit}`,
      evidenceIds: ["basket-calculation"],
      authoredBy: { kind: "system", id: "e01-basket-adapter" },
      scope: {
        unit: binding.unit,
        geography: snapshot.geography,
        baseline: state.before,
        comparisonMonth: state.after,
        basket: receipt.stateId,
        denominator:
          binding.target === "percentageChange"
            ? "Positive fixed-basket cost in the baseline month"
            : "not applicable",
      },
    })),
    evidence: [
      {
        id: "bls-snapshot",
        role: "source-data",
        dataVersion: snapshot.editionId,
        fingerprint: fingerprintValue(snapshot.rows).fingerprint,
        source: {
          name: "BLS average-price series",
          uri: `${STORY_URL}#sources`,
          version: snapshot.editionId,
          retrievedAt: snapshot.retrievedAt,
          publisher: "U.S. Bureau of Labor Statistics",
        },
      },
      {
        id: "basket-calculation",
        role: "transformation",
        transformation: {
          id: snapshot.transformVersion,
          kind: "aggregation",
          inputEvidenceIds: ["bls-snapshot"],
          description:
            "Integer thousandths of USD multiplied by quarter-unit quantities; round only for display.",
          parameters: json(state),
          assumptions: [
            QUALIFICATION,
            "The same quantities and eligible item identities are used at both dates.",
            "A missing required price makes the total unavailable.",
          ],
        },
      },
    ],
    accountability: {
      generatedBy: "e01-basket-adapter",
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale:
            "Numerical checks verify arithmetic. Source interpretation and publication still require human editorial review.",
        },
      ],
    },
    extensions: {
      "semiotic.e01.numerical-bindings.v1": json({
        bindings,
        scope: receipt.scope,
        eligibility:
          "Fixed selected quantities; comparable subset requires both endpoint prices; percentage denominator must be positive.",
      }),
    },
  })
  const serialized = requireSerializableArtifactContract(contract)
  return {
    packetVersion: 1 as const,
    storyId: "E01",
    editionId: snapshot.editionId,
    sourceFingerprint: fingerprintValue(snapshot).fingerprint,
    snapshot,
    state: receipt.state,
    receipt: receiptValues(receipt),
    history: receipt.history,
    summary: summary(receipt),
    qualification: QUALIFICATION,
    correctionURL: `${STORY_URL}#sources`,
    chart: { component: "BarChart", props },
    artifact: serialized,
    numericalBindings: bindings,
    numericalChecks: evaluateNumericalBindings(snapshot, state, bindings),
    omissions: [
      "This packet does not confer editorial or publication approval.",
      "Static exports cannot discover future corrections without reopening the source link.",
      "BLS average prices do not identify the causes of price changes.",
    ],
  }
}

export function verifyReceiptPacket(packet: ReturnType<typeof buildReceiptPacket>) {
  if (
    packet.packetVersion !== 1 ||
    packet.storyId !== "E01" ||
    packet.editionId !== packet.snapshot.editionId
  )
    throw new Error("Unsupported packet or mismatched edition.")
  const rebuilt = buildReceiptPacket(packet.snapshot, packet.state)
  if (fingerprintValue(packet).fingerprint !== fingerprintValue(rebuilt).fingerprint)
    throw new Error(
      "Packet identity, calculations, claims, or representations differ from the named source and state.",
    )
  return rebuilt
}
