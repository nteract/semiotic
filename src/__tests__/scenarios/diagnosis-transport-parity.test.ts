import { spawnSync, type ChildProcess } from "node:child_process"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  diagnoseChart,
  type DiagnosisRequest
} from "../../../ai/operations/diagnose"
import { diagnoseConfig } from "../../components/charts/shared/diagnoseConfig"
import {
  SERVER_DEPS_READY,
  initializeServer,
  sendRequest,
  spawnServer
} from "./mcpStdioHarness"

import { realtimeDefinitionFixtures } from "../../test-utils/realtimeDefinitionFixtures"

const cases: DiagnosisRequest[] = [
  ...Object.entries(realtimeDefinitionFixtures).flatMap(
    ([component, fixture]) => {
      const { data, ...props } = fixture
      return [
        { component, props },
        { component, props, usageMode: "push" },
        { component, props: { ...props, data: [] }, usageMode: "push" },
        { component, props: { ...props, data } }
      ]
    }
  ),
  { component: "LineChart", props: {} },
  { component: "LineChart", props: {}, usageMode: "push" },
  { component: "LineChart", props: { data: [] }, usageMode: "push" },
  { component: "LineChart", props: { width: "wide" }, usageMode: "push" },
  { component: "NotAChart", props: {} },
  {
    component: "AreaChart",
    props: {
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 }
      ],
      xAccessor: "x",
      yAccessor: "y"
    }
  }
]

describe.skipIf(!SERVER_DEPS_READY)("CLI/MCP diagnosis parity", () => {
  let proc: ChildProcess
  beforeAll(async () => {
    proc = spawnServer()
    await initializeServer(proc)
  })
  afterAll(() => {
    proc?.kill()
  })

  it.each(cases)("shares the report for %j", async (request) => {
    const expected = diagnoseChart(request, { diagnoseConfig }, () => {
      throw new Error("runtime must not load schema")
    })
    const cli = spawnSync(
      process.execPath,
      ["ai/cli.js", "--doctor", "--json", JSON.stringify(request)],
      {
        encoding: "utf8",
        env: { ...process.env, SEMIOTIC_AI_SCHEMA_ONLY: "" }
      }
    )
    expect(cli.status, cli.stderr).toBe(expected.ok ? 0 : 1)
    expect(JSON.parse(cli.stdout)).toEqual(expected)

    const response = await sendRequest(proc, "tools/call", {
      name: "diagnoseConfig",
      arguments: request
    })
    expect(Boolean(response.result.isError)).toBe(!expected.ok)
    const text = response.result.content[0].text
    if (expected.mode !== "diagnose") throw new Error("expected full diagnosis")
    for (const diagnosis of expected.diagnoses) {
      expect(text).toContain(`[${diagnosis.code}] ${diagnosis.message}`)
    }
    if (request.usageMode === "push") expect(text).toContain("Usage mode: push")
    if (expected.ok) expect(text).toContain("looks good")
  })
})

describe("CLI schema-only realtime diagnosis", () => {
  it.each(Object.entries(realtimeDefinitionFixtures))(
    "keeps %s startup and snapshot modes distinct",
    (component, fixture) => {
      const { data: _data, ...props } = fixture
      for (const usageMode of ["static", "push"]) {
        const cli = spawnSync(
          process.execPath,
          [
            "ai/cli.js",
            "--doctor",
            "--json",
            JSON.stringify({ component, props, usageMode })
          ],
          {
            encoding: "utf8",
            env: { ...process.env, SEMIOTIC_AI_SCHEMA_ONLY: "1" }
          }
        )
        const ok = usageMode === "push" && component !== "TemporalHistogram"
        expect(cli.status, cli.stderr).toBe(ok ? 0 : 1)
        expect(JSON.parse(cli.stdout)).toMatchObject({
          component,
          mode: "schema-only",
          usageMode,
          ok
        })
      }
    }
  )
})
