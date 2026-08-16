"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import type { AccessibleTablePortalTarget } from "./accessibleTableTypes"

function resolveTarget(target: AccessibleTablePortalTarget): Element | null {
  if (typeof target === "string") return document.getElementById(target)
  return typeof target === "function" ? target() : target
}

export default function AccessibleTablePortalImpl({
  target: requestedTarget,
  children
}: {
  target: AccessibleTablePortalTarget
  children: React.ReactNode
}) {
  const [resolution, setResolution] = React.useState<{
    requestedTarget: AccessibleTablePortalTarget
    resolved: boolean
    target: Element | null
  }>({ requestedTarget, resolved: false, target: null })

  React.useEffect(() => {
    const target = resolveTarget(requestedTarget)
    if (process.env.NODE_ENV !== "production" && target == null && typeof requestedTarget === "string") {
      console.warn(
        `[Semiotic] accessibleTable portal target "${requestedTarget}" was not found. ` +
          "Rendering the data-summary controls inline instead."
      )
    }
    setResolution({ requestedTarget, resolved: true, target })
  }, [requestedTarget])

  if (resolution.requestedTarget !== requestedTarget || !resolution.resolved) return null
  return resolution.target ? createPortal(children, resolution.target) : <>{children}</>
}
