import React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getRoom } from "../roomRegistry"
import ExecutiveSuiteRoom from "./ExecutiveSuiteRoom"
import MapRoom from "./MapRoom"
import RecordsCatacombsRoom from "./RecordsCatacombsRoom"
import ServerCathedralRoom from "./ServerCathedralRoom"

const frames = vi.hoisted(() => ({
  geo: null,
  network: null,
  ordinal: null,
  xy: null,
}))

vi.mock("semiotic/geo", () => ({
  StreamGeoFrame: (props) => {
    frames.geo = props
    return null
  },
}))

vi.mock("semiotic/network", () => ({
  StreamNetworkFrame: (props) => {
    frames.network = props
    return null
  },
}))

vi.mock("semiotic/ordinal", () => ({
  StreamOrdinalFrame: (props) => {
    frames.ordinal = props
    return null
  },
}))

vi.mock("semiotic/rough", () => ({
  createRoughRenderMode: () => null,
}))

vi.mock("semiotic/xy", () => ({
  StreamXYFrame: (props) => {
    frames.xy = props
    return null
  },
}))

vi.mock("../components/AnalyticalRoom", () => ({
  default: ({ onInspect, onActivateAnnotation, renderChart }) =>
    renderChart({
      annotations: [],
      onInspect,
      onObservation: vi.fn(),
      onAnnotationActivate: onActivateAnnotation,
    }),
}))

function roomProps(roomId, onInspect) {
  return {
    room: getRoom(roomId),
    state: {
      activatedAnnotationIds: [],
      currentRoomId: roomId,
      flags: {},
    },
    width: 640,
    reducedMotion: false,
    hintRequestToken: 0,
    hintsRemaining: true,
    onHintUsed: vi.fn(),
    onInspect,
    onAnalyticsReady: vi.fn(),
    onActivateAnnotation: vi.fn(),
  }
}

const CASES = [
  {
    Room: ExecutiveSuiteRoom,
    chartId: "analyst-adventure-executive-suite",
    frame: "xy",
    datum: { id: "badge-roof-0914" },
    roomId: "executive-suite",
  },
  {
    Room: RecordsCatacombsRoom,
    chartId: "analyst-adventure-records-catacombs",
    frame: "ordinal",
    datum: { id: "corporate-archaeology" },
    roomId: "records-catacombs",
  },
  {
    Room: MapRoom,
    chartId: "analyst-adventure-map-room",
    frame: "geo",
    datum: { id: "b2-to-hq" },
    roomId: "map-room",
  },
  {
    Room: ServerCathedralRoom,
    chartId: "analyst-adventure-server-cathedral",
    frame: "network",
    datum: { id: "daemon-projector" },
    roomId: "server-cathedral",
  },
]

describe("Analyst Adventure room interaction provenance", () => {
  beforeEach(() => {
    Object.keys(frames).forEach((key) => {
      frames[key] = null
    })
  })

  it.each(CASES)(
    "forwards the Stream Frame input type in $roomId",
    ({ Room, chartId, datum, frame, roomId }) => {
      const onInspect = vi.fn()
      render(<Room {...roomProps(roomId, onInspect)} />)

      const chart = frames[frame]
      expect(chart).toEqual(expect.objectContaining({ customHoverBehavior: expect.any(Function) }))
      expect(chart.chartId).toBe(chartId)
      chart.customHoverBehavior({ data: datum }, { type: "focus", inputType: "keyboard" })
      chart.customClickBehavior({ data: datum }, { type: "activate", inputType: "touch" })

      expect(onInspect).toHaveBeenNthCalledWith(1, datum.id, "keyboard")
      expect(onInspect).toHaveBeenNthCalledWith(2, datum.id, "touch")
    },
  )
})
