import "../../../test-utils/registerBuiltInXYPlugins"
import { describe, expect, it } from "vitest"
import { PipelineStore } from "../../stream/PipelineStore"
import { OrdinalPipelineStore } from "../../stream/OrdinalPipelineStore"
import { syncPushBuffer, type SyncedPushHandle } from "./useSyncedPushData"
import type { Datum } from "./datumTypes"

function stores() {
  const common = {
    windowSize: 100,
    windowMode: "sliding" as const,
    extentPadding: 0
  }
  return [
    new PipelineStore({
      ...common,
      chartType: "scatter",
      arrowOfTime: "right",
      xAccessor: "x",
      yAccessor: "value",
      pointIdAccessor: "id"
    }),
    new OrdinalPipelineStore({
      ...common,
      chartType: "bar",
      projection: "vertical",
      categoryAccessor: "category",
      valueAccessor: "value",
      dataIdAccessor: "id"
    })
  ]
}

describe("synchronized push data through chart stores", () => {
  it.each([0, 1])(
    "preserves positional and duplicate rows through store %s",
    (index) => {
      const store = stores()[index]
      const handle: SyncedPushHandle = {
        clear: () => store.clear(),
      pushMany: (inserts) => store.ingest({ inserts, bounded: false }),
        update: (id, updater) => store.update(id, updater),
        remove: (id) => store.remove(id)
      }
      const a = { id: "a", x: 1, category: "A", value: 1 }
      const b = { id: "b", x: 2, category: "B", value: 2 }
      const duplicate = { ...a, value: 3 }
      let map = new Map<string, Datum>()
      for (const rows of [[a, b], [b, a], [a], []]) {
        map = syncPushBuffer(handle, map, rows, null)
        expect(store.getData()).toEqual(rows)
      }
      for (const rows of [[a, duplicate, b], [duplicate, b], [b]]) {
        map = syncPushBuffer(handle, map, rows, (row) => String(row.id))
        expect(store.getData()).toEqual(rows)
      }
    }
  )
})
