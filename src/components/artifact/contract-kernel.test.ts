import { describe, expect, it } from "vitest"
import type { IntentManifest } from "../ai/intentManifest"
import {
  buildArtifactContract,
  formatArtifactContract,
  fromIntentManifest,
  toIntentManifest,
  validateArtifactContract
} from "./contract"
import {
  boundedEvidenceSample,
  canonicalJson,
  fingerprintValue
} from "./fingerprint"
import {
  migrateArtifactContract,
  requireSerializableArtifactContract,
  serializeArtifactContract
} from "./serialization"
import type { ArtifactContract } from "./types"

const rows = [
  { month: "Jan", value: 4 },
  { month: "Feb", value: 7 }
]

function supportedContract() {
  return buildArtifactContract(
    "LineChart",
    {
      data: rows,
      xAccessor: "month",
      yAccessor: "value",
      title: "Monthly values"
    },
    {
      intents: ["trend"],
      claims: [
        {
          id: "change",
          text: "The value increased.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["series"]
        }
      ],
      evidence: [
        {
          id: "series",
          role: "source-data",
          fingerprint: "sha256:source"
        }
      ],
      time: {
        observedAt: "2026-08-31T12:00:00Z",
        completeness: { status: "settled", basis: "bounded extract" }
      }
    }
  )
}

describe("artifact fingerprints", () => {
  it("is independent of object key order and records non-JSON exclusions", () => {
    const first = fingerprintValue({
      z: [{ b: 2, a: 1 }],
      a: "same"
    })
    const reordered = fingerprintValue({
      a: "same",
      z: [{ a: 1, b: 2 }]
    })
    const excluded = canonicalJson({
      keep: true,
      callback: () => "not portable"
    })

    expect(first.fingerprint).toBe(reordered.fingerprint)
    expect(first.fingerprint).toBe(
      "sha256:4c4a426a8090405eed0f65efa9dd8754f8f58807c435a4437fe2bf5701a1b586"
    )
    expect(first.text).toBe(reordered.text)
    expect(excluded.value).toEqual({ keep: true })
    expect(excluded.excludedPaths).toEqual(["$.callback"])
  })

  it("changes after semantic mutation without mutating the prior snapshot", () => {
    const input = { rows: [{ id: "a", value: 1 }] }
    const before = fingerprintValue(input)

    input.rows[0].value = 2
    const after = fingerprintValue(input)

    expect(after.fingerprint).not.toBe(before.fingerprint)
    expect(before.value).toEqual({ rows: [{ id: "a", value: 1 }] })
    expect(input).toEqual({ rows: [{ id: "a", value: 2 }] })
  })

  it("preserves reserved JSON keys in canonical values and fingerprints", () => {
    const reserved = JSON.parse(
      '{"__proto__":{"scope":"retained"},"constructor":{"kind":"data"}}'
    )
    const withoutReserved = { constructor: { kind: "data" } }
    const canonical = canonicalJson(reserved)

    expect(JSON.parse(canonical.text)).toEqual(reserved)
    expect(
      Object.prototype.hasOwnProperty.call(canonical.value, "__proto__")
    ).toBe(true)
    expect(fingerprintValue(reserved).fingerprint).not.toBe(
      fingerprintValue(withoutReserved).fingerprint
    )
  })

  it("domain-separates runtime types from JSON objects that resemble tags", () => {
    const iso = "2026-09-03T00:00:00.000Z"
    const pairs: Array<[unknown, unknown]> = [
      [new Date(iso), { $type: "date", value: iso }],
      [Number.NaN, { $type: "number", value: "NaN" }],
      [Number.POSITIVE_INFINITY, { $type: "number", value: "Infinity" }],
      [-0, { $type: "number", value: "-0" }],
      [BigInt(2), { $type: "bigint", value: "2" }]
    ]

    for (const [runtimeValue, jsonValue] of pairs) {
      expect(fingerprintValue(runtimeValue).fingerprint).not.toBe(
        fingerprintValue(jsonValue).fingerprint
      )
    }
  })

  it("includes every serialization-loss marker in the fingerprint", () => {
    const reduced = { x: 1 }
    const symbolValue = { x: 1 } as Record<PropertyKey, unknown>
    symbolValue[Symbol("hidden")] = 2
    const nonEnumerable = { x: 1 }
    Object.defineProperty(nonEnumerable, "hidden", { value: 2 })
    const arrayWithMetadata = [1] as number[] & { note?: number }
    arrayWithMetadata.note = 2

    for (const value of [symbolValue, nonEnumerable]) {
      const fingerprint = fingerprintValue(value)
      expect(fingerprint.excludedPaths.length).toBeGreaterThan(0)
      expect(fingerprint.fingerprint).not.toBe(
        fingerprintValue(reduced).fingerprint
      )
    }
    expect(fingerprintValue(arrayWithMetadata).fingerprint).not.toBe(
      fingerprintValue([1]).fingerprint
    )
  })

  it("orders non-ASCII keys without locale-sensitive collation", () => {
    const first = { ä: 1, z: 2, a: 3 }
    const second = { a: 3, z: 2, ä: 1 }

    expect(fingerprintValue(first).fingerprint).toBe(
      fingerprintValue(second).fingerprint
    )
  })

  it("bounds public evidence samples by fields, names, rows, and size", () => {
    const row = Object.fromEntries([
      ...Array.from({ length: 30 }, (_, index) => [`field-${index}`, index]),
      ["x".repeat(130), "long-name"],
      ["large", "private".repeat(4_000)]
    ])
    const sample = boundedEvidenceSample([row, row], {
      maxRows: 2,
      maxCharacters: 1_000
    })

    expect(sample.fields).toHaveLength(24)
    expect(sample.fields.every((field) => field.length <= 120)).toBe(true)
    expect(sample.values.length).toBeLessThanOrEqual(2)
    expect(JSON.stringify(sample).length).toBeLessThanOrEqual(1_000)
    expect(JSON.stringify(sample)).not.toContain("private")
    expect(sample.truncated).toBe(true)
    for (const value of sample.values) {
      expect(
        Object.keys(value as Record<string, unknown>).every((field) =>
          sample.fields.includes(field)
        )
      ).toBe(true)
    }
  })
})

