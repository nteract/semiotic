import React, { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/** Accessible modal drawer mechanics, intentionally independent of styling. */
export default function DrawerDialog({
  open,
  onClose,
  labelledBy,
  className,
  backdropClassName,
  initialFocusRef,
  children,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const frame = window.requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ??
        dialogRef.current?.querySelector(FOCUSABLE_SELECTOR) ??
        dialogRef.current
      target?.focus?.()
    })
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== "Tab") return
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])]
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      const active = document.activeElement
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [initialFocusRef, open])

  if (!open) return null
  return (
    <>
      <button
        type="button"
        className={backdropClassName}
        tabIndex="-1"
        aria-label="Close dialog"
        onClick={() => onCloseRef.current?.()}
      />
      <div
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  )
}
