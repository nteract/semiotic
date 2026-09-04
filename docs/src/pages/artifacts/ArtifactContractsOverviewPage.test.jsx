// @vitest-environment node

import { transform } from "esbuild"
import { describe, expect, it } from "vitest"
import {
  INSPECTOR_CODE,
  STRICT_CODE,
  STRICT_EVALUATION,
  STRICT_PACKET,
  STRICT_PACKET_RESULT,
  TEMPORAL_ADAPTER_CODE,
} from "./ArtifactContractsOverviewPage"

describe("Artifact Contracts overview code samples", () => {
  it("keeps the strict publication sample valid and free of placeholder functions", async () => {
    const result = await transform(STRICT_CODE, { format: "esm", loader: "jsx" })

    expect(result.code).toContain("prepareArtifactForPublication")
    expect(STRICT_CODE).not.toContain("showRepairs")
    expect(STRICT_CODE).toContain('evaluation.status !== "acceptable"')
    expect(STRICT_CODE).toContain("render: renderChartWithEvidence")
  })

  it("withholds the live packet when the strict publication check is not acceptable", () => {
    expect(STRICT_EVALUATION.status).toBe("refuse")
    expect(STRICT_PACKET).toBeNull()
    expect(STRICT_PACKET_RESULT).toBe("withheld")
  })

  it("keeps the synthetic temporal adapter example valid and vendor-neutral", async () => {
    const result = await transform(TEMPORAL_ADAPTER_CODE, { format: "esm", loader: "jsx" })

    expect(result.code).toContain("mergeTemporalContexts")
    expect(TEMPORAL_ADAPTER_CODE).toContain('status: "unknown"')
    expect(TEMPORAL_ADAPTER_CODE).not.toMatch(/from "(?:kafka|flink|tableflow)/i)
  })

  it("documents the separate React inspector entry with a valid sample", async () => {
    const result = await transform(INSPECTOR_CODE, { format: "esm", loader: "jsx" })

    expect(result.code).toContain("ArtifactInspector")
    expect(INSPECTOR_CODE).toContain('from "semiotic/artifact/react"')
    expect(INSPECTOR_CODE).toContain("evaluation={evaluation}")
  })
})
