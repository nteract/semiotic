import { spawn, spawnSync, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import * as path from "path"
import { evaluateArtifact } from "../src/components/artifact/evaluateArtifact"
import { buildArtifactContract } from "../src/components/artifact/contract"
import { renderChartWithEvidence } from "../src/components/server/renderToStaticSVG"
import { toEvidenceEnvelope, evaluateEvidenceGate } from "../src/components/semiotic-evidence"
import type {
  ArtifactContract,
  ObligationResult,
  ObligationSummary
} from "../src/components/artifact/types"
import type { Datum } from "../src/components/charts/shared/datumTypes"
import type { JsonRpcResponse } from "../src/__tests__/scenarios/mcpProtocolTypes"

const SERVER_PATH = path.resolve(__dirname, "dist/mcp-server.js")
const CLI_PATH = path.resolve(__dirname, "cli.js")
const REQUIRED_FILES = [
  SERVER_PATH,
  CLI_PATH,
  path.resolve(__dirname, "../dist/semiotic-artifact.min.js"),
  path.resolve(__dirname, "../dist/semiotic-ai.min.js"),
  path.resolve(__dirname, "../dist/server.min.js"),
  path.resolve(__dirname, "../spec/v0.1/artifact-contract.schema.json")
]
const SERVER_DEPS_READY = REQUIRED_FILES.every(existsSync)
const MCP_PROCESS_TEST_TIMEOUT_MS = 20_000
const ARTIFACT_SCHEMA_URI = "semiotic://artifact-contract-schema"

function spawnServer(profile: "public" | "developer"): ChildProcess {
  return spawn("node", [SERVER_PATH, "--profile", profile], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      SEMIOTIC_DEPLOYMENT_CHANNEL: "",
      SEMIOTIC_GIT_SHA: "",
      SEMIOTIC_BUILD_ID: "",
      SEMIOTIC_BUILD_TIME: ""
    }
  })
}

