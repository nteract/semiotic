export function extractRoutesFromSource(source: string): string[]

export function copyDocsApiAssets(publicApiDir?: string, buildDir?: string): string[]

export function copyBlogOgCards(publicOgDir?: string, buildDir?: string): string[]

export interface BlogEntryMeta {
  slug: string
  title: string
  subtitle?: string
  excerpt?: string
  author: string
  date: string
  tags?: string[]
}

export function generatePage(
  shellHtml: string,
  routePath: string,
  blogMeta?: BlogEntryMeta | null
): string

export function prerender(): Promise<void>
