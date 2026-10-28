"use client"

import { useImperativeHandle, type Ref } from "react"
import type { PipelineStore } from "./PipelineStore"
import type { StreamXYFrameHandle } from "./types"
import {
  useStreamingDataHandle,
  type StreamingHandleOptions
} from "./useStreamingDataHandle"

export function useXYFrameHandle(
  ref: Ref<StreamXYFrameHandle>,
  options: StreamingHandleOptions<PipelineStore>
) {
  const dataHandle = useStreamingDataHandle(options)
  const { storeRef } = options
  useImperativeHandle(
    ref,
    () => ({
      ...dataHandle,
      getExtents: () => storeRef.current?.getExtents() ?? null
    }),
    [dataHandle, storeRef]
  )
}
