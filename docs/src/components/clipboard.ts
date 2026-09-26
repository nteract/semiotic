/** Legacy copy support belongs to documentation, not published chart bundles. */
export async function copyWithFallback(text: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
    await navigator.clipboard.writeText(text)
  } catch (error) {
    if (typeof document.execCommand !== "function") throw error
    const previous = document.activeElement
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    try {
      textarea.select()
      if (!document.execCommand("copy")) throw new Error("Clipboard copy failed")
    } finally {
      textarea.remove()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }
}