function sendRequest(
  process: ChildProcess,
  method: string,
  params: Datum = {},
  id: string | number = 1
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    let buffer = ""
    const cleanup = () => {
      clearTimeout(timeout)
      process.stdout!.off("data", onData)
      process.off("exit", onExit)
    }
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      for (let index = 0; index < lines.length - 1; index += 1) {
        const line = lines[index].trim()
        if (!line) continue
        try {
          const message = JSON.parse(line)
          if (message.id === id) {
            cleanup()
            resolve(message)
          }
        } catch {
          // Ignore non-protocol process output.
        }
      }
      buffer = lines[lines.length - 1]
    }
    const onExit = (code: number | null) => {
      cleanup()
      reject(
        new Error(
          `Process exited with code ${code} before responding to ${method}`
        )
      )
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for response to ${method}`))
    }, 12_000)
    process.stdout!.on("data", onData)
    process.on("exit", onExit)
    process.stdin!.write(
      `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`
    )
  })
}

async function initialize(process: ChildProcess, profile: string) {
  return sendRequest(
    process,
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: `artifact-contract-${profile}-test`,
        version: "1.0.0"
      }
    },
    `${profile}-initialize`
  )
}

function explicitContract() {
  return {
    contractVersion: "0.1",
    artifact: { id: "mcp-artifact", kind: "chart" },
    purpose: {
      intents: [{ id: "trend", strength: "primary", source: "author" }],
      stakes: "informational"
    },
    claims: [
      {
        id: "unsupported-change",
        text: "The measure changed.",
        kind: "inference",
        status: "unsupported",
        evidenceIds: []
      }
    ],
    evidence: []
  }
}

function reviewedGeneratedContract() {
  return {
    contractVersion: "0.1",
    artifact: {
      id: "reviewed-generated-artifact",
      kind: "agent-answer",
      component: "LineChart"
    },
    purpose: {
      intents: [{ id: "trend", strength: "primary", source: "author" }],
      stakes: "informational",
      allowedUses: ["reviewed summary"]
    },
    claims: [
      {
        id: "reviewed-generated-change",
        text: "The measured value increased between the two observations.",
        kind: "observation",
        status: "supported",
        evidenceIds: ["reviewed-generated-source"],
        asOf: "2026-09-01T00:00:00Z",
        authoredBy: { id: "agent-writer", kind: "agent" },
        review: {
          status: "approved",
          reviewer: { id: "human-reviewer", kind: "human" },
          reviewedAt: "2026-09-02T00:00:00Z"
        }
      }
    ],
    evidence: [
      {
        id: "reviewed-generated-source",
        role: "source-data",
        fingerprint: "sha256:reviewed-generated-source",
        observedAt: "2026-09-01T00:00:00Z",
        relationship: "descriptive"
      }
    ],
    time: {
      observedAt: "2026-09-01T00:00:00Z",
      processedAt: "2026-09-01T00:01:00Z",
      snapshotAt: "2026-09-01T00:01:30Z",
      publishedAt: "2026-09-01T00:02:00Z",
      presentation: { state: "historical", label: "Reviewed observations" },
      window: {
        start: "2026-08-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled", basis: "Two recorded observations" },
      revision: { status: "original" },
      snapshot: { id: "reviewed-snapshot", format: "other" }
    },
    reception: {
      channels: [
        { channel: "visual", disclosure: "standard" },
        { channel: "screen-reader", disclosure: "detailed" },
        { channel: "agent", disclosure: "standard", rawData: "deny" }
      ],
      description: "A reviewed two-point sequence.",
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "The two observations are ordered in time."
    },
    accountability: {
      generatedBy: "fixture-generator",
      authors: [{ id: "agent-writer", kind: "agent" }]
    },
    inheritance: {
      requiredPaths: ["claims", "evidence", "time"],
      privacy: "public",
      rawDataDefault: "exclude",
      preservation: "full-fidelity"
    }
  }
}

function chartProps() {
  return {
    data: [
      { step: 1, value: 2 },
      { step: 2, value: 3 }
    ],
    xAccessor: "step",
    yAccessor: "value",
    title: "Two observations",
    description: "Value by step.",
    summary: "The second recorded value is higher than the first.",
    accessibleTable: true
  }
}

function obligationSummary(
  obligations: ReadonlyArray<ObligationResult>
): ObligationSummary {
  return {
    pass: obligations.filter(({ status }) => status === "pass").length,
    fail: obligations.filter(({ status }) => status === "fail").length,
    warn: obligations.filter(({ status }) => status === "warn").length,
    manual: obligations.filter(({ status }) => status === "manual").length,
    unknown: obligations.filter(({ status }) => status === "unknown").length,
    notApplicable: obligations.filter(
      ({ status }) => status === "not-applicable"
    ).length
  }
}

function evaluationParity(value: {
  status: string
  policy: { id: string; version: string }
  validation: { artifact: unknown }
  claims: { summary: ObligationSummary }
  temporal: { summary: ObligationSummary }
  obligations: ObligationResult[]
}) {
  return {
    status: value.status,
    policy: { id: value.policy.id, version: value.policy.version },
    contractValidation: value.validation.artifact,
    obligationSummary: obligationSummary(value.obligations),
    claimSummary: value.claims.summary,
    temporalSummary: value.temporal.summary,
    obligations: value.obligations
      .map(({ id, relation, status }) => ({ id, relation, status }))
      .sort((left, right) => left.id.localeCompare(right.id))
  }
}

function transportParity(value: Datum) {
  return {
    status: value.status,
    policy: { id: value.policy.id, version: value.policy.version },
    contractValidation: value.contractValidation,
    obligationSummary: value.obligationSummary,
    claimSummary: value.claimSummary,
    temporalSummary: value.temporalSummary,
    obligations: value.obligations
      .map(({ id, relation, status }: ObligationResult) => ({
        id,
        relation,
        status
      }))
      .sort((left: { id: string }, right: { id: string }) =>
        left.id.localeCompare(right.id)
      )
  }
}

describe.skipIf(!SERVER_DEPS_READY)("MCP artifact contract integration", () => {
  it(
    "keeps library, CLI, and MCP evaluation decisions in parity",
    async () => {
      const component = "LineChart"
      const props = chartProps()
      const contract = explicitContract() as unknown as ArtifactContract
      const now = "2026-09-03T00:00:00Z"
      const direct = evaluateArtifact(component, props, contract, {
        data: props.data,
        policy: "agent-generated",
        now,
        inChartContainer: false,
        describe: false,
        navigable: false,
        render: renderChartWithEvidence
      })
      const expected = evaluationParity(direct)

      const cli = spawnSync(
        process.execPath,
        [CLI_PATH, "--audit-artifact", "--json"],
        {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
          input: JSON.stringify({
            component,
            props,
            data: props.data,
            contract,
            policy: "agent-generated",
            now
          }),
          env: { ...process.env, SEMIOTIC_AI_SCHEMA_ONLY: "" }
        }
      )
      expect(cli.status).toBe(1)
      expect(cli.stderr).toBe("")
      const cliEvaluation = JSON.parse(cli.stdout)
      expect(evaluationParity(cliEvaluation)).toEqual(expected)

      const serverProcess = spawnServer("developer")
      try {
        await initialize(serverProcess, "developer-parity")
        const response = await sendRequest(
          serverProcess,
          "tools/call",
          {
            name: "auditArtifact",
            arguments: {
              component,
              props,
              data: props.data,
              contract,
              policyId: "agent-generated",
              now
            }
          },
          "audit-artifact-parity"
        )
        expect(response.result.isError).not.toBe(true)
        expect(response.result.structuredContent.truncated.obligations).toBe(
          false
        )
        expect(transportParity(response.result.structuredContent)).toEqual(
          expected
        )
      } finally {
        serverProcess.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "publishes the standalone schema in both profiles and gates contract tools",
    async () => {
      for (const profile of ["public", "developer"] as const) {
        const process = spawnServer(profile)
        try {
          await initialize(process, profile)
          const resources = await sendRequest(
            process,
            "resources/list",
            {},
            `${profile}-resources`
          )
          expect(
            resources.result.resources.map(
              (resource: { uri: string }) => resource.uri
            )
          ).toContain(ARTIFACT_SCHEMA_URI)

          const resource = await sendRequest(
            process,
            "resources/read",
            { uri: ARTIFACT_SCHEMA_URI },
            `${profile}-schema`
          )
          const schema = JSON.parse(resource.result.contents[0].text)
          expect(schema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            properties: { contractVersion: { const: "0.1" } }
          })

          const tools = await sendRequest(
            process,
            "tools/list",
            {},
            `${profile}-tools`
          )
          const names = tools.result.tools.map(
            (tool: { name: string }) => tool.name
          )
          for (const name of [
            "auditArtifact",
            "recommendRepresentation",
            "repairArtifact",
            "explainRefusal"
          ]) {
            expect(names.includes(name)).toBe(profile === "developer")
            if (profile === "developer") {
              const tool = tools.result.tools.find(
                (candidate: { name: string }) => candidate.name === name
              )
              expect(tool.inputSchema.properties.now).toMatchObject({
                type: "string"
              })
              expect(tool.inputSchema.properties.exceptions).toMatchObject({
                type: "array",
                maxItems: 20,
                items: {
                  type: "object",
                  required: ["rule", "rationale", "owner"]
                }
              })
            }
          }
        } finally {
          process.kill()
        }
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "returns bounded policy-aware results without filling missing facts",
    async () => {
      const process = spawnServer("developer")
      try {
        await initialize(process, "developer-tools")
        const common = {
          component: "LineChart",
          props: chartProps(),
          contract: explicitContract(),
          policyId: "agent-generated"
        }

        const audit = await sendRequest(
          process,
          "tools/call",
          { name: "auditArtifact", arguments: common },
          "audit-artifact"
        )
        expect(audit.result.isError).not.toBe(true)
        expect(audit.result.structuredContent).toMatchObject({
          status: "refuse",
          policy: { id: "agent-generated", version: "0.1" },
          truncated: {
            obligations: false,
            alternatives: false,
            repairs: false,
            manualChecks: false
          }
        })
        expect(
          audit.result.structuredContent.obligations.length
        ).toBeLessThanOrEqual(50)

        const strictPositive = await sendRequest(
          process,
          "tools/call",
          {
            name: "auditArtifact",
            arguments: {
              component: "LineChart",
              props: chartProps(),
              data: chartProps().data,
              contract: reviewedGeneratedContract(),
              policyId: "agent-generated",
              now: "2026-09-03T00:00:00Z"
            }
          },
          "audit-artifact-render-positive"
        )
        expect(strictPositive.result.isError).not.toBe(true)
        expect(strictPositive.result.structuredContent.status).not.toBe(
          "refuse"
        )
        expect(
          strictPositive.result.structuredContent.obligations
        ).toContainEqual(
          expect.objectContaining({
            id: "policy.render-evidence-required",
            status: "pass"
          })
        )

        const recommendation = await sendRequest(
          process,
          "tools/call",
          {
            name: "recommendRepresentation",
            arguments: {
              data: chartProps().data,
              contract: explicitContract(),
              policyId: "agent-generated",
              preferredComponent: "LineChart"
            }
          },
          "recommend-representation"
        )
        expect(recommendation.result.isError).not.toBe(true)
        expect(recommendation.result.structuredContent).toMatchObject({
          status: "refuse",
          policy: { id: "agent-generated", version: "0.1" },
          selected: { kind: "no-claim" }
        })
        expect(
          recommendation.result.structuredContent.alternatives
        ).not.toContainEqual(
          expect.objectContaining({ id: "chart:LineChart", selected: true })
        )

        for (const name of ["auditArtifact", "recommendRepresentation"]) {
          const claimless = await sendRequest(process, "tools/call", {
            name,
            arguments: {
              ...common, data: chartProps().data,
              contract: { ...reviewedGeneratedContract(), claims: [] },
              now: "2026-09-03T00:00:00Z"
            }
          }, `claimless-${name}`)
          expect(claimless.result.isError).not.toBe(true)
          expect(claimless.result.structuredContent.status).toBe("refuse")
        }

        const bound = buildArtifactContract("LineChart", chartProps(), {
          id: "mcp-rebinding", claims: [], evidence: []
        })
        const rebinding = await sendRequest(process, "tools/call", {
          name: "repairArtifact",
          arguments: {
            ...common,
            props: { ...chartProps(), data: [...chartProps().data].reverse() },
            contract: bound, policyId: "exploratory", applySafeIdentityRepairs: true
          }
        }, "repair-mismatched-data")
        expect(rebinding.result.isError).not.toBe(true)
        expect(rebinding.result.structuredContent.afterStatus).toBe("refuse")
        expect(rebinding.result.structuredContent.ledger).toContainEqual(
          expect.objectContaining({ path: "artifact.dataFingerprint", applied: false })
        )

        const repairContract = {
          ...explicitContract(),
          evidence: [
            {
              id: "bounded-source",
              role: "source-data",
              sample: {
                rowCount: 1,
                fields: ["private-value"],
                values: [{ "private-value": "not-returned" }]
              }
            }
          ]
        }
        const repair = await sendRequest(
          process,
          "tools/call",
          {
            name: "repairArtifact",
            arguments: {
              ...common,
              contract: repairContract,
              applySafeIdentityRepairs: true
            }
          },
          "repair-artifact"
        )
        expect(repair.result.isError, JSON.stringify(repair.result)).not.toBe(
          true
        )
        expect(repair.result.structuredContent.policy).toEqual({
          id: "agent-generated",
          version: "0.1"
        })
        expect(repair.result.structuredContent.contract.artifact).toMatchObject(
          {
            component: "LineChart",
            configFingerprint: expect.any(String),
            dataFingerprint: expect.any(String)
          }
        )
        expect(repair.result.structuredContent.contract).not.toHaveProperty(
          "time"
        )
        expect(
          repair.result.structuredContent.contract.claims[0]
        ).not.toHaveProperty("review")
        expect(repair.result.structuredContent.contract.evidence).toEqual([
          { id: "bounded-source", role: "source-data" }
        ])
        expect(repair.result.structuredContent).toMatchObject({
          contractTransfer: {
            format: "mcp",
            preservation: "claim-evidence-preserved",
            omittedPaths: ["evidence[].sample"]
          },
          truncated: {
            ledger: false,
            contract: false,
            transfer: false
          }
        })
        expect(repair.result.structuredContent.ledger).toContainEqual(
          expect.objectContaining({
            category: "identity",
            applied: true,
            changesClaim: false
          })
        )

        const missingEvidenceRepair = await sendRequest(
          process,
          "tools/call",
          {
            name: "repairArtifact",
            arguments: {
              ...common,
              contract: {
                ...explicitContract(),
                claims: [
                  {
                    ...explicitContract().claims[0],
                    status: "supported",
                    evidenceIds: ["missing-evidence"]
                  }
                ]
              }
            }
          },
          "repair-artifact-missing-evidence"
        )
        expect(
          missingEvidenceRepair.result.isError,
          JSON.stringify(missingEvidenceRepair.result)
        ).not.toBe(true)
        expect(missingEvidenceRepair.result.structuredContent).toMatchObject({
          status: "requires-input",
          contractTransfer: {
            format: "mcp",
            preservation: "unknown",
            preservedPaths: [],
            omittedPaths: ["$"]
          },
          truncated: { contract: true }
        })
        expect(
          missingEvidenceRepair.result.structuredContent.contractTransfer
            .warnings[0]
        ).toContain("semantic")
        expect(
          missingEvidenceRepair.result.structuredContent.ledger.length
        ).toBeGreaterThan(0)

        const crowdedPieData = Array.from({ length: 15 }, (_, index) => ({
          category: `Category ${index + 1}`,
          value: index + 1
        }))
        const configurationRepair = await sendRequest(
          process,
          "tools/call",
          {
            name: "repairArtifact",
            arguments: {
              component: "PieChart",
              props: {
                data: crowdedPieData,
                categoryAccessor: "category",
                valueAccessor: "value"
              },
              contract: {
                ...explicitContract(),
                artifact: {
                  ...explicitContract().artifact,
                  component: "PieChart"
                }
              },
              policyId: "agent-generated"
            }
          },
          "repair-artifact-configuration"
        )
        expect(configurationRepair.result.isError).not.toBe(true)
        expect(
          configurationRepair.result.structuredContent.ledger
        ).toContainEqual(
          expect.objectContaining({
            category: "configuration",
            applied: false,
            changesClaim: false,
            suggestedComponent: expect.any(String)
          })
        )

        const oversized = await sendRequest(
          process,
          "tools/call",
          {
            name: "repairArtifact",
            arguments: {
              ...common,
              contract: {
                ...explicitContract(),
                extensions: {
                  "com.example.large": { payload: "x".repeat(70_000) }
                }
              }
            }
          },
          "repair-artifact-oversized"
        )
        expect(oversized.result.isError).not.toBe(true)
        expect(oversized.result.structuredContent).not.toHaveProperty(
          "contract"
        )
        expect(oversized.result.structuredContent).toMatchObject({
          policy: { id: "agent-generated", version: "0.1" },
          contractTransfer: { format: "mcp" },
          truncated: { contract: true }
        })

        const refusal = await sendRequest(
          process,
          "tools/call",
          { name: "explainRefusal", arguments: common },
          "explain-refusal"
        )
        expect(refusal.result.isError).not.toBe(true)
        expect(refusal.result.structuredContent).toMatchObject({
          status: "refuse",
          evaluationStatus: "refuse",
          policy: { id: "agent-generated", version: "0.1" },
          explanation: expect.stringContaining("agent-generated@0.1")
        })
      } finally {
        process.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "bounds representation identifiers and rejects oversized component preferences",
    async () => {
      const process = spawnServer("developer")
      try {
        await initialize(process, "developer-bounds")
        const preferredComponent = "é".repeat(120)
        const recommendation = await sendRequest(
          process,
          "tools/call",
          {
            name: "recommendRepresentation",
            arguments: {
              data: chartProps().data,
              contract: {
                contractVersion: "0.1",
                artifact: { id: "bounded-output", kind: "chart" },
                purpose: {
                  intents: [
                    { id: "trend", strength: "primary", source: "author" }
                  ],
                  stakes: "exploratory"
                },
                claims: [],
                evidence: []
              },
              policyId: "exploratory",
              preferredComponent
            }
          },
          "recommend-representation-bounds"
        )
        expect(recommendation.result.isError).not.toBe(true)
        const candidates = [
          recommendation.result.structuredContent.selected,
          ...(recommendation.result.structuredContent.alternatives ?? []),
          ...(recommendation.result.structuredContent.rejected ?? [])
        ].filter(Boolean)
        expect(candidates.length).toBeGreaterThan(0)
        for (const candidate of candidates) {
          expect(Buffer.byteLength(candidate.id, "utf8")).toBeLessThanOrEqual(
            240
          )
        }

        const oversized = await sendRequest(
          process,
          "tools/call",
          {
            name: "recommendRepresentation",
            arguments: {
              data: chartProps().data,
              contract: explicitContract(),
              policyId: "exploratory",
              preferredComponent: "x".repeat(121)
            }
          },
          "recommend-representation-oversized-preference"
        )
        expect(oversized.result.isError).toBe(true)
      } finally {
        process.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "uses the explicit reference clock across artifact operations",
    async () => {
      const process = spawnServer("developer")
      try {
        await initialize(process, "developer-reference-clock")
        const now = "2026-09-03T00:00:00Z"
        const contract = reviewedGeneratedContract()
        const common = {
          component: "LineChart",
          props: chartProps(),
          data: chartProps().data,
          contract,
          policyId: "agent-generated",
          now
        }

        const audit = await sendRequest(
          process,
          "tools/call",
          { name: "auditArtifact", arguments: common },
          "audit-artifact-reference-clock"
        )
        expect(audit.result.isError).not.toBe(true)
        expect(audit.result.structuredContent.obligations).not.toContainEqual(
          expect.objectContaining({
            id: "claims.model-review.reviewed-generated-change"
          })
        )

        const recommendation = await sendRequest(
          process,
          "tools/call",
          {
            name: "recommendRepresentation",
            arguments: {
              data: common.data,
              contract,
              policyId: common.policyId,
              preferredComponent: common.component,
              now
            }
          },
          "recommend-representation-reference-clock"
        )
        expect(recommendation.result.isError).not.toBe(true)
        expect(recommendation.result.structuredContent.status).not.toBe(
          "refuse"
        )
        expect(recommendation.result.structuredContent.selected.kind).not.toBe(
          "no-claim"
        )

        const repair = await sendRequest(
          process,
          "tools/call",
          { name: "repairArtifact", arguments: common },
          "repair-artifact-reference-clock"
        )
        expect(repair.result.isError, JSON.stringify(repair.result)).not.toBe(
          true
        )
        expect(repair.result.structuredContent.policy).toEqual({
          id: "agent-generated",
          version: "0.1"
        })

        const explanation = await sendRequest(
          process,
          "tools/call",
          { name: "explainRefusal", arguments: common },
          "explain-refusal-reference-clock"
        )
        expect(explanation.result.isError).not.toBe(true)
        expect(
          explanation.result.structuredContent.failures
        ).not.toContainEqual(
          expect.objectContaining({
            id: "claims.model-review.reviewed-generated-change"
          })
        )
      } finally {
        process.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "applies and reports bounded policy exceptions across artifact operations",
    async () => {
      const process = spawnServer("developer")
      try {
        await initialize(process, "developer-policy-exceptions")
        const now = "2026-09-03T00:00:00Z"
        const contract = reviewedGeneratedContract()
        const renderException = {
          rule: "requireRenderEvidence",
          rationale: "Renderer integration is tracked in this bounded review.",
          owner: "release-review",
          reviewAt: "2026-09-05T00:00:00Z"
        }
        const common = {
          component: "LineChart",
          props: chartProps(),
          data: chartProps().data,
          contract,
          policyId: "agent-generated",
          exceptions: [renderException],
          now
        }

        const audit = await sendRequest(
          process,
          "tools/call",
          { name: "auditArtifact", arguments: common },
          "audit-artifact-policy-exception"
        )
        expect(audit.result.isError).not.toBe(true)
        expect(audit.result.structuredContent.policy).toMatchObject({
          id: "agent-generated",
          version: "0.1",
          appliedExceptions: [renderException]
        })
        expect(audit.result.structuredContent.status).not.toBe("refuse")

        const repair = await sendRequest(
          process,
          "tools/call",
          { name: "repairArtifact", arguments: common },
          "repair-artifact-policy-exception"
        )
        expect(repair.result.isError, JSON.stringify(repair.result)).not.toBe(
          true
        )
        expect(repair.result.structuredContent.policy).toMatchObject({
          appliedExceptions: [renderException]
        })

        const explanation = await sendRequest(
          process,
          "tools/call",
          { name: "explainRefusal", arguments: common },
          "explain-refusal-policy-exception"
        )
        expect(explanation.result.isError).not.toBe(true)
        expect(explanation.result.structuredContent).toMatchObject({
          status: "not-refused",
          policy: { appliedExceptions: [renderException] }
        })

        const unreviewedContract = {
          ...contract,
          claims: contract.claims.map((claim) => ({
            ...claim,
            review: undefined
          }))
        }
        const reviewException = {
          rule: "requireReviewForModelClaims",
          rationale:
            "A named reviewer will complete this bounded internal review.",
          owner: "release-review",
          expiresAt: "2026-09-05T00:00:00Z"
        }
        const recommendation = await sendRequest(
          process,
          "tools/call",
          {
            name: "recommendRepresentation",
            arguments: {
              data: common.data,
              contract: unreviewedContract,
              policyId: common.policyId,
              preferredComponent: common.component,
              exceptions: [reviewException],
              now
            }
          },
          "recommend-representation-policy-exception"
        )
        expect(recommendation.result.isError).not.toBe(true)
        expect(recommendation.result.structuredContent.selected.kind).not.toBe(
          "no-claim"
        )
        expect(recommendation.result.structuredContent.policy).toMatchObject({
          appliedExceptions: [reviewException]
        })

        const expiredException = {
          ...reviewException,
          reviewAt: "2026-09-02T00:00:00Z"
        }
        const expired = await sendRequest(
          process,
          "tools/call",
          {
            name: "auditArtifact",
            arguments: {
              ...common,
              contract: unreviewedContract,
              exceptions: [expiredException]
            }
          },
          "audit-artifact-expired-policy-exception"
        )
        expect(expired.result.isError).not.toBe(true)
        expect(expired.result.structuredContent).toMatchObject({
          status: "refuse",
          policy: { rejectedExceptions: [expiredException] }
        })
      } finally {
        process.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it(
    "carries an optional contract and transfer status in render evidence",
    async () => {
      const process = spawnServer("developer")
      try {
        await initialize(process, "developer-render")
        const rendered = await sendRequest(
          process,
          "tools/call",
          {
            name: "renderChart",
            arguments: {
              component: "LineChart",
              props: chartProps(),
              contract: {
                contractVersion: "0.1",
                artifact: { id: "rendered-artifact", kind: "chart" },
                purpose: { intents: [] },
                claims: [],
                evidence: []
              }
            }
          },
          "render-with-contract"
        )
        expect(rendered.result.isError).not.toBe(true)
        const evidenceText = rendered.result.content.find(
          (item: { type: string; text?: string }) =>
            item.type === "text" && item.text?.startsWith("Render evidence:\n")
        ).text
        const evidence = JSON.parse(
          evidenceText.slice("Render evidence:\n".length)
        )
        expect(evidence).toMatchObject({
          artifactContract: {
            contractVersion: "0.1",
            artifact: { id: "rendered-artifact" }
          },
          artifactTransfer: {
            status: "preserved",
            omittedPaths: []
          }
        })
      } finally {
        process.kill()
      }
    },
    MCP_PROCESS_TEST_TIMEOUT_MS
  )

  it("preserves a binding failure from MCP render evidence through the publication gate", async () => {
    const process = spawnServer("developer")
    try {
      await initialize(process, "developer-binding")
      const props = chartProps()
      const contract = buildArtifactContract("LineChart", props)
      contract.artifact.dataFingerprint = "sha256:other-input"
      const rendered = await sendRequest(process, "tools/call", {
        name: "renderChart",
        arguments: { component: "LineChart", props, contract }
      }, "render-mismatched-contract")
      expect(rendered.result.isError).not.toBe(true)
      const evidenceText = rendered.result.content.find(
        (item: { type: string; text?: string }) => item.type === "text" && item.text?.startsWith("Render evidence:\n")
      ).text
      const evidence = JSON.parse(evidenceText.slice("Render evidence:\n".length))
      expect(evidence).toMatchObject({
        sceneHashVersion: 2,
        artifactBinding: { status: "mismatch", mismatchPaths: ["artifact.dataFingerprint"] }
      })
      expect(evaluateEvidenceGate(toEvidenceEnvelope("LineChart", props, { ssrEvidence: evidence })).ok).toBe(false)
      const audited = await sendRequest(process, "tools/call", {
        name: "auditArtifact",
        arguments: { component: "LineChart", props, contract, policyId: "exploratory" }
      }, "audit-mismatched-contract")
      expect(audited.result.structuredContent.status).toBe("refuse")
    } finally {
      process.kill()
    }
  }, MCP_PROCESS_TEST_TIMEOUT_MS)
})
