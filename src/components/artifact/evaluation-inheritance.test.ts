import { describe, expect, it } from "vitest"
import { supersedeClaim } from "./claims"
import {
  serializeArtifactCollection,
  validateArtifactCollection
} from "./collection"
import { buildArtifactContract } from "./contract"
import { evaluateArtifact, repairArtifact } from "./evaluateArtifact"
import { fingerprintValue } from "./fingerprint"
import {
  artifactContractScriptTag,
  compactInheritancePacket,
  createArtifactPacket,
  diffArtifactContracts,
  validateArtifactPacket,
  type ArtifactTransferFormat
} from "./inheritance"
import { recommendRepresentation } from "./representation"
import type { ArtifactContract } from "./types"

import { contractWithClaim, props, rows } from "./artifactTestFixtures"

describe("representation abstention", () => {
  it("returns explicit non-chart outcomes before ranking charts", () => {
    const noMaterial = buildArtifactContract(
      "LineChart",
      {},
      {
        id: "no-material"
      }
    )
    const unsettled = {
      ...contractWithClaim("live-values"),
      purpose: {
        ...contractWithClaim("live-values").purpose,
        stakes: "operational" as const
      },
      time: {
        ...contractWithClaim("live-values").time,
        window: {
          start: "2026-08-31T12:00:00Z",
          end: "2026-08-31T13:00:00Z",
          status: "provisional" as const
        },
        completeness: { status: "provisional" as const }
      }
    }
    const mixedUnits = buildArtifactContract("LineChart", props, {
      id: "mixed-units",
      intents: ["comparison"],
      claims: [
        {
          id: "revenue",
          text: "Revenue changed.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["revenue-source"],
          scope: { unit: "USD" }
        },
        {
          id: "orders",
          text: "Order count changed.",
          kind: "observation",
          status: "supported",
          evidenceIds: ["orders-source"],
          scope: { unit: "orders" }
        }
      ],
      evidence: [
        { id: "revenue-source", role: "source-data" },
        { id: "orders-source", role: "source-data" }
      ]
    })

    expect(recommendRepresentation([], noMaterial).selected.kind).toBe(
      "collect-more-data"
    )
    expect(recommendRepresentation(rows, unsettled).selected.kind).toBe(
      "wait-for-settlement"
    )
    expect(recommendRepresentation(rows, mixedUnits).selected.kind).toBe(
      "no-comparison"
    )
  })

  it("refuses failed or policy-required unknown time state", () => {
    const missingTime = {
      ...contractWithClaim("missing-time"),
      time: undefined
    }
    const invalidClocks = {
      ...contractWithClaim("invalid-clocks"),
      time: {
        ...contractWithClaim("invalid-clocks").time,
        observedAt: "2026-08-31T12:02:00Z",
        processedAt: "2026-08-31T12:01:00Z"
      }
    }

    expect(
      recommendRepresentation(rows, missingTime, { policy: "editorial" })
    ).toMatchObject({
      status: "refuse",
      selected: { kind: "wait-for-settlement" }
    })
    expect(recommendRepresentation(rows, invalidClocks)).toMatchObject({
      status: "refuse",
      selected: { kind: "wait-for-settlement" }
    })
    expect(recommendRepresentation(rows, missingTime)).toMatchObject({
      status: "conditional",
      selected: { kind: "chart" }
    })
  })

  it("uses one explicit clock across strict review and representation checks", () => {
    const reviewed = contractWithClaim("reviewed-agent", {
      authoredBy: { id: "summary-agent", kind: "agent" },
      review: {
        status: "approved",
        reviewer: { id: "human-reviewer", kind: "human" },
        reviewedAt: "2026-09-01T12:00:00Z"
      }
    })

    expect(
      recommendRepresentation(rows, reviewed, {
        policy: "editorial",
        now: "2026-09-02T12:00:00Z"
      }).selected.kind
    ).toBe("chart")
    expect(
      recommendRepresentation(rows, reviewed, { policy: "editorial" }).selected
        .kind
    ).toBe("no-claim")
  })
})

