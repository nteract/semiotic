export const extentValue = (extent: any) =>
  (extent && extent.extent) || (Array.isArray(extent) && extent) || []
