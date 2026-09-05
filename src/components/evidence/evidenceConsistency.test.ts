import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import {
  evaluateEvidenceGate,
  fromEvidenceEnvelope,
  stableEvidenceHash,
  toEvidenceEnvelope
} from "../semiotic-evidence"
import { buildArtifactContract } from "../artifact/contract"
import { evaluateArtifact } from "../artifact/evaluateArtifact"
import { evaluateChart } from "../ai/evaluateChart"
import { prepareChart } from "../ai/generativeChart"
import { createChartAccessContract } from "../access/chartAccessContract"
import { toConfig, fromConfig } from "../export/chartConfig"
import { compareArtifactIdentity } from "../artifact/identity"
import { artifactAttachmentIssues } from "../artifact/attachmentAudit"
import type { Datum } from "../charts/shared/datumTypes"
import type { RenderEvidence } from "../server/renderEvidence"

const props = {
  data: [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 }
  ],
  xAccessor: "x",
  yAccessor: "y",
  title: "Observed values",
  description: "Three observed values increase over time.",
  summary: "Values increase from one to three.",
  accessibleTable: true
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}

function contractFor(input = props) {
  return buildArtifactContract("LineChart", input, {
    id: "evidence-consistency"
  })
}

describe("evidence identity across public judgment routes", () => {
  it.each([
    ["component", "Scatterplot"],
    ["configFingerprint", "sha256:other-config"],
    ["dataFingerprint", "sha256:other-data"]
  ] as const)(
    "rejects a known %s mismatch at every applicable gate",
    (key, value) => {
      const contract = contractFor()
      contract.artifact[key] = value
      const rendered = renderChartWithEvidence("LineChart", props, {
        artifactContract: contract
      })
      const envelope = toEvidenceEnvelope("LineChart", props, {
        ssrEvidence: rendered.evidence,
        artifactContract: contract
      })
      const restored = fromEvidenceEnvelope(
        JSON.parse(JSON.stringify(envelope))
      )
      for (const input of [envelope, restored]) {
        for (const options of [
          {},
          {
            requireRenderEvidence: false,
            requireAccessTable: false,
            allowAccessibilityWarnings: true,
            failOnCrossModalConflicts: false
          }
        ]) {
          const gate = evaluateEvidenceGate(freezeDeep(input), options)
          expect(gate.ok).toBe(false)
          expect(gate.status).toBe("fail")
          expect(gate.findings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: "artifact.identity-mismatch",
                severity: "error"
              }),
              expect.objectContaining({
                id: "render.artifact.identity-mismatch",
                severity: "error"
              })
            ])
          )
        }
      }
      expect(
        evaluateArtifact("LineChart", props, contract, {
          policy: "exploratory",
          recommendRepresentation: false
        }).status
      ).toBe("refuse")
      expect(
        toConfig("LineChart", props, { artifactContract: contract })
          .artifactTransfer?.status
      ).toBe("invalid")
    }
  )

  it("retains SSR attachments and rechecks them against the envelope input", () => {
    const evidence = renderChartWithEvidence("LineChart", props, {
      artifactContract: contractFor()
    }).evidence
    const envelope = toEvidenceEnvelope(
      "LineChart",
      {
        ...props,
        data: props.data.map((row) => ({ ...row, y: 4 - row.y }))
      },
      { ssrEvidence: evidence }
    )
    expect(evidence.artifactBinding?.status).toBe("match")
    expect(envelope.artifact?.identityBinding).toMatchObject({
      status: "mismatch",
      mismatchPaths: ["artifact.dataFingerprint"]
    })
    expect(evaluateEvidenceGate(envelope).ok).toBe(false)
  })

  it("does not let a matching explicit contract erase a failed SSR attachment", () => {
    const bad = contractFor()
    bad.artifact.dataFingerprint = "sha256:other-data"
    const envelope = toEvidenceEnvelope("LineChart", props, {
      artifactContract: contractFor(),
      ssrEvidence: renderChartWithEvidence("LineChart", props, {
        artifactContract: bad
      }).evidence
    })
    expect(envelope.artifact?.identityBinding?.status).toBe("match")
    expect(evaluateEvidenceGate(envelope).findings).toContainEqual(
      expect.objectContaining({
        id: "render.artifact.identity-mismatch",
        severity: "error"
      })
    )
  })

  it.each(["invalid", "unsupported-version", "mismatch"] as const)(
    "makes attached %s reports binding in chart, artifact, and generation judgments",
    (status) => {
      const contract = contractFor()
      const rendered = renderChartWithEvidence("LineChart", props, {
        artifactContract: contract
      })
      if (status === "mismatch") {
        rendered.evidence.artifactBinding = {
          status: "mismatch",
          mismatchPaths: ["artifact.dataFingerprint"],
          unknownPaths: []
        }
      } else {
        rendered.evidence.artifactTransfer = {
          status,
          omittedPaths: [],
          warnings: []
        }
      }
      freezeDeep(rendered)
      const render = () => rendered
      expect(evaluateChart("LineChart", props, undefined, { render }).ok).toBe(
        false
      )
      const evaluation = evaluateArtifact("LineChart", props, contract, {
        policy: "exploratory",
        recommendRepresentation: false,
        render
      })
      expect(evaluation.status).toBe("refuse")
      expect(evaluation.obligations).toContainEqual(
        expect.objectContaining({
          id:
            status === "mismatch"
              ? "chart.render.artifact.identity-mismatch"
              : "chart.render.artifact.transfer-invalid",
          status: "fail"
        })
      )
      expect(
        prepareChart({ component: "LineChart", props }, { render }).ok
      ).toBe(false)
      expect(
        evaluateEvidenceGate(
          toEvidenceEnvelope("LineChart", props, {
            ssrEvidence: rendered.evidence
          })
        ).ok
      ).toBe(false)
    }
  )

  it("preserves a matching identity after a chart-config export round trip", () => {
    const contract = contractFor()
    const restored = fromConfig(
      toConfig("LineChart", props, { artifactContract: contract })
    )
    const envelope = toEvidenceEnvelope(
      restored.componentName,
      restored.props,
      {
        artifactContract: restored.artifactContract,
        ssrEvidence: renderChartWithEvidence(
          restored.componentName,
          restored.props
        ).evidence
      }
    )
    expect(envelope.artifact?.identityBinding?.status).toBe("match")
    expect(evaluateEvidenceGate(envelope).ok).toBe(true)
  })

  it("allows declared evidence-sample redaction without losing verified identity", () => {
    const contract = contractFor()
    contract.evidence.push({
      id: "rows",
      role: "source-data",
      sample: { values: ["private"] }
    })
    const envelope = toEvidenceEnvelope("LineChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    expect(envelope.artifact?.transfer.status).toBe("excluded")
    expect(JSON.stringify(envelope.artifact)).not.toContain("private")
    expect(evaluateEvidenceGate(envelope).ok).toBe(true)
  })

  it("fails malformed transfer fingerprints without throwing or trusting the report", () => {
    const envelope = toEvidenceEnvelope("LineChart", props, {
      artifactContract: contractFor(),
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    envelope.artifact!.transferFingerprint = "tampered"
    expect(evaluateEvidenceGate(freezeDeep(envelope))).toMatchObject({
      status: "fail",
      ok: false,
      findings: [{ id: "envelope.invalid" }]
    })
  })

  it("keeps unknown identity unresolved instead of approving publication", () => {
    const contract = contractFor()
    delete contract.artifact.dataFingerprint
    const envelope = toEvidenceEnvelope("LineChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    expect(evaluateEvidenceGate(envelope)).toMatchObject({
      ok: false,
      findings: expect.arrayContaining([
        expect.objectContaining({ id: "artifact.identity-unknown" })
      ])
    })
    expect(
      evaluateArtifact("LineChart", props, contract, {
        policy: "exploratory",
        recommendRepresentation: false
      }).status
    ).toBe("conditional")
  })

  it("does not erase mismatch details behind a positive attachment status", () => {
    expect(
      artifactAttachmentIssues({
        contract: contractFor(),
        transfer: { status: "preserved", omittedPaths: [], warnings: [] },
        binding: {
          status: "match",
          mismatchPaths: ["artifact.component"],
          unknownPaths: []
        }
      })
    ).toContainEqual(
      expect.objectContaining({
        id: "artifact.identity-mismatch",
        status: "fail"
      })
    )
  })

  it("uses the same unknown judgment for nonportable configuration on all identity paths", () => {
    const callbackProps = {
      ...props,
      xFormat: (value: number) => String(value)
    }
    const contract = contractFor()
    expect(
      compareArtifactIdentity(contract, callbackProps, "LineChart")
    ).toMatchObject({
      status: "unknown",
      unknownPaths: ["artifact.configFingerprint"]
    })
    expect(
      evaluateArtifact("LineChart", callbackProps, contract, {
        recommendRepresentation: false
      }).obligations
    ).toContainEqual(
      expect.objectContaining({
        id: "identity.configuration",
        status: "unknown"
      })
    )
  })

  it("resolves the ChartRecipe component alias consistently", () => {
    const recipeProps = { ...props, recipeId: "example-recipe" }
    const contract = buildArtifactContract("example-recipe", recipeProps)
    expect(
      compareArtifactIdentity(contract, recipeProps, "ChartRecipe").status
    ).toBe("match")
  })

  it("rejects evidence for another component across judgment routes", () => {
    const rendered = renderChartWithEvidence("LineChart", props)
    rendered.evidence.component = "Scatterplot"
    const render = () => rendered
    expect(evaluateChart("LineChart", props, undefined, { render }).ok).toBe(
      false
    )
    expect(
      evaluateArtifact("LineChart", props, contractFor(), {
        render,
        policy: "exploratory",
        recommendRepresentation: false
      }).status
    ).toBe("refuse")
    expect(prepareChart({ component: "LineChart", props }, { render }).ok).toBe(
      false
    )
    expect(
      evaluateEvidenceGate(
        toEvidenceEnvelope("LineChart", props, {
          ssrEvidence: rendered.evidence
        })
      ).findings
    ).toContainEqual(
      expect.objectContaining({ id: "render.component-mismatch" })
    )
  })
})

