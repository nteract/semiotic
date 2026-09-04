// @vitest-environment node

import { transform } from "esbuild"
import { describe, expect, it } from "vitest"
import { EXCEPTION_CODE, POLICY_EXTENSION_CODE } from "./ArtifactGovernancePage"

describe("artifact policy and contribution guide", () => {
  it("keeps both public code samples executable", async () => {
    const policy = await transform(POLICY_EXTENSION_CODE, {
      format: "esm",
      loader: "jsx",
    })
    const exception = await transform(EXCEPTION_CODE, {
      format: "esm",
      loader: "jsx",
    })

    expect(policy.code).toContain("newsroomPreview")
    expect(exception.code).toContain("reviewAt")
  })

  it("keeps policy identity and manual review explicit", () => {
    expect(POLICY_EXTENSION_CODE).toContain('id: "example.newsroom-preview"')
    expect(POLICY_EXTENSION_CODE).toContain('version: "1.0.0"')
    expect(POLICY_EXTENSION_CODE).toContain("allowManualChecks: true")
    expect(EXCEPTION_CODE).toContain("owner:")
    expect(EXCEPTION_CODE).toContain("now:")
  })
})
