import { beforeAll, describe, expect, it } from "vitest"
import { loadPublicChartPropTypes } from "../../../scripts/lib/public-chart-prop-types"
import { CHART_SPECS } from "../../components/charts/shared/chartSpecs"
import { diagnoseConfig } from "../../components/charts/shared/diagnoseConfig"
import { validateProps } from "../../components/charts/shared/validateProps"

/**
 * A prop the component's TypeScript type accepts is a real prop. The validator
 * used to know only the serialized (wire) contract, so React-only props such as
 * `linkedHover`, `selection`, and `hoverRadius` came back as "Unknown prop"
 * errors with a "remove it" fix. This walks every chart's resolved public type
 * and requires the validator to recognize each member.
 */

const SAMPLE_VALUES: Record<string, unknown> = {
  string: "sample",
  number: 1,
  boolean: true,
  array: [],
  object: {},
  function: () => undefined,
}

let publicProps: ReturnType<typeof loadPublicChartPropTypes>

beforeAll(() => {
  publicProps = loadPublicChartPropTypes(process.cwd(), Object.keys(CHART_SPECS))
}, 120_000)

describe("validateProps knows every public chart prop", () => {
  it("resolves a public props type for every chart spec", () => {
    expect(publicProps.missing).toEqual([])
    expect(publicProps.props.size).toBe(Object.keys(CHART_SPECS).length)
  })

  it("never reports a public prop as unknown", () => {
    const unknown: string[] = []
    for (const [chart, props] of publicProps.props) {
      for (const [propName, shape] of props) {
        const runtimeType =
          [...shape.runtimeTypes].find((type) => type in SAMPLE_VALUES) ?? "string"
        const { issues } = validateProps(chart, {
          [propName]: SAMPLE_VALUES[runtimeType],
        })
        if (
          issues.some(
            (issue) => issue.code === "UNKNOWN_PROP" && issue.path === propName,
          )
        ) {
          unknown.push(`${chart}.${propName}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it("never rejects a public prop for a runtime type its TypeScript type accepts", () => {
    // A ReactNode prop takes a string as readily as an element, and an
    // accessor prop takes a function as readily as a field name. A type error
    // for either is the same false positive as an "Unknown prop".
    const rejected: string[] = []
    for (const [chart, props] of publicProps.props) {
      for (const [propName, shape] of props) {
        for (const runtimeType of shape.runtimeTypes) {
          if (!(runtimeType in SAMPLE_VALUES)) continue
          const { issues } = validateProps(chart, {
            [propName]: SAMPLE_VALUES[runtimeType],
          })
          if (
            issues.some(
              (issue) =>
                issue.code === "INVALID_PROP_TYPE" && issue.path === propName,
            )
          ) {
            rejected.push(`${chart}.${propName} (${runtimeType})`)
          }
        }
      }
    }
    expect(rejected.sort()).toEqual([...KNOWN_WIRE_TYPE_GAPS].sort())
  })

  it("lets linked-interaction props through diagnoseConfig without an error", () => {
    const result = diagnoseConfig("BarChart", {
      data: [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Bars",
      linkedHover: true,
      selection: { name: "s" },
      hoverRadius: 30,
    })
    expect(result.diagnoses.filter((d) => d.severity === "error")).toEqual([])
    expect(result.ok).toBe(true)
  })
})

/**
 * Serialized props whose spec type still omits "function" although the public
 * type accepts a function accessor. Closing these adds an
 * `x-semiotic-runtime-types` entry to the wire schema, so it is a schema change
 * rather than a validator fix. Remove an entry here when its spec is widened;
 * do not add to this list.
 */
const KNOWN_WIRE_TYPE_GAPS = [
  "BumpChart.labelPriorityAccessor (function)",
  "ProcessSankey.labelPriorityAccessor (function)",
  "ProcessSankey.edgeOpacity (function)",
]
