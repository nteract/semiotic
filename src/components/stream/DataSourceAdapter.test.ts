import { afterEach, describe, expect, it, vi } from "vitest"
import { DataSourceAdapter } from "./DataSourceAdapter"

describe("DataSourceAdapter chunk option guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("clamps chunkSize=0 so progressive ingestion always advances", () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length - 1
    })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    const changesets: Array<{ inserts: object[] }> = []
    const adapter = new DataSourceAdapter<object>(
      (changeset) => changesets.push(changeset),
      { chunkThreshold: 0, chunkSize: 0 }
    )

    adapter.setBoundedData([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(changesets[0].inserts).toHaveLength(1)
    frames.shift()?.(0)
    frames.shift()?.(16)
    expect(changesets.map((changeset) => changeset.inserts.length)).toEqual([1, 1, 1])
  })

  it("cancels an in-flight requestAnimationFrame even when its id is zero", () => {
    vi.stubGlobal("requestAnimationFrame", () => 0)
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame)
    const adapter = new DataSourceAdapter<object>(() => {}, {
      chunkThreshold: 0,
      chunkSize: 1,
    })
    adapter.setBoundedData([{ id: 1 }, { id: 2 }])
    adapter.clear()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(0)
  })

  it("treats chunkThreshold=Infinity as an explicit chunking opt-out", () => {
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    const changesets: Array<{ inserts: object[] }> = []
    const adapter = new DataSourceAdapter<object>(
      (changeset) => changesets.push(changeset),
      { chunkThreshold: Infinity, chunkSize: 1 }
    )

    adapter.setBoundedData([{ id: 1 }, { id: 2 }, { id: 3 }])

    expect(changesets.map((changeset) => changeset.inserts.length)).toEqual([3])
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it("treats chunkSize=Infinity as one complete first chunk without a trailing frame", () => {
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    const changesets: Array<{ inserts: object[] }> = []
    const adapter = new DataSourceAdapter<object>(
      (changeset) => changesets.push(changeset),
      { chunkThreshold: 0, chunkSize: Infinity }
    )

    adapter.setReplacementData([{ id: 1 }, { id: 2 }, { id: 3 }])

    expect(changesets.map((changeset) => changeset.inserts.length)).toEqual([3])
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it("restores chunk defaults when controlled options are removed", () => {
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    const changesets: Array<{ inserts: object[] }> = []
    const adapter = new DataSourceAdapter<object>(
      (changeset) => changesets.push(changeset),
      { chunkThreshold: 0, chunkSize: 1 }
    )

    adapter.updateChunkOptions({ chunkThreshold: undefined, chunkSize: undefined })
    adapter.setBoundedData([{ id: 1 }, { id: 2 }, { id: 3 }])

    expect(changesets.map((changeset) => changeset.inserts.length)).toEqual([3])
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