describe("unified artifact evaluation", () => {
  it("keeps validation, data, claims, time, access, and design evidence distinct", () => {
    const evaluation = evaluateArtifact(
      "LineChart",
      props,
      contractWithClaim(),
      {
        policy: "exploratory",
        recommendRepresentation: false
      }
    )

    expect(evaluation.validation.artifact.valid).toBe(true)
    expect(evaluation.validation.chart.valid).toBe(true)
    expect(evaluation.data.ok).toBe(true)
    expect(evaluation.claims.findings).toContainEqual(
      expect.objectContaining({
        id: "claims.references-valid.monthly-values-claim",
        status: "pass"
      })
    )
    expect(evaluation.temporal.findings).toContainEqual(
      expect.objectContaining({
        id: "time.window.completeness",
        status: "pass"
      })
    )
    expect(evaluation.accessibility.component).toBe("LineChart")
    expect(Array.isArray(evaluation.design)).toBe(true)
    expect(evaluation.obligations.map(({ relation }) => relation)).toEqual(
      expect.arrayContaining([
        "claim-support",
        "time",
        "reception",
        "representation-fit",
        "accountability",
        "preservation"
      ])
    )
  })

  it("applies only deterministic identity repairs and leaves claims and data unchanged", () => {
    const original = contractWithClaim()
    const incomplete = {
      ...original,
      artifact: {
        id: original.artifact.id,
        kind: original.artifact.kind
      }
    }
    const repaired = repairArtifact("LineChart", props, incomplete, {
      policy: "exploratory",
      recommendRepresentation: false,
      applySafeIdentityRepairs: true
    })

    expect(repaired.contract.artifact).toMatchObject({
      component: "LineChart",
      configFingerprint: expect.stringMatching(/^sha256:/),
      dataFingerprint: expect.stringMatching(/^sha256:/)
    })
    expect(repaired.contract.claims).toEqual(original.claims)
    expect(repaired.props).toBe(props)
    expect(repaired.ledger.filter(({ applied }) => applied)).toHaveLength(3)
    expect(repaired.ledger.every(({ changesClaim }) => !changesClaim)).toBe(
      true
    )
  })

  it("refuses a contract bound to a different component, configuration, or dataset", () => {
    const contract = contractWithClaim()
    const changedProps = {
      ...props,
      data: [...rows, { month: 4, value: 12 }],
      yAccessor: "otherValue"
    }

    const evaluation = evaluateArtifact("BarChart", changedProps, contract, {
      policy: "exploratory",
      recommendRepresentation: false
    })

    expect(evaluation.status).toBe("refuse")
    expect(evaluation.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "identity.component", status: "fail" }),
        expect.objectContaining({
          id: "identity.configuration",
          status: "fail"
        }),
        expect.objectContaining({ id: "identity.data", status: "fail" })
      ])
    )
  })

  it("proposes each deterministic identity repair once without applying it", () => {
    const contract = contractWithClaim()
    contract.artifact.component = "BarChart"
    contract.artifact.configFingerprint = "sha256:wrong-config"
    contract.artifact.dataFingerprint = "sha256:wrong-data"

    const proposal = repairArtifact("LineChart", props, contract, {
      policy: "exploratory",
      recommendRepresentation: false
    })
    const identityEntries = proposal.ledger.filter(({ id }) =>
      id.startsWith("repair.artifact.")
    )

    expect(identityEntries).toHaveLength(3)
    expect(identityEntries.every(({ applied }) => !applied)).toBe(true)
    expect(identityEntries.every(({ changesClaim }) => changesClaim)).toBe(true)
    expect(proposal.contract).toBe(contract)
  })
})

