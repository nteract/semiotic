import React, { useEffect, useId, useRef } from "react"

function normalizedMessages(messages) {
  if (messages == null) return []
  return Array.isArray(messages) ? messages : [messages]
}

function ChatMessage({ message }) {
  if (React.isValidElement(message) || typeof message !== "object" || message == null) {
    return <p className="aa-chat__message">{message}</p>
  }

  return (
    <div className={`aa-chat__message aa-chat__message--${message.tone ?? "default"}`}>
      <div className="aa-chat__byline">
        <strong>{message.author ?? message.speaker ?? "UNKNOWN"}</strong>
        {message.time ? <time dateTime={message.dateTime}>{message.time}</time> : null}
      </div>
      <p>{message.text ?? message.body}</p>
    </div>
  )
}

function normalizeAction(action, index) {
  if (typeof action === "string") return { id: `action-${index}`, label: action }
  return action ?? { id: `action-${index}`, label: "Continue" }
}

/**
 * A non-modal native dialog positioned beside an annotation. The close button
 * receives focus when opened and Escape is handled even when the dialog is not
 * promoted to the browser top layer.
 */
export function AnchoredChat({
  open = false,
  title = "Anchored transmission",
  anchorLabel,
  messages = [],
  actions = [],
  onAction,
  onClose,
  placement = "auto",
  className = "",
  style,
}) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const titleId = useId()
  const priorFocus = useRef(null)

  useEffect(() => {
    if (open) {
      priorFocus.current = document.activeElement
      closeRef.current?.focus({ preventScroll: true })
      return undefined
    }

    if (priorFocus.current instanceof HTMLElement && priorFocus.current.isConnected) {
      priorFocus.current.focus({ preventScroll: true })
      priorFocus.current = null
    }
    return undefined
  }, [open])

  const transcript = normalizedMessages(messages)
  const availableActions = Array.isArray(actions) ? actions : []

  return (
    <dialog
      ref={dialogRef}
      open={open}
      className={`aa-chat aa-chat--${placement} ${className}`.trim()}
      style={style}
      aria-labelledby={titleId}
      aria-modal="false"
      onCancel={(event) => {
        event.preventDefault()
        onClose?.("cancel", event)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          onClose?.("escape", event)
        }
      }}
    >
      <header className="aa-chat__header">
        <div>
          <span>{anchorLabel ? `Anchor // ${anchorLabel}` : "Annotation channel"}</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="aa-icon-button"
          onClick={(event) => onClose?.("close", event)}
          aria-label="Close annotation chat"
        >
          ×
        </button>
      </header>

      <div className="aa-chat__transcript" aria-live="polite">
        {transcript.map((message, index) => (
          <ChatMessage
            key={
              message && typeof message === "object" && !React.isValidElement(message)
                ? (message.id ?? index)
                : index
            }
            message={message}
          />
        ))}
      </div>

      {availableActions.length > 0 ? (
        <footer className="aa-chat__actions">
          {availableActions.map((rawAction, index) => {
            const action = normalizeAction(rawAction, index)
            return (
              <button
                key={action.id ?? index}
                type="button"
                className="aa-text-button"
                disabled={action.disabled}
                onClick={(event) => (action.onAction ?? onAction)?.(action, index, event)}
              >
                {action.label}
              </button>
            )
          })}
        </footer>
      ) : null}
    </dialog>
  )
}

export default AnchoredChat
