/**
 * Chart-type → canvas renderer dispatch for StreamXYFrame.
 *
 * Renderers now live on XY plugins (`xyPlugins/`). This module re-exports
 * the lookup so existing imports keep working.
 */
export { getXYCanvasRenderers } from "./xyPlugins/registry"
