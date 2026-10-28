"use client"

import { useImperativeHandle, type Ref } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import {
  useStreamingDataHandle,
  type StreamingHandleOptions
} from "./useStreamingDataHandle"

export function useOrdinalFrameHandle(
  ref: Ref<StreamOrdinalFrameHandle>,
  options: StreamingHandleOptions<OrdinalPipelineStore>
) {
  const dataHandle = useStreamingDataHandle(options)
  const { adapterRef } = options
  useImperativeHandle(
    ref,
    () => ({
      ...dataHandle,
      // Replacement preserves category order and transition history while
      // atomically discarding queued pushes/chunks from the previous snapshot.
      replace: (data: Datum[]) => adapterRef.current?.setReplacementData(data)
    }),
    [dataHandle, adapterRef]
  )
}
