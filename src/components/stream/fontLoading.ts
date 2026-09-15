/** Empty native load events (including Firefox's initial event) change no metrics. */
export function hasLoadedFontFaces(event: Event): boolean {
  // Preserve notifications from synthetic/legacy events without a face list.
  return (event as Partial<FontFaceSetLoadEvent>).fontfaces?.length !== 0
}

/** Repaint canvas text after an asynchronously loaded web font becomes usable. */
export function subscribeToCanvasFontInvalidation(
  listener: () => void
): () => void {
  const fonts = typeof document === "undefined" ? undefined : document.fonts
  if (!fonts || typeof fonts.addEventListener !== "function") return () => {}
  const onLoaded = (event: Event) => {
    if (hasLoadedFontFaces(event)) listener()
  }
  fonts.addEventListener("loadingdone", onLoaded)
  return () => fonts.removeEventListener("loadingdone", onLoaded)
}