describe("artifact construction and validation", () => {
  it("does not claim portable identity for runtime-only configuration or data", () => {
    const configuration = buildArtifactContract("LineChart", {
      tooltip: () => "runtime value"
    })
    const data = [{ x: 1 }] as Array<Record<PropertyKey, unknown>>
    data[0][Symbol("hidden")] = 2
    const dataset = buildArtifactContract("LineChart", { data })

    expect(configuration.artifact.configFingerprint).toBeUndefined()
    expect(
      configuration.fieldStatus?.["artifact.configFingerprint"]?.status
    ).toBe("unknown")
    expect(dataset.artifact.dataFingerprint).toBeUndefined()
    expect(dataset.fieldStatus?.["artifact.dataFingerprint"]?.status).toBe(
      "unknown"
    )
  })
  it("separates stable configuration and data fingerprints", () => {
    const first = supportedContract()
    const reordered = buildArtifactContract(
      "LineChart",
      {
        title: "Monthly values",
        yAccessor: "value",
        xAccessor: "month",
        data: [
          { value: 4, month: "Jan" },
          { value: 7, month: "Feb" }
        ]
      },
      {
        intents: ["trend"],
        claims: first.claims,
        evidence: first.evidence,
        time: first.time
      }
    )
    const changedData = buildArtifactContract(
      "LineChart",
      {
        data: [...rows, { month: "Mar", value: 9 }],
        xAccessor: "month",
        yAccessor: "value",
        title: "Monthly values"
      },
      {
        intents: ["trend"],
        claims: first.claims,
        evidence: first.evidence,
        time: first.time
      }
    )

    expect(reordered.artifact).toMatchObject({
      id: first.artifact.id,
      configFingerprint: first.artifact.configFingerprint,
      dataFingerprint: first.artifact.dataFingerprint
    })
    expect(changedData.artifact.configFingerprint).toBe(
      first.artifact.configFingerprint
    )
    expect(changedData.artifact.dataFingerprint).not.toBe(
      first.artifact.dataFingerprint
    )
    expect(changedData.artifact.createdAt).toBeUndefined()
    expect(validateArtifactContract(first)).toMatchObject({
      valid: true,
      errors: []
    })
  })

  it("formats a compact summary with optional explicit field states", () => {
    const contract = buildArtifactContract(
      "LineChart",
      {},
      {
        id: "format-example",
        intents: ["trend"],
        fieldStatus: {
          "accountability.review": {
            status: "manual",
            reason: "A reviewer must inspect the publication context."
          },
          time: {
            status: "unknown",
            reason: "No source clock was supplied."
          }
        }
      }
    )

    expect(formatArtifactContract(contract)).toContain("Time state: unknown")
    expect(
      formatArtifactContract(contract, {
        includeFieldStatus: true,
        lineSeparator: " | "
      })
    ).toContain(
      "Open fields: accountability.review=manual, artifact.dataFingerprint=unknown, claims=unknown, evidence=unknown, time=unknown"
    )
  })

  it("binds data identity to declared transformation semantics", () => {
    const props = {
      data: rows,
      xAccessor: "month",
      yAccessor: "value"
    }
    const evidence: ArtifactContract["evidence"] = [
      { id: "rows", role: "source-data" as const },
      {
        id: "summary",
        role: "transformation" as const,
        transformation: {
          id: "monthly-summary",
          kind: "aggregation" as const,
          inputEvidenceIds: ["rows"],
          parameters: { operation: "sum" }
        }
      }
    ]
    const first = buildArtifactContract("LineChart", props, { evidence })
    const changed = buildArtifactContract("LineChart", props, {
      evidence: [
        evidence[0],
        {
          ...evidence[1],
          transformation: {
            ...evidence[1].transformation!,
            parameters: { operation: "mean" }
          }
        }
      ]
    })

    expect(changed.artifact.configFingerprint).toBe(
      first.artifact.configFingerprint
    )
    expect(changed.artifact.dataFingerprint).not.toBe(
      first.artifact.dataFingerprint
    )
  })

  it("reports malformed required fields without inventing replacements", () => {
    const validation = validateArtifactContract({
      contractVersion: "0.1",
      artifact: { id: "", kind: "chart" },
      purpose: { intents: [{ id: "" }] },
      claims: [{ id: "claim", kind: "observation", status: "unknown" }],
      evidence: "missing"
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.artifact.id",
        "$.purpose.intents[0].id",
        "$.claims[0].evidenceIds",
        "$.evidence"
      ])
    )
  })

  it("rejects malformed nested structures before evaluators consume them", () => {
    const contract = supportedContract()
    const validation = validateArtifactContract({
      ...contract,
      claims: [
        {
          ...contract.claims[0],
          review: { status: "assumed" }
        }
      ],
      time: {
        ...contract.time,
        window: { start: "2026-09-01", end: "2026-08-01", status: "final" },
        sources: "stream-a"
      },
      reception: { channels: "agent" },
      contestability: { challenges: "none" },
      inheritance: { requiredPaths: "claims" }
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.claims[0].review.status",
        "$.time.window.status",
        "$.time.sources",
        "$.reception.channels",
        "$.contestability.challenges",
        "$.inheritance.requiredPaths"
      ])
    )
  })

  it("rejects undeclared properties and non-object field-state maps", () => {
    const contract = supportedContract()
    const validation = validateArtifactContract({
      ...contract,
      unexpectedRoot: true,
      artifact: { ...contract.artifact, unexpectedIdentity: true },
      time: { ...contract.time, unexpectedClock: true },
      fieldStatus: []
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.unexpectedRoot",
        "$.artifact.unexpectedIdentity",
        "$.time.unexpectedClock",
        "$.fieldStatus"
      ])
    )
  })
})

