import { renderMcpChartOnce } from "./mcp-render-chart"
import { validateProps } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"
import { renderHOCToSVG } from "./renderHOCToSVG"

vi.mock("semiotic/ai", () => ({ validateProps: vi.fn() }))
vi.mock("semiotic/server", () => ({ renderChartWithEvidence: vi.fn() }))
vi.mock("./renderHOCToSVG", () => ({ renderHOCToSVG: vi.fn() }))

describe("one-pass MCP chart rendering", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(validateProps).mockReturnValue({
      valid: true,
      errors: [],
      warnings: []
    })
  })
  it("uses one scene for both SVG and evidence without invoking React SSR", () => {
    const evidence = { sceneHash: "one-scene" }
    vi.mocked(renderChartWithEvidence).mockReturnValue({
      svg: "<svg/>",
      evidence
    } as ReturnType<typeof renderChartWithEvidence>)
    const props = { data: [{ x: 1, y: 2 }] }
    const contract = { contractVersion: "test" }
    expect(renderMcpChartOnce("LineChart", props, contract)).toEqual({
      svg: "<svg/>",
      evidence,
      error: null
    })
    expect(renderChartWithEvidence).toHaveBeenCalledExactlyOnceWith(
      "LineChart",
      props,
      { artifactContract: contract }
    )
    expect(renderHOCToSVG).not.toHaveBeenCalled()
  })
  it("uses React SSR only for a component without a server configuration", () => {
    vi.mocked(renderChartWithEvidence).mockImplementation(() => {
      throw new Error(
        'Unknown chart component: "Custom". Use another component.'
      )
    })
    vi.mocked(renderHOCToSVG).mockReturnValue({ svg: "<svg/>", error: null })
    expect(renderMcpChartOnce("Custom", {})).toEqual({
      svg: "<svg/>",
      error: null
    })
    expect(renderHOCToSVG).toHaveBeenCalledExactlyOnceWith("Custom", {})
  })
  it("does not retry a failed layout through another renderer", () => {
    vi.mocked(renderChartWithEvidence).mockImplementation(() => {
      throw new Error("Invalid layout")
    })
    expect(renderMcpChartOnce("LineChart", {})).toEqual({
      svg: null,
      error: "Render error: Invalid layout"
    })
    expect(renderHOCToSVG).not.toHaveBeenCalled()
  })
  it("rejects invalid props before either renderer runs", () => {
    vi.mocked(validateProps).mockReturnValue({
      valid: false,
      errors: ["Missing data"],
      warnings: []
    })
    expect(renderMcpChartOnce("LineChart", {})).toEqual({
      svg: null,
      error: "Validation errors:\nMissing data"
    })
    expect(renderChartWithEvidence).not.toHaveBeenCalled()
    expect(renderHOCToSVG).not.toHaveBeenCalled()
  })
})
