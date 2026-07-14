/**
 * Whether the network paint loop needs another animation frame.
 *
 * Particles are continuous only for sankey and custom layouts; pulse and
 * pipeline animations apply to every chart type.
 */
export function shouldContinueNetworkAnimation(
  chartType: string,
  hasCustomNetworkLayout: boolean,
  showParticles: boolean,
  hasPulse: boolean,
  isStoreAnimating: boolean
): boolean {
  return (
    ((chartType === "sankey" || hasCustomNetworkLayout) && showParticles) ||
    hasPulse ||
    isStoreAnimating
  )
}