describe("legacy manifest compatibility", () => {
  it("round-trips represented fields and reports richer omitted paths", () => {
    const manifest: IntentManifest = {
      ididVersion: "0.1",
      chartId: "monthly-values",
      title: "Monthly values",
      author: "Data desk",
      createdAt: "2026-08-31T12:00:00Z",
      intent: {
        primary: "trend",
        secondary: ["comparison"],
        communicativeAct: "tracking"
      },
      audience: {
        primary: "general readers",
        familiarityAssumptions: { line: "3" }
      },
      reception: {
        channels: ["visual", "agent"],
        strengths: ["compact"],
        risks: ["overprecision"]
      },
      designContract: {
        chartFamily: "time-series",
        whyThisForm: "Change over time is the comparison.",
        whyNotDefault: "A table obscures the trajectory."
      },
      accessibility: {
        description: "A line rises from four to seven.",
        navigation: true,
        dataFallback: true
      },
      provenance: {
        dataSources: ["warehouse.monthly_values"],
        code: "charts/monthly.tsx",
        reviewStatus: "approved"
      },
      lifecycle: {
        staleAfter: "P1D",
        refreshPolicy: "daily"
      }
    }

    const imported = fromIntentManifest(manifest)
    const projected = toIntentManifest(imported)
    const richer = toIntentManifest({
      ...imported,
      claims: supportedContract().claims,
      evidence: supportedContract().evidence,
      time: supportedContract().time,
      inheritance: { preservation: "claim-evidence-preserved" }
    })

    expect(projected.manifest).toEqual(manifest)
    expect(projected.omittedPaths).toEqual(
      expect.arrayContaining([
        "purpose.intents[].source",
        "accountability.reviews",
        "fieldStatus"
      ])
    )
    expect(imported.fieldStatus).toMatchObject({
      claims: { status: "unknown" },
      evidence: { status: "unknown" }
    })
    expect(richer.omittedPaths).toEqual(
      expect.arrayContaining(["claims", "evidence", "time", "inheritance"])
    )
  })

  it("removes stale legacy values and reports richer fields that cannot transfer", () => {
    const imported = fromIntentManifest({
      ididVersion: "0.1",
      chartId: "updated-values",
      author: "Original desk",
      intent: { primary: "trend" },
      audience: { primary: "original audience" },
      reception: {
        channels: ["visual"],
        risks: ["outdated risk"]
      },
      designContract: {
        chartFamily: "time-series",
        whyThisForm: "Original rationale"
      },
      accessibility: {
        description: "Original description",
        dataFallback: true
      },
      provenance: {
        dataSources: ["original-source"],
        reviewStatus: "approved"
      }
    })
    const changed: ArtifactContract = {
      ...imported,
      artifact: {
        ...imported.artifact,
        component: "LineChart",
        configFingerprint: "sha256:config",
        dataFingerprint: "sha256:data",
        revision: "2"
      },
      purpose: {
        ...imported.purpose,
        stakes: "informational",
        allowedUses: ["public summary"],
        prohibitedUses: ["automated action"]
      },
      reception: {
        channels: [{ channel: "visual", rawData: "deny" }]
      },
      form: undefined,
      accountability: undefined,
      fieldStatus: undefined,
      extensions: {
        ...imported.extensions,
        "example.extra": { retained: true }
      }
    }

    const projected = toIntentManifest(changed)

    expect(projected.manifest.reception).toEqual({ channels: ["visual"] })
    expect(projected.manifest).not.toHaveProperty("audience")
    expect(projected.manifest).not.toHaveProperty("accessibility")
    expect(projected.manifest).not.toHaveProperty("designContract")
    expect(projected.manifest).not.toHaveProperty("author")
    expect(projected.manifest).not.toHaveProperty("provenance")
    expect(projected.omittedPaths).toEqual(
      expect.arrayContaining([
        "artifact.component",
        "artifact.configFingerprint",
        "artifact.dataFingerprint",
        "artifact.revision",
        "purpose.stakes",
        "purpose.allowedUses",
        "purpose.prohibitedUses",
        "reception.channels[]",
        "extensions"
      ])
    )
  })

  it("keeps unknown imported channels out of the typed channel surface", () => {
    const manifest: IntentManifest = {
      ididVersion: "0.1",
      chartId: "channel-import",
      intent: { primary: "comparison" },
      reception: { channels: ["visual", "future-channel"] }
    }

    const imported = fromIntentManifest(manifest)

    expect(imported.reception?.channels).toEqual([{ channel: "visual" }])
    expect(imported.fieldStatus?.["reception.channels"]?.status).toBe("unknown")
    expect(
      (
        imported.extensions?.[
          "semiotic.intent-manifest.v0.1"
        ] as unknown as IntentManifest
      ).reception?.channels
    ).toEqual(["visual", "future-channel"])
  })
})

