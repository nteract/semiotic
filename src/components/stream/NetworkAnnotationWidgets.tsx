"use client"
import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkViewTransform } from "./networkViewportTypes"
import { projectNetworkPoint } from "./networkViewTransform"
import { useNetworkCameraView } from "./useNetworkCamera"
import {
  nodeCenter,
  type NetworkAnnotationAnchorNode
} from "./networkAnnotationAnchors"
import {
  annotationActivationProps,
  type useAnnotationActivationOptions
} from "../charts/shared/annotationActivation"

/** Widget size/offset stay in screen pixels while their world anchor moves. */
export function NetworkAnnotationWidgets({
  annotations,
  sceneNodes,
  viewTransform,
  margin,
  width,
  height,
  activation
}: {
  annotations?: Datum[]
  sceneNodes?: NetworkAnnotationAnchorNode[]
  viewTransform?: NetworkViewTransform
  margin: { left: number; top: number }
  width: number
  height: number
  activation: ReturnType<typeof useAnnotationActivationOptions>
}) {
  const view = useNetworkCameraView(
    viewTransform,
    annotations?.some((a) => a.type === "widget") ?? false
  )
  return (
    <>
      {annotations
        ?.filter(
          (a) =>
            a.type === "widget" &&
            (a.pointId != null || a.nodeId != null) &&
            sceneNodes
        )
        .map((annotation, i) => {
          const isDeferred = annotation._annotationDeferred === true
          const anchorId = annotation.pointId ?? annotation.nodeId
          const node = sceneNodes!.find(
            (n) =>
              n.id === anchorId ||
              n.datum?.id === anchorId ||
              n.datum?.data?.id === anchorId ||
              n.datum?.data?.name === anchorId
          )
          const center = node && nodeCenter(node)
          if (!center) return null
          const anchor = projectNetworkPoint(center, view)
          if (
            viewTransform &&
            (anchor.x < 0 ||
              anchor.y < 0 ||
              anchor.x > width ||
              anchor.y > height)
          )
            return null
          const nx = margin.left + anchor.x
          const ny = margin.top + anchor.y
          const dx = annotation.dx ?? 0
          const dy = annotation.dy ?? -16
          const w = annotation.width ?? 32
          const h = annotation.height ?? 32
          const content = annotation.content ?? (
            <span style={{ fontSize: 18, cursor: "default" }}>{"ℹ️"}</span>
          )
          return (
            <div
              key={`widget-${i}`}
              {...annotationActivationProps(annotation, activation)}
              className={isDeferred ? "annotation-deferred" : undefined}
              data-annotation-disclosure={isDeferred ? "deferred" : undefined}
              style={{
                position: "absolute",
                left: nx + dx - w / 2,
                top: ny + dy - h / 2,
                width: w,
                height: h,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5
              }}
            >
              {content}
            </div>
          )
        })}
    </>
  )
}
