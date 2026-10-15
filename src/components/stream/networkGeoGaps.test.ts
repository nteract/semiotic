import { describe, expect, it } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import {
  buildNavGraph,
  extractNetworkNavPoints,
  nextNetworkIndex,
  resolvePosition
} from "./keyboardNav"
import { extractAllRows } from "./AccessibleDataTable"
import type { NetworkSceneNode } from "./networkTypes"
import type { PointSceneNode } from "./types"

const pointNodes = (store: GeoPipelineStore) =>
  store.scene.filter((node): node is PointSceneNode => node.type === "point")

describe("remaining network and geographic regressions", () => {
  it("aligns streaming pulse and decay with source rows omitted by projection", () => {
    let now = 0
    const store = new GeoPipelineStore({
      projection: "mercator",
      clock: () => now,
      pulse: { duration: 1000 },
      decay: { type: "linear", minOpacity: 0.1 }
    })
    store.initStreaming(10)
    store.pushPoint({ id: "old", lon: 0, lat: 0 })
    now = 500
    store.pushPoint({ id: "invalid", lon: NaN, lat: 0 })
    now = 1000
    store.pushPoint({ id: "new", lon: 5, lat: 5 })
    store.computeScene({ width: 600, height: 400 })
    const [old, newest] = pointNodes(store)
    expect(old.datum?.id).toBe("old")
    expect(newest.datum?.id).toBe("new")
    expect(old._pulseIntensity).toBe(0)
    expect(newest._pulseIntensity).toBe(1)
    expect(newest._decayOpacity).toBe(1)
    expect(old._decayOpacity).toBeLessThan(1)
  })

  it.each(["linear", "ease-out"] as const)(
    "honors %s transition easing",
    (easing) => {
      let now = 0
      const store = new GeoPipelineStore({
        projection: "mercator",
        clock: () => now,
        pointIdAccessor: "id",
        introAnimation: false,
        transition: { duration: 1000, easing }
      })
      store.setPoints([{ id: "old", lon: 0, lat: 0 }])
      store.computeScene({ width: 600, height: 400 })
      store.setPoints([
        { id: "old", lon: 0, lat: 0 },
        { id: "enter", lon: 5, lat: 5 }
      ])
      store.computeScene({ width: 600, height: 400 })
      const targetOpacity = pointNodes(store)[1]._targetOpacity!
      now = 500
      store.advanceTransition(now)
      expect(pointNodes(store)[1].style.opacity).toBeCloseTo(
        targetOpacity * (easing === "linear" ? 0.5 : 0.875)
      )
    }
  )

  it("renders a finite centered singleton geographic point", () => {
    const store = new GeoPipelineStore({ projection: "mercator" })
    store.setPoints([{ lon: 0, lat: 0 }])
    store.computeScene({ width: 600, height: 400 })
    const point = pointNodes(store)[0]
    expect(point).toBeDefined()
    expect(point.x).toBeCloseTo(300)
    expect(point.y).toBeCloseTo(200)
    expect(Number.isFinite(store.scales!.projection.scale())).toBe(true)
  })

  it("follows multiple connected hops without bouncing on the incoming edge", () => {
    const scene: NetworkSceneNode[] = ["A", "B", "C", "D"].map((id, i) => ({
      type: "circle",
      cx: i * 10,
      cy: 0,
      r: 2,
      style: {},
      datum: { id }
    }))
    const edges = [
      { source: "A", target: "B" },
      { source: "A", target: "B" },
      { source: "B", target: "C" },
      { source: "C", target: "D" }
    ]
    const graph = buildNavGraph(extractNetworkNavPoints(scene))
    const neighbor = { current: -1 }
    let index = 0
    const visited = [graph.flat[index].datum!.id]
    for (let hop = 0; hop < 3; hop++) {
      index = nextNetworkIndex(
        "Enter",
        resolvePosition(graph, index),
        graph,
        edges,
        neighbor
      )!
      visited.push(graph.flat[index].datum!.id)
    }
    expect(visited).toEqual(["A", "B", "C", "D"])
  })

  it("retains original geographic properties and point fields in accessible rows", () => {
    const store = new GeoPipelineStore({ projection: "mercator" })
    store.setAreas([
      {
        type: "Feature",
        properties: { name: "Study region", population: 1234 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 10],
              [10, 10],
              [10, 0],
              [0, 0]
            ]
          ]
        }
      }
    ])
    store.setPoints([{ name: "Study site", lon: 5, lat: 5, sampled: 42 }])
    store.computeScene({ width: 600, height: 400 })
    const rows = extractAllRows(store.scene)
    expect(
      rows.some(
        (row) =>
          row.values.name === "Study region" && row.values.population === 1234
      )
    ).toBe(true)
    expect(
      rows.some(
        (row) => row.values.name === "Study site" && row.values.sampled === 42
      )
    ).toBe(true)
  })
})