describe("immutable evidence construction and evaluation", () => {
  it("fails malformed privacy limits as an invalid envelope", () => {
    const envelope = toEvidenceEnvelope("LineChart", props)
    const malformed = {
      ...envelope,
      limits: { ...envelope.limits, privacyScope: { agent: 42 } }
    } as unknown as typeof envelope
    expect(evaluateEvidenceGate(malformed)).toMatchObject({
      ok: false,
      findings: [{ id: "envelope.invalid" }]
    })
  })

  it("rejects a malformed nested mismatch as an invalid envelope without throwing", () => {
    const envelope = toEvidenceEnvelope("LineChart", props, {
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    envelope.render.evidence!.artifactContract = contractFor()
    envelope.render.evidence!.artifactTransfer = {
      status: "preserved", omittedPaths: [], warnings: []
    }
    envelope.render.evidence!.artifactBinding = {
      status: "mismatch"
    } as RenderEvidence["artifactBinding"]
    expect(evaluateEvidenceGate(envelope)).toMatchObject({
      ok: false,
      findings: [expect.objectContaining({ id: "envelope.invalid" })]
    })
  })

  it("evaluates deeply frozen claims repeatedly and returns independent derived limits", () => {
    const envelope = freezeDeep(
      toEvidenceEnvelope("LineChart", props, {
        ssrEvidence: renderChartWithEvidence("LineChart", props).evidence,
        claims: [{ claim: "Revenue will double", supported: false }],
        privacyScope: { agent: ["no raw records"] }
      })
    )
    const before = JSON.stringify(envelope)
    const first = evaluateEvidenceGate(envelope)
    expect(first).toEqual(evaluateEvidenceGate(envelope))
    expect(first.ok).toBe(false)
    expect(first.limits?.unsupportedClaims).toContain("Revenue will double")
    first.limits!.knownGaps.push("caller note")
    first.limits!.privacyScope.agent.push("another note")
    expect(JSON.stringify(envelope)).toBe(before)
  })

  it("keeps explicitly declared unsupported claims binding without a meaning-claim duplicate", () => {
    const envelope = toEvidenceEnvelope("LineChart", props, {
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence,
      unsupportedClaims: ["The total is 999"]
    })
    expect(evaluateEvidenceGate(envelope)).toMatchObject({
      ok: false,
      findings: expect.arrayContaining([
        expect.objectContaining({ id: "claim.unsupported" })
      ])
    })
  })

  it("redacts an access contract without changing its caller-owned navigation", () => {
    const access = createChartAccessContract({
      component: "LineChart",
      props,
      options: { navigable: true }
    })
    const before = JSON.stringify(access)
    const envelope = toEvidenceEnvelope("LineChart", props, {
      accessContract: freezeDeep(access)
    })
    expect(JSON.stringify(access)).toBe(before)
    expect(envelope.access).not.toBe(access)
    expect(JSON.stringify(envelope.access.navigation.tree)).not.toContain(
      '"datum":'
    )
  })

  it("keeps critical accessibility findings binding even when warnings are allowed", () => {
    const envelope = toEvidenceEnvelope("LineChart", props, {
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    envelope.audit.accessibility = {
      ok: true,
      findings: [{ id: "critical-failure", critical: true, status: "fail" }]
    }
    expect(
      evaluateEvidenceGate(freezeDeep(envelope), {
        allowAccessibilityWarnings: true
      })
    ).toMatchObject({
      ok: false,
      status: "fail",
      findings: [{ id: "audit.accessibility-blocking" }]
    })
  })
})

describe("versioned rendered-scene hashes", () => {
  const cases: Array<[string, Datum, Datum]> = [
    [
      "LineChart",
      props,
      { ...props, data: props.data.map((row) => ({ ...row, y: 4 - row.y })) }
    ],
    [
      "BarChart",
      {
        data: [
          { category: "a", value: 1 },
          { category: "b", value: 3 }
        ],
        categoryAccessor: "category",
        valueAccessor: "value"
      },
      {
        data: [
          { category: "a", value: 3 },
          { category: "b", value: 1 }
        ],
        categoryAccessor: "category",
        valueAccessor: "value"
      }
    ],
    ["BigNumber", { value: 10 }, { value: 20 }],
    [
      "SankeyDiagram",
      {
        edges: [
          { source: "a", target: "b", value: 10 },
          { source: "a", target: "c", value: 2 }
        ]
      },
      {
        edges: [
          { source: "a", target: "b", value: 2 },
          { source: "a", target: "c", value: 10 }
        ]
      }
    ],
    [
      "ScatterplotMatrix",
      {
        data: [
          { a: 1, b: 2 },
          { a: 2, b: 3 },
          { a: 3, b: 1 }
        ],
        fields: ["a", "b"]
      },
      {
        data: [
          { a: 1, b: 3 },
          { a: 2, b: 1 },
          { a: 3, b: 2 }
        ],
        fields: ["a", "b"]
      }
    ]
  ]
  it.each(cases)(
    "distinguishes %s geometry with unchanged mark inventories",
    (component, left, right) => {
      const a = renderChartWithEvidence(component, left)
      const b = renderChartWithEvidence(component, right)
      expect(a.svg).not.toBe(b.svg)
      expect(a.evidence.markCountByType).toEqual(b.evidence.markCountByType)
      expect(a.evidence.sceneHashVersion).toBe(2)
      expect(a.evidence.sceneHash).toMatch(/^[a-f0-9]{64}$/)
      expect(a.evidence.sceneHash).not.toBe(b.evidence.sceneHash)
      expect(renderChartWithEvidence(component, left).evidence.sceneHash).toBe(
        a.evidence.sceneHash
      )
      const ea = toEvidenceEnvelope(component, left, {
        ssrEvidence: a.evidence
      })
      const eb = toEvidenceEnvelope(component, right, {
        ssrEvidence: b.evidence
      })
      expect(ea.render.sceneHash).toBe(a.evidence.sceneHash)
      expect(ea.render.sceneHashVersion).toBe(2)
      expect(ea.render.markInventoryHash).toBe(eb.render.markInventoryHash)
    }
  )

  it.each([
    { width: 900 },
    { margin: { left: 100, right: 50, top: 40, bottom: 60 } },
    { lineStyle: { stroke: "#ff0000" } },
    { xExtent: [0, 10] },
    { annotations: [{ type: "y-threshold", value: 2, label: "Target" }] }
  ])("includes resolved paint and coordinate changes: %j", (patch) => {
    const baseline = renderChartWithEvidence("LineChart", props)
    const changed = renderChartWithEvidence("LineChart", { ...props, ...patch })
    expect(baseline.svg).not.toBe(changed.svg)
    expect(baseline.evidence.sceneHash).not.toBe(changed.evidence.sceneHash)
  })

  it("hashes the final SVG after precision serialization", () => {
    const precise = renderChartWithEvidence("LineChart", props)
    const rounded = renderChartWithEvidence("LineChart", props, {
      precision: 0
    })
    expect(precise.svg).not.toBe(rounded.svg)
    expect(precise.evidence.sceneHash).not.toBe(rounded.evidence.sceneHash)
  })

  it("does not substitute input fingerprints for observed geometry", () => {
    const extra = {
      ...props,
      data: props.data.map((row) => ({ ...row, privateNote: "unused" }))
    }
    const original = renderChartWithEvidence("LineChart", props)
    const annotated = renderChartWithEvidence("LineChart", extra)
    expect(original.svg).toBe(annotated.svg)
    expect(original.evidence.sceneHash).toBe(annotated.evidence.sceneHash)
    expect(toEvidenceEnvelope("LineChart", props).input.hash).not.toBe(
      toEvidenceEnvelope("LineChart", extra).input.hash
    )
  })

  it("keeps legacy inventory evidence readable without manufacturing a scene hash", () => {
    const evidence: RenderEvidence = {
      ...renderChartWithEvidence("LineChart", props).evidence
    }
    delete evidence.sceneHash
    delete evidence.sceneHashVersion
    const envelope = toEvidenceEnvelope("LineChart", props, {
      ssrEvidence: evidence
    })
    expect(envelope.render.sceneHash).toBeUndefined()
    expect(envelope.render.markInventoryHash).toBe(
      stableEvidenceHash(evidence.markCountByType)
    )
    const legacy = {
      ...envelope,
      render: {
        ...envelope.render,
        sceneHash: envelope.render.markInventoryHash
      }
    }
    expect(fromEvidenceEnvelope(legacy).render.sceneHashVersion).toBeUndefined()
  })

  it("rejects a versioned hash that disagrees with the attached render evidence", () => {
    const envelope = toEvidenceEnvelope("LineChart", props, {
      ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
    })
    envelope.render.sceneHash = "0".repeat(64)
    expect(evaluateEvidenceGate(envelope)).toMatchObject({
      ok: false,
      findings: [{ id: "envelope.invalid" }]
    })
  })
})
