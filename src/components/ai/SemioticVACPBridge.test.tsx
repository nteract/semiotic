import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  ObservationProvider,
  useObservationSelector,
  type ObservationStoreState,
} from "../store/ObservationStore"
import {
  SelectionProvider,
  useSelectionSelector,
  type SelectionStoreState,
} from "../store/SelectionStore"
import {
  SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
  SEMIOTIC_VACP_INSPECT_DATA_ACTION,
  SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
  SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
  type SemioticVACPBridge as SemioticVACPBridgeApi,
  type SemioticVACPBridgeInstallation,
  type SemioticVACPChart,
} from "./vacpAdapter"
import { SemioticVACPBridge } from "./SemioticVACPBridge"

const globalRecord = globalThis as unknown as Record<string, unknown>
const testKeys = new Set<string>()
let nextKey = 0

const charts: readonly SemioticVACPChart[] = [
  {
    chartId: "chart-a",
    component: "Scatterplot",
    title: "Chart A",
    props: {
      data: [
        { category: "A", value: 2 },
        { category: "B", value: 9 },
      ],
      xAccessor: "category",
      yAccessor: "value",
    },
    selections: [
      {
        name: "picked",
        fields: ["category"],
        mode: "point",
        clientId: "agent-point",
      },
      {
        name: "range",
        fields: ["value"],
        mode: "interval",
        clientId: "agent-interval",
      },
    ],
  },
]

function makeGlobalKey(label: string): string {
  const key = `__semiotic_vacp_${label}_${nextKey++}`
  testKeys.add(key)
  return key
}

function stores(children: React.ReactNode): React.ReactElement {
  return (
    <SelectionProvider>
      <ObservationProvider>{children}</ObservationProvider>
    </SelectionProvider>
  )
}

function installedBridge(globalKey: string): SemioticVACPBridgeApi {
  const bridge = globalRecord[globalKey]
  expect(bridge).toBeDefined()
  return bridge as SemioticVACPBridgeApi
}

async function execute(
  bridge: SemioticVACPBridgeApi,
  callId: string,
  name: string,
  params: unknown
): Promise<void> {
  await act(async () => {
    const result = await bridge.execute({ callId, name, params })
    expect(result).toMatchObject({ callId, ok: true })
  })
}

afterEach(() => {
  cleanup()
  for (const key of testKeys) delete globalRecord[key]
  testKeys.clear()
})

