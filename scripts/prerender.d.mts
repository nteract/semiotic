export function extractRoutesFromSource(source: string): string[]

export function copyDocsApiAssets(publicApiDir?: string, buildDir?: string): string[]

export function copyBlogOgCards(publicOgDir?: string, buildDir?: string): string[]

export function copyExampleOgCards(publicOgDir?: string, buildDir?: string): string[]

export interface ExampleDefinitionMeta {
  path: string
  title?: string
  description?: string
  eyebrow?: string
}

export function loadExampleDefinitions(): Promise<ExampleDefinitionMeta[]>

export function mergeExampleDefinitionRoutes(
  routes?: string[],
  examples?: ExampleDefinitionMeta[]
): string[]

export function registerExampleRouteMeta(
  examples?: ExampleDefinitionMeta[]
): Promise<number>

export interface BlogEntryMeta {
  slug: string
  title: string
  subtitle?: string
  excerpt?: string
  author: string
  date: string
  tags?: string[]
}

export interface MachineReadableRouteDoc {
  route: string
  url: string
  html: string
  text: string
  headings?: Array<{ level: number; text: string }>
  codeBlocks?: string[]
  links?: Array<{ text: string; href: string }>
}

export function generatePage(
  shellHtml: string,
  routePath: string,
  blogMeta?: BlogEntryMeta | null,
  machineDoc?: MachineReadableRouteDoc | null
): string

export function sanitizeRouteHtml(renderedHtml: string, routePath: string): MachineReadableRouteDoc | null

export function prerender(): Promise<void>
