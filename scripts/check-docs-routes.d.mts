export interface RequiredDocsRoute {
  routePath: string
  title: string
  canonicalUrl: string
}

export interface RequiredApiAsset {
  path: string
  validate: (value: unknown) => boolean
  description: string
}

export interface RequiredMachineReadableRoute {
  routePath: string
  keyword: string
}

export interface DocsBuildValidationOptions {
  buildDir?: string
  routes?: RequiredDocsRoute[]
  apiAssets?: RequiredApiAsset[]
  machineReadableRoutes?: RequiredMachineReadableRoute[]
}

export interface DocsBuildValidationResult {
  ok: boolean
  failures: string[]
}

export const REQUIRED_DOCS_ROUTES: RequiredDocsRoute[]

export const REQUIRED_API_ASSETS: RequiredApiAsset[]

export const REQUIRED_MACHINE_READABLE_ROUTES: RequiredMachineReadableRoute[]

export function routeHtmlPath(buildDir: string, routePath: string): string

export function validateDocsBuild(options?: DocsBuildValidationOptions): DocsBuildValidationResult
