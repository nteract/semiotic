/** Convert viewport coordinates to the canvas's logical CSS-pixel coordinates. */
export function physicsCanvasCoordinates(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  // CSS scaling changes the bounding rect, while the backing bitmap also
  // includes devicePixelRatio. Use the untransformed CSS size, not the bitmap.
  const scaleX =
    rect.width > 0 && canvas.clientWidth > 0
      ? canvas.clientWidth / rect.width
      : 1
  const scaleY =
    rect.height > 0 && canvas.clientHeight > 0
      ? canvas.clientHeight / rect.height
      : 1
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}