describe("SemioticVACPBridge", () => {
  it("maps point, interval, and clear actions into the nearest selection store", async () => {
    const globalKey = makeGlobalKey("selections")
    render(
      stores(
        <SemioticVACPBridge
          appId="selection-app"
          charts={charts}
          globalKey={globalKey}
          now={() => 0}
        />
      )
    )
    const bridge = installedBridge(globalKey)

    await execute(
      bridge,
      "point",
      SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
      {
        selectionRef: bridge.refs.selection("picked"),
        fields: { category: ["B"] },
      }
    )
    await execute(
      bridge,
      "interval",
      SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
      {
        selectionRef: bridge.refs.selection("range"),
        fields: { value: [9, 2] },
      }
    )

    let state = await bridge.getState()
    expect(state.state[bridge.refs.selection("picked")]).toMatchObject({
      name: "picked",
      clauses: [
        {
          clientId: "agent-point",
          type: "point",
          fields: {
            category: { type: "point", values: ["B"] },
          },
        },
      ],
    })
    expect(state.state[bridge.refs.selection("range")]).toMatchObject({
      name: "range",
      clauses: [
        {
          clientId: "agent-interval",
          type: "interval",
          fields: {
            value: { type: "interval", range: [2, 9] },
          },
        },
      ],
    })

    await execute(
      bridge,
      "clear",
      SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
      { selectionRef: bridge.refs.selection("picked") }
    )
    state = await bridge.getState()
    expect(state.state[bridge.refs.selection("picked")]).toMatchObject({
      clauses: [],
    })
    expect(state.state[bridge.refs.selection("range")]).toMatchObject({
      clauses: [{ clientId: "agent-interval" }],
    })
  })

  it("preserves reserved-looking field names as own selection constraints", async () => {
    const globalKey = makeGlobalKey("reserved-field")
    const reservedCharts: readonly SemioticVACPChart[] = [
      {
        chartId: "reserved",
        component: "Scatterplot",
        props: {
          data: [
            JSON.parse('{"__proto__":"A","value":1}'),
            JSON.parse('{"__proto__":"B","value":2}'),
          ],
          xAccessor: "__proto__",
          yAccessor: "value",
        },
        selections: [
          {
            name: "reserved-picked",
            fields: ["__proto__"],
            mode: "point",
          },
        ],
      },
    ]
    render(
      stores(
        <SemioticVACPBridge
          appId="reserved-app"
          charts={reservedCharts}
          globalKey={globalKey}
          now={() => 0}
        />
      )
    )
    const bridge = installedBridge(globalKey)
    const fields = Object.create(null) as Record<string, unknown[]>
    fields.__proto__ = ["B"]

    await execute(
      bridge,
      "reserved-point",
      SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
      {
        selectionRef: bridge.refs.selection("reserved-picked"),
        fields,
      }
    )

    const state = await bridge.getState()
    const selection = state.state[
      bridge.refs.selection("reserved-picked")
    ] as {
      clauses: Array<{ fields: Record<string, unknown> }>
    }
    expect(
      Object.prototype.hasOwnProperty.call(
        selection.clauses[0].fields,
        "__proto__"
      )
    ).toBe(true)
    expect(selection.clauses[0].fields.__proto__).toEqual({
      type: "point",
      values: ["B"],
    })
  })

  it("surfaces human selection mutations and the latest observation", async () => {
    const globalKey = makeGlobalKey("human")
    const storeApi = {} as {
      setClause: SelectionStoreState["setClause"]
      pushObservation: ObservationStoreState["pushObservation"]
    }

    function StoreProbe() {
      storeApi.setClause = useSelectionSelector((state) => state.setClause)
      storeApi.pushObservation = useObservationSelector(
        (state) => state.pushObservation
      )
      return null
    }

    render(
      stores(
        <>
          <StoreProbe />
          <SemioticVACPBridge
            appId="human-app"
            charts={charts}
            globalKey={globalKey}
            now={() => 0}
          />
        </>
      )
    )
    const bridge = installedBridge(globalKey)

    act(() => {
      storeApi.setClause("picked", {
        clientId: "human-chart",
        type: "point",
        fields: {
          category: { type: "point", values: new Set(["A"]) },
        },
      })
      storeApi.pushObservation({
        type: "focus",
        datum: { category: "A", value: 2 },
        inputType: "keyboard",
        timestamp: 42,
        chartType: "scatterplot",
        chartId: "chart-a",
      })
    })

    const state = await bridge.getState()
    expect(state.state[bridge.refs.selection("picked")]).toMatchObject({
      clauses: [
        {
          clientId: "human-chart",
          fields: {
            category: { type: "point", values: ["A"] },
          },
        },
      ],
    })
    expect(state.state[bridge.refs.observation("chart-a")]).toMatchObject({
      type: "focus",
      datum: { category: "A", value: 2 },
      inputType: "keyboard",
      timestamp: 42,
    })
  })

  it("reports install refusal without replacing a foreign global", () => {
    const globalKey = makeGlobalKey("refusal")
    const foreignBridge = { owner: "foreign" }
    globalRecord[globalKey] = foreignBridge
    let installation: SemioticVACPBridgeInstallation | undefined

    const view = render(
      stores(
        <SemioticVACPBridge
          appId="refusal-app"
          charts={charts}
          globalKey={globalKey}
          onInstallationChange={(next) => {
            installation = next
          }}
        />
      )
    )

    expect(globalRecord[globalKey]).toBe(foreignBridge)
    expect(installation).toMatchObject({
      installed: false,
      globalKey,
      reason: `Refused to replace existing global "${globalKey}".`,
    })
    expect(installation?.cleanup()).toBe(false)
    view.unmount()
    expect(globalRecord[globalKey]).toBe(foreignBridge)
  })

  it("cleans up only while its bridge still owns the global", () => {
    const ownedKey = makeGlobalKey("owned-cleanup")
    const ownedView = render(
      stores(
        <SemioticVACPBridge
          appId="owned-app"
          charts={charts}
          globalKey={ownedKey}
        />
      )
    )
    expect(globalRecord[ownedKey]).toBeDefined()
    ownedView.unmount()
    expect(globalRecord[ownedKey]).toBeUndefined()

    const replacedKey = makeGlobalKey("replaced-cleanup")
    const replacedView = render(
      stores(
        <SemioticVACPBridge
          appId="replaced-app"
          charts={charts}
          globalKey={replacedKey}
        />
      )
    )
    const foreignBridge = { owner: "later-installation" }
    globalRecord[replacedKey] = foreignBridge
    replacedView.unmount()
    expect(globalRecord[replacedKey]).toBe(foreignBridge)
  })

  it("reflects live props across rerenders without replacing the bridge", async () => {
    const globalKey = makeGlobalKey("rerender")
    const firstCharts = charts
    const secondCharts: readonly SemioticVACPChart[] = [
      {
        ...charts[0],
        chartId: "chart-b",
        title: "Chart B",
      },
    ]

    const view = render(
      stores(
        <SemioticVACPBridge
          appId="live-app"
          title="Before"
          charts={firstCharts}
          dataAccess={{ sample: false }}
          globalKey={globalKey}
          now={() => "2020-01-01T00:00:00.000Z"}
        />
      )
    )
    const bridge = installedBridge(globalKey)

    view.rerender(
      stores(
        <SemioticVACPBridge
          appId="live-app"
          title="After"
          charts={secondCharts}
          dataAccess={{ sample: true }}
          globalKey={globalKey}
          now={() => "2021-01-01T00:00:00.000Z"}
        />
      )
    )

    expect(globalRecord[globalKey]).toBe(bridge)
    const capabilities = await bridge.getCapabilities()
    expect(capabilities.createdAt).toBe("2021-01-01T00:00:00.000Z")
    expect(
      capabilities.graph.nodes.find((node) => node.ref === bridge.refs.app)
        ?.title
    ).toBe("After")
    expect(
      capabilities.graph.nodes.some(
        (node) => node.ref === bridge.refs.visualization("chart-a")
      )
    ).toBe(false)
    expect(
      capabilities.graph.nodes.some(
        (node) => node.ref === bridge.refs.visualization("chart-b")
      )
    ).toBe(true)
    expect(
      capabilities.graph.actions.some(
        (action) => action.name === SEMIOTIC_VACP_INSPECT_DATA_ACTION
      )
    ).toBe(true)
  })

  it("is import-safe and renders no markup or global during SSR", () => {
    const globalKey = makeGlobalKey("ssr")
    expect(typeof SemioticVACPBridge).toBe("function")

    const markup = renderToStaticMarkup(
      stores(
        <SemioticVACPBridge
          appId="ssr-app"
          charts={charts}
          globalKey={globalKey}
        />
      )
    )

    expect(markup).toBe("")
    expect(globalRecord[globalKey]).toBeUndefined()
  })
})