describe("inheritance reports", () => {
  it("creates a compact handoff without a contestability section", () => {
    const contract = contractWithClaim("compact-without-contestability")
    delete contract.contestability

    const packet = compactInheritancePacket(contract)

    expect(packet.claims).toHaveLength(1)
    expect(packet.evidence).toHaveLength(1)
    expect(packet.corrections).toBeUndefined()
  })

  it("retains evidence source and transformation details in compact handoffs", () => {
    const contract = contractWithClaim("compact-evidence")
    contract.claims[0].evidenceIds = ["derived-evidence"]
    contract.evidence = [
      {
        id: "raw-evidence",
        role: "source-data",
        source: {
          name: "Warehouse export",
          uri: "https://example.test/export",
          version: "snapshot-7"
        },
        sample: {
          fields: ["private"],
          values: [{ private: "excluded" }]
        }
      },
      {
        id: "derived-evidence",
        role: "transformation",
        transformation: {
          id: "aggregate-values",
          kind: "aggregation",
          description: "Aggregate observations by month.",
          inputEvidenceIds: ["raw-evidence"],
          parameters: { interval: "month" }
        }
      }
    ]

    const packet = compactInheritancePacket(contract)
    const raw = packet.evidence.find(({ id }) => id === "raw-evidence")
    const derived = packet.evidence.find(({ id }) => id === "derived-evidence")

    expect(raw?.source).toEqual({
      name: "Warehouse export",
      uri: "https://example.test/export",
      version: "snapshot-7"
    })
    expect(raw?.sample).toBeUndefined()
    expect(derived?.transformation).toEqual({
      id: "aggregate-values",
      kind: "aggregation",
      description: "Aggregate observations by month.",
      inputEvidenceIds: ["raw-evidence"],
      parameters: { interval: "month" }
    })
  })

  it("retains downstream state and obligations after policy redaction", () => {
    const contract = contractWithClaim("compact-obligations")
    contract.fieldStatus = {
      "purpose.stakes": {
        status: "manual",
        reason: "An owner must classify the decision impact.",
        suppliedBy: "author"
      }
    }
    contract.accountability = {
      ...contract.accountability,
      dataSources: ["private-warehouse-table"],
      reviews: [{ id: "publication-review", status: "pending" }]
    }
    contract.inheritance = {
      requiredPaths: ["fieldStatus", "accountability.authors"],
      prohibitedExports: ["accountability.dataSources"],
      privacy: "restricted",
      rawDataDefault: "exclude",
      preservation: "claim-evidence-preserved",
      sourceArtifactIds: ["upstream-artifact"]
    }

    const packet = compactInheritancePacket(contract)

    expect(packet.fieldStatus).toEqual(contract.fieldStatus)
    expect(packet.accountability?.authors).toEqual(
      contract.accountability.authors
    )
    expect(packet.accountability?.reviews).toEqual(
      contract.accountability.reviews
    )
    expect(packet.accountability?.dataSources).toBeUndefined()
    expect(packet.inheritance).toEqual(contract.inheritance)
    expect(packet.omittedPaths).toContain("accountability.dataSources")
    expect(packet.omittedPaths).not.toEqual(
      expect.arrayContaining(["accountability", "inheritance", "fieldStatus"])
    )
  })

  it("reports degraded transfers without mutating the source contract", () => {
    const original = contractWithClaim()
    const rich: ArtifactContract = {
      ...original,
      claims: [
        { ...original.claims[0], status: "superseded" },
        {
          ...original.claims[0],
          id: "monthly-values-claim-v2",
          supersedes: ["monthly-values-claim"]
        }
      ],
      evidence: [
        {
          ...original.evidence[0],
          sample: {
            rowCount: 3,
            fields: ["month", "value"],
            values: rows
          }
        }
      ],
      contestability: {
        corrections: [
          {
            id: "correction-0",
            affectedClaimIds: ["monthly-values-claim"],
            replacementClaimIds: ["monthly-values-claim-v2"],
            reason: "Initial review record."
          }
        ]
      },
      accountability: {
        ...original.accountability,
        actions: [
          {
            id: "action-0",
            action: "Publish",
            claimIds: ["monthly-values-claim-v2"]
          }
        ]
      },
      inheritance: {
        requiredPaths: ["contestability"],
        preservation: "full-fidelity"
      }
    }

    const packet = createArtifactPacket(rich, {
      format: "vega-lite",
      includeEvidenceSamples: false
    })

    expect(packet.transfer.preservation).toBe("lossy")
    expect(packet.transfer.omittedPaths).toEqual(
      expect.arrayContaining([
        "evidence[].sample",
        "contestability",
        "accountability.actions",
        "inheritance"
      ])
    )
    expect(packet.transfer.warnings.join(" ")).toContain(
      "required preservation path"
    )
    expect(packet.contract.evidence[0].sample).toBeUndefined()
    expect(packet.contract.contestability).toBeUndefined()
    expect(rich.evidence[0].sample?.rowCount).toBe(3)
    expect(rich.contestability?.corrections).toHaveLength(1)
  })

  it("diffs claim status, replacement, and correction history", () => {
    const before = contractWithClaim()
    const after = supersedeClaim(
      before,
      "monthly-values-claim",
      {
        id: "monthly-values-claim-v2",
        text: "The series rose before easing.",
        kind: "observation",
        status: "supported",
        evidenceIds: ["monthly-values-evidence"]
      },
      {
        id: "correction-2",
        reason: "The replacement states the shape more precisely."
      }
    )

    const changes = diffArtifactContracts(before, after)

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'claims[id="monthly-values-claim"].status',
          kind: "changed",
          before: "supported",
          after: "superseded"
        }),
        expect.objectContaining({
          path: 'claims[id="monthly-values-claim-v2"]',
          kind: "added"
        }),
        expect.objectContaining({
          path: "contestability.corrections",
          kind: "added"
        })
      ])
    )
  })

  it("detects packet mutation without treating the fingerprint as authorship", () => {
    const packet = createArtifactPacket(contractWithClaim(), {
      format: "static-package"
    })
    const changed = structuredClone(packet)
    changed.contract.claims[0].status = "unsupported"

    expect(validateArtifactPacket(packet)).toMatchObject({ valid: true })
    expect(validateArtifactPacket(changed)).toMatchObject({
      valid: false,
      errors: ["Artifact packet fingerprint does not match its contract."]
    })
  })

  it("rejects semantic graph corruption and invalid constructor formats", () => {
    const cyclic = contractWithClaim("cyclic-packet")
    cyclic.claims[0].evidenceIds = ["cycle-a"]
    cyclic.evidence = [
      {
        id: "cycle-a",
        role: "transformation",
        transformation: {
          id: "cycle-step-a",
          kind: "other",
          inputEvidenceIds: ["cycle-b"]
        }
      },
      {
        id: "cycle-b",
        role: "transformation",
        transformation: {
          id: "cycle-step-b",
          kind: "other",
          inputEvidenceIds: ["cycle-a"]
        }
      }
    ]

    expect(() => createArtifactPacket(cyclic)).toThrow(
      "broken semantic integrity"
    )
    expect(() =>
      createArtifactPacket(contractWithClaim("blank-format"), {
        format: "" as ArtifactTransferFormat
      })
    ).toThrow("format must be a non-empty string")

    const forged = structuredClone(
      createArtifactPacket(contractWithClaim("forged-cycle"))
    )
    forged.contract = structuredClone(cyclic)
    forged.artifactId = forged.contract.artifact.id
    forged.contractFingerprint = fingerprintValue(forged.contract).fingerprint
    forged.transferFingerprint = fingerprintValue({
      packetVersion: forged.packetVersion,
      artifactId: forged.artifactId,
      contractFingerprint: forged.contractFingerprint,
      transfer: forged.transfer
    }).fingerprint
    const validation = validateArtifactPacket(forged)

    expect(validation.valid).toBe(false)
    expect(validation.errors.some((message) => message.includes("cycle"))).toBe(
      true
    )
  })

  it("audits actions and corrections before lossy projection", () => {
    const brokenAction = contractWithClaim("lossy-action")
    brokenAction.accountability = {
      ...brokenAction.accountability,
      actions: [
        {
          id: "unbound-action",
          action: "Publish",
          claimIds: ["missing-claim"]
        }
      ]
    }
    const brokenCorrection = contractWithClaim("lossy-correction")
    brokenCorrection.contestability = {
      corrections: [
        {
          id: "unbound-correction",
          affectedClaimIds: ["missing-claim"],
          reason: "A correction must retain its affected claim."
        }
      ]
    }

    expect(() =>
      createArtifactPacket(brokenAction, { format: "vega-lite" })
    ).toThrow('Action "unbound-action" references missing claims')
    expect(() =>
      createArtifactPacket(brokenCorrection, { format: "vega-lite" })
    ).toThrow('Correction "unbound-correction" references missing claim')
  })

  it("refuses packet and collection exports that would normalize non-JSON values", () => {
    const contract = contractWithClaim("non-json")
    const nonJsonContract = {
      ...contract,
      extensions: {
        generatedAt: new Date("2026-09-01T00:00:00Z"),
        score: Number.NaN
      }
    } as unknown as ArtifactContract

    expect(() => createArtifactPacket(nonJsonContract)).toThrow(TypeError)

    const collection = {
      collectionVersion: "0.1",
      id: "non-json-collection",
      artifacts: [contract],
      extensions: { index: new Map([["claim", contract.claims[0].id]]) }
    }
    const serialized = serializeArtifactCollection(collection)

    expect(serialized.transfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["$.extensions.index"]
    })
    expect(serialized.transfer.warnings.join(" ")).toContain(
      "could not be preserved"
    )

    const sparseArtifacts = new Array(1)
    const sparseValidation = validateArtifactCollection({
      collectionVersion: "0.1",
      id: "sparse-collection",
      artifacts: sparseArtifacts
    })
    expect(sparseValidation).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ path: "$.artifacts[0]" })]
    })
  })

  it("enforces sample export policy and bounds default bounded samples", () => {
    const excludedByDefault = contractWithClaim("excluded-by-default")
    excludedByDefault.evidence[0].sample = {
      fields: ["private"],
      values: [{ private: "default-exclusion" }]
    }
    const excludedPacket = createArtifactPacket(excludedByDefault)

    expect(excludedPacket.contract.evidence[0].sample).toBeUndefined()
    expect(excludedPacket.transfer.omittedPaths).toContain("evidence[].sample")
    expect(excludedPacket.transfer).toMatchObject({
      preservation: "claim-evidence-preserved",
      preservedPaths: expect.arrayContaining(["claims", "evidence"])
    })
    expect(validateArtifactPacket(excludedPacket)).toMatchObject({
      valid: true
    })

    const confidential = contractWithClaim("confidential")
    confidential.evidence[0].sample = {
      fields: ["private"],
      values: [{ private: "do-not-export" }]
    }
    confidential.inheritance = {
      privacy: "confidential",
      rawDataDefault: "include"
    }
    const confidentialPacket = createArtifactPacket(confidential, {
      includeEvidenceSamples: true
    })

    expect(confidentialPacket.contract.evidence[0].sample).toBeUndefined()
    expect(confidentialPacket.transfer.omittedPaths).toContain(
      "evidence[].sample"
    )
    expect(confidentialPacket.transfer.warnings.join(" ")).toContain(
      "confidential"
    )

    const prohibited = contractWithClaim("prohibited")
    prohibited.evidence[0].sample = {
      fields: ["private"],
      values: [{ private: "do-not-export" }]
    }
    prohibited.inheritance = {
      privacy: "public",
      rawDataDefault: "include",
      prohibitedExports: ["evidence[].sample"]
    }
    const prohibitedPacket = createArtifactPacket(prohibited, {
      includeEvidenceSamples: true
    })

    expect(prohibitedPacket.contract.evidence[0].sample).toBeUndefined()
    expect(prohibitedPacket.transfer.warnings.join(" ")).toContain(
      "prohibits their export"
    )

    const bounded = contractWithClaim("bounded")
    bounded.evidence[0].sample = {
      fields: Array.from({ length: 40 }, (_, index) => `field-${index}`),
      values: Array.from({ length: 100 }, (_, index) => ({
        index,
        payload: "large-private-value".repeat(1000)
      }))
    }
    bounded.inheritance = {
      privacy: "public",
      rawDataDefault: "bounded"
    }
    const boundedPacket = createArtifactPacket(bounded)
    const sample = boundedPacket.contract.evidence[0].sample

    expect(sample?.fields?.length).toBeLessThanOrEqual(24)
    expect(sample?.values?.length).toBeLessThanOrEqual(20)
    expect(JSON.stringify(sample).length).toBeLessThanOrEqual(12_000)
    expect(sample?.truncated).toBe(true)
    expect(boundedPacket.transfer.omittedPaths).toContain(
      "evidence[].sample[overflow]"
    )
    expect(boundedPacket.transfer).toMatchObject({
      preservation: "claim-evidence-preserved",
      preservedPaths: expect.arrayContaining(["claims", "evidence"])
    })
    expect(validateArtifactPacket(boundedPacket)).toMatchObject({ valid: true })
  })

  it("binds transfer status, omissions, and warnings to packet identity", () => {
    const packet = createArtifactPacket(contractWithClaim())
    const mutations = [
      (value: typeof packet) => {
        value.transfer.preservation = "unknown"
      },
      (value: typeof packet) => {
        value.transfer.omittedPaths.push("claims[overflow]")
      },
      (value: typeof packet) => {
        value.transfer.warnings.push("Forged transfer warning.")
      }
    ]

    for (const mutate of mutations) {
      const changed = structuredClone(packet)
      mutate(changed)
      expect(validateArtifactPacket(changed).errors).toContain(
        "Artifact packet transfer fingerprint does not match its report."
      )
    }

    const missingReport = structuredClone(packet) as unknown as Record<
      string,
      unknown
    >
    missingReport.transfer = {}
    expect(validateArtifactPacket(missingReport)).toMatchObject({
      valid: false
    })
  })

  it("keeps bounded packet references closed and reports required losses", () => {
    const contract = contractWithClaim("closed")
    contract.claims.push({
      id: "second-claim",
      text: "A second bounded claim.",
      kind: "observation",
      status: "supported",
      evidenceIds: ["first-listed-evidence"]
    })
    contract.evidence.unshift({
      id: "first-listed-evidence",
      role: "source-data"
    })
    contract.inheritance = {
      requiredPaths: ["claims", "evidence"],
      rawDataDefault: "exclude"
    }
    const packet = createArtifactPacket(contract, {
      maxClaims: 1,
      maxEvidenceRecords: 1
    })
    const retainedEvidenceIds = new Set(
      packet.contract.evidence.map(({ id }) => id)
    )

    expect(
      packet.contract.claims.every(({ evidenceIds }) =>
        evidenceIds.every((id) => retainedEvidenceIds.has(id))
      )
    ).toBe(true)
    expect(packet.transfer.preservedPaths).not.toContain("claims")
    expect(packet.transfer.preservedPaths).not.toContain("evidence")
    expect(packet.transfer.warnings).toEqual(
      expect.arrayContaining([
        "A required preservation path was omitted: claims.",
        "A required preservation path was omitted: evidence."
      ])
    )
    expect(validateArtifactPacket(packet)).toMatchObject({ valid: true })
  })

  it("escapes artifact identifiers and script-closing text in HTML packets", () => {
    const contract = contractWithClaim('packet"><img src=x onerror=alert(1)>')
    contract.claims[0].text = "</script><script>alert(1)</script>"
    const html = artifactContractScriptTag(
      createArtifactPacket(contract, { format: "html" })
    )

    expect(html).toContain(
      'data-semiotic-artifact="packet&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"'
    )
    expect(html).not.toContain("</script><script>")
    expect(html).toContain("\\u003c/script>")
  })

  it("rejects impossible temporal state before packet creation or transfer", () => {
    const invalid = contractWithClaim("invalid-time")
    invalid.time = {
      ...invalid.time,
      window: {
        start: "2026-09-01T00:00:00Z",
        end: "2026-08-01T00:00:00Z",
        status: "settled"
      }
    }

    expect(() => createArtifactPacket(invalid)).toThrow(
      "broken semantic integrity"
    )

    const forged = structuredClone(
      createArtifactPacket(contractWithClaim("forged-html"), {
        format: "html"
      })
    )
    forged.contract.time = invalid.time
    forged.contractFingerprint = fingerprintValue(forged.contract).fingerprint
    forged.transferFingerprint = fingerprintValue({
      packetVersion: forged.packetVersion,
      artifactId: forged.artifactId,
      contractFingerprint: forged.contractFingerprint,
      transfer: forged.transfer
    }).fingerprint

    expect(validateArtifactPacket(forged)).toMatchObject({ valid: false })
    expect(() => artifactContractScriptTag(forged)).toThrow(
      "valid before HTML transfer"
    )
  })
})
