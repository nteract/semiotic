export const extentValue = extent =>
  (extent && extent.extent) || (Array.isArray(extent) && extent) || []