describe("artifact serialization", () => {
  it("preserves forward versions without claiming to interpret them", () => {
    const serialized = serializeArtifactContract({
      contractVersion: "0.2",
      artifact: { id: "future", kind: "chart" },
      purpose: { intents: [] },
      claims: [],
      evidence: [],
      futureState: { reviewMode: "two-stage" }
    })

    expect(serialized.transfer).toMatchObject({
      status: "unsupported-version",
      omittedPaths: []
    })
    expect(serialized.contract).toMatchObject({
      contractVersion: "0.2",
      futureState: { reviewMode: "two-stage" }
    })
  })

  it("excludes evidence samples from forward versions without interpreting other fields", () => {
    const serialized = serializeArtifactContract(
      {
        contractVersion: "0.2",
        artifact: { id: "future", kind: "chart" },
        purpose: { intents: [] },
        claims: [],
        evidence: [
          {
            id: "source",
            role: "source-data",
            sample: { values: [{ secret: "private" }] },
            futureEvidenceState: { mode: "opaque" }
          },
          { id: "other", role: "source-data" }
        ],
        futureState: { reviewMode: "two-stage" }
      },
      { excludeEvidenceSamples: true }
    )

    expect(serialized.transfer).toMatchObject({
      status: "unsupported-version",
      omittedPaths: ["$.evidence[0].sample"]
    })
    expect(serialized.transfer.warnings.join(" ")).toContain("excluded")
    expect(serialized.contract).toMatchObject({
      contractVersion: "0.2",
      evidence: [
        {
          id: "source",
          role: "source-data",
          futureEvidenceState: { mode: "opaque" }
        },
        { id: "other", role: "source-data" }
      ],
      futureState: { reviewMode: "two-stage" }
    })
    expect(
      (serialized.contract?.evidence as Array<Record<string, unknown>>)[0]
    ).not.toHaveProperty("sample")
  })

  it("reports excluded values and clones preserved contracts", () => {
    const contract = supportedContract()
    const lossy = serializeArtifactContract({
      ...contract,
      extensions: {
        portable: true,
        callback: () => "not portable"
      }
    })
    const preserved = requireSerializableArtifactContract(contract)

    expect(lossy.transfer.status).toBe("invalid")
    expect(lossy.transfer.omittedPaths).toEqual(["$.extensions.callback"])
    expect(lossy.transfer.warnings.join(" ")).toContain("Non-JSON values")
    expect(preserved.transfer.status).toBe("preserved")
    expect(preserved.contract).not.toBe(contract)
    expect(preserved.contract).toEqual(contract)
  })

  it("rejects non-JSON numeric values instead of treating tagged rewrites as preserved", () => {
    const contract = supportedContract()
    const result = serializeArtifactContract({
      ...contract,
      extensions: {
        nonFinite: Number.NaN,
        negativeZero: -0
      }
    })

    expect(result.transfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["$.extensions.negativeZero", "$.extensions.nonFinite"]
    })
    expect(result.transfer.warnings.join(" ")).toContain(
      "Non-JSON values could not be preserved"
    )
  })

  it("reports sparse array holes as non-JSON loss", () => {
    const contract = supportedContract()
    const claims = new Array<ArtifactContract["claims"][number]>(2)
    claims[1] = contract.claims[0]

    const result = serializeArtifactContract({ ...contract, claims })

    expect(result.transfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["$.claims[0]"]
    })
    expect(result.transfer.warnings.join(" ")).toContain(
      "Non-JSON values could not be preserved"
    )
  })

  it("marks structurally invalid current contracts as invalid transfers", () => {
    const contract = supportedContract()
    const extraProperty = serializeArtifactContract({
      ...contract,
      undeclared: true
    })
    const invalidFieldStates = serializeArtifactContract({
      ...contract,
      fieldStatus: []
    })

    expect(extraProperty.transfer.status).toBe("invalid")
    expect(extraProperty.transfer.warnings.join(" ")).toContain(
      "$.undeclared: Unexpected property"
    )
    expect(invalidFieldStates.transfer.status).toBe("invalid")
    expect(invalidFieldStates.transfer.warnings.join(" ")).toContain(
      "$.fieldStatus"
    )
  })

  it("keeps current versions unchanged and refuses to guess a future migration", () => {
    const current = migrateArtifactContract(supportedContract())
    const future = migrateArtifactContract({
      contractVersion: "0.2",
      artifact: { id: "future", kind: "chart" },
      purpose: { intents: [] },
      claims: [],
      evidence: []
    })

    expect(current).toMatchObject({
      status: "current",
      fromVersion: "0.1",
      toVersion: "0.1",
      changes: []
    })
    expect(future).toMatchObject({
      status: "unsupported-version",
      fromVersion: "0.2",
      toVersion: "0.1",
      changes: []
    })
    expect(future.warnings.join(" ")).toContain(
      "No registered deterministic migration"
    )
  })
})
