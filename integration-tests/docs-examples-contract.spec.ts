import { writeFile } from "node:fs/promises"
import { expect, test, type Page } from "@playwright/test"
import { EXAMPLE_DEFINITIONS } from "../docs/src/pages/examples/exampleDefinitions.js"

const EVIDENCE_SCHEMA_VERSION = 2
const VIEWPORTS = [
  { width: 320, height: 900 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 }
]

type ExampleDefinition = {
  id?: string
  slug?: string
  path?: string
  route?: string
  href?: string
  title?: string
  name?: string
  contract?: { assessment?: string }
}

type ViewportEvidence = {
  viewport: { width: number; height: number }
  documentClientWidth: number
  documentScrollWidth: number
  horizontalOverflow: boolean
  h1Visible: boolean
  mainVisible: boolean
}

type MotionVisibilityEvidence = {
  reducedMotion: {
    mediaQueryMatches: boolean
    h1Visible: boolean
    mainVisible: boolean
  }
  visibility: {
    initialState: string
    observedStates: string[]
    hiddenTransitionObserved: boolean
    restoredVisible: boolean
    h1VisibleAfterRestore: boolean
    mainVisibleAfterRestore: boolean
  }
}

type LocalContractEvidence = {
  id: string
  route: string
  title: string | null
  declaredAssessment: string | null
  semantic: {
    documentLanguage: string | null
    h1Count: number
    headingCount: number
    mainLandmarkCount: number
    navigationLandmarkCount: number
  }
  viewports: ViewportEvidence[]
  motionVisibility: MotionVisibilityEvidence
}

type LocalEvidenceArtifact = {
  kind: "semiotic-docs-example-local-contract-evidence"
  schemaVersion: number
  capturedAt: string
  environment: {
    browser: "local-chromium"
    network: "local-origin-only"
    scope: string[]
    exclusions: string[]
  }
  examples: LocalContractEvidence[]
}

function exampleDefinitionList(definitions: unknown): ExampleDefinition[] {
  if (Array.isArray(definitions)) return definitions as ExampleDefinition[]
  if (definitions instanceof Map) return Array.from(definitions.values()) as ExampleDefinition[]
  if (definitions && typeof definitions === "object") {
    return Object.values(definitions) as ExampleDefinition[]
  }
  throw new Error("EXAMPLE_DEFINITIONS must be an array, map, or object")
}

function routeForDefinition(definition: ExampleDefinition): string {
  const route = [definition.path, definition.route, definition.href].find(
    (value): value is string => typeof value === "string" && value.length > 0
  )

  if (!route) throw new Error(`Example definition is missing a route: ${JSON.stringify(definition)}`)
  return route.startsWith("/") ? route : `/${route}`
}

function idForDefinition(definition: ExampleDefinition, route: string): string {
  const id = definition.id || definition.slug || definition.title || definition.name || route
  return String(id)
}

async function settleDocument(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  )
}

async function captureReducedMotionEvidence(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element | null) => {
      if (!element) return false
      const styles = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0
    }

    return {
      mediaQueryMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      h1Visible: isVisible(document.querySelector("h1")),
      mainVisible: isVisible(document.querySelector("main, [role=main]"))
    }
  })
}

async function captureVisibilityEvidence(page: Page, visibilityProbe: Page) {
  await page.evaluate(() => {
    type VisibilityObserver = {
      initialState: string
      states: string[]
      listener: () => void
    }
    const observedWindow = window as Window & {
      __semioticDocsExampleVisibilityObserver?: VisibilityObserver
    }
    const existingObserver = observedWindow.__semioticDocsExampleVisibilityObserver
    if (existingObserver) {
      document.removeEventListener("visibilitychange", existingObserver.listener)
    }

    const observer: VisibilityObserver = {
      initialState: document.visibilityState,
      states: [],
      listener: () => undefined
    }
    observer.listener = () => observer.states.push(document.visibilityState)
    document.addEventListener("visibilitychange", observer.listener)
    observedWindow.__semioticDocsExampleVisibilityObserver = observer
  })

  await visibilityProbe.bringToFront()
  await page
    .waitForFunction(
      () => {
        const observedWindow = window as Window & {
          __semioticDocsExampleVisibilityObserver?: { states: string[] }
        }
        return observedWindow.__semioticDocsExampleVisibilityObserver?.states.includes("hidden")
      },
      undefined,
      { polling: 50, timeout: 500 }
    )
    .catch(() => undefined)

  await page.bringToFront()
  const restoredVisible = await page
    .waitForFunction(() => document.visibilityState === "visible", undefined, {
      polling: 50,
      timeout: 500
    })
    .then(() => true)
    .catch(() => false)

  if (restoredVisible) await settleDocument(page)

  return page.evaluate(() => {
    type VisibilityObserver = {
      initialState: string
      states: string[]
      listener: () => void
    }
    const observedWindow = window as Window & {
      __semioticDocsExampleVisibilityObserver?: VisibilityObserver
    }
    const observer = observedWindow.__semioticDocsExampleVisibilityObserver
    if (observer) {
      document.removeEventListener("visibilitychange", observer.listener)
      delete observedWindow.__semioticDocsExampleVisibilityObserver
    }

    const isVisible = (element: Element | null) => {
      if (!element) return false
      const styles = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0
    }
    const observedStates = observer?.states ?? []

    return {
      initialState: observer?.initialState ?? document.visibilityState,
      observedStates,
      hiddenTransitionObserved: observedStates.includes("hidden"),
      restoredVisible: document.visibilityState === "visible",
      h1VisibleAfterRestore: isVisible(document.querySelector("h1")),
      mainVisibleAfterRestore: isVisible(document.querySelector("main, [role=main]"))
    }
  })
}

function validateEvidenceArtifact(artifact: LocalEvidenceArtifact, expectedRoutes: string[]) {
  const errors: string[] = []

  if (artifact.kind !== "semiotic-docs-example-local-contract-evidence") {
    errors.push("artifact kind is invalid")
  }
  if (artifact.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    errors.push(`expected schema version ${EVIDENCE_SCHEMA_VERSION}`)
  }
  if (artifact.examples.length !== expectedRoutes.length) {
    errors.push(`expected ${expectedRoutes.length} examples, received ${artifact.examples.length}`)
  }

  const seenRoutes = new Set<string>()
  for (const example of artifact.examples) {
    if (!example.id) errors.push("example is missing an id")
    if (!example.route) errors.push("example is missing a route")
    if (seenRoutes.has(example.route)) errors.push(`duplicate route evidence for ${example.route}`)
    seenRoutes.add(example.route)

    if (!Number.isInteger(example.semantic.h1Count) || example.semantic.h1Count < 1) {
      errors.push(`${example.route} has no h1 evidence`)
    }
    if (example.viewports.length !== VIEWPORTS.length) {
      errors.push(`${example.route} has incomplete viewport evidence`)
    }

    for (const viewport of example.viewports) {
      if (viewport.documentScrollWidth < viewport.documentClientWidth) {
        errors.push(`${example.route} reported an invalid document width at ${viewport.viewport.width}px`)
      }
      if (typeof viewport.h1Visible !== "boolean" || typeof viewport.mainVisible !== "boolean") {
        errors.push(`${example.route} has invalid visibility evidence at ${viewport.viewport.width}px`)
      }
    }

    const { reducedMotion, visibility } = example.motionVisibility
    if (!reducedMotion.mediaQueryMatches) {
      errors.push(`${example.route} did not receive the reduced-motion media environment`)
    }
    if (!reducedMotion.h1Visible || !reducedMotion.mainVisible) {
      errors.push(`${example.route} lost its semantic surface under reduced motion`)
    }
    if (!visibility.initialState) {
      errors.push(`${example.route} is missing an initial visibility state`)
    }
    if (!visibility.observedStates.every((state) => typeof state === "string")) {
      errors.push(`${example.route} has invalid visibility transition evidence`)
    }
    if (typeof visibility.hiddenTransitionObserved !== "boolean" || typeof visibility.restoredVisible !== "boolean") {
      errors.push(`${example.route} has invalid visibility restoration evidence`)
    }
    if (!visibility.h1VisibleAfterRestore || !visibility.mainVisibleAfterRestore) {
      errors.push(`${example.route} lost its semantic surface after the visibility probe`)
    }
  }

  for (const route of expectedRoutes) {
    if (!seenRoutes.has(route)) errors.push(`missing route evidence for ${route}`)
  }

  if (errors.length) throw new Error(`Invalid local example evidence artifact:\n${errors.join("\n")}`)
}

test.describe("docs example local contract evidence", () => {
  test("keeps Merge Pressure stable across reduced-motion and visibility transitions", async ({ page }) => {
    const reactUpdateErrors: string[] = []
    const captureReactUpdateError = (message: string) => {
      if (/maximum update depth exceeded/i.test(message)) {
        reactUpdateErrors.push(message)
      }
    }
    page.on("console", (message) => captureReactUpdateError(message.text()))
    page.on("pageerror", (error) => captureReactUpdateError(error.message))

    const visibilityProbe = await page.context().newPage()
    try {
      await page.emulateMedia({ reducedMotion: "no-preference" })
      await page.bringToFront()
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto("/examples/merge-pressure", { waitUntil: "domcontentloaded" })
      await expect(page.locator("h1").first()).toBeVisible()
      await settleDocument(page)

      await page.emulateMedia({ reducedMotion: "reduce" })
      await settleDocument(page)
      await captureVisibilityEvidence(page, visibilityProbe)
      await settleDocument(page)

      expect(reactUpdateErrors).toEqual([])
    } finally {
      await visibilityProbe.close()
    }
  })

  test("captures manifest-driven semantic and viewport evidence", async ({ page }, testInfo) => {
    const definitions = exampleDefinitionList(EXAMPLE_DEFINITIONS)
    const configuredBaseURL = testInfo.project.use.baseURL
    if (typeof configuredBaseURL !== "string") {
      throw new Error("The docs example contract suite requires a configured baseURL")
    }

    const localOrigin = new URL(configuredBaseURL).origin
    await page.route("**/*", async (route) => {
      const requestURL = new URL(route.request().url())
      if (requestURL.protocol === "data:" || requestURL.origin === localOrigin) {
        await route.continue()
        return
      }
      await route.abort("blockedbyclient")
    })

    const examples: LocalContractEvidence[] = []
    const visibilityProbe = await page.context().newPage()
    try {
      for (const definition of definitions) {
        const route = routeForDefinition(definition)
        await page.emulateMedia({ reducedMotion: "no-preference" })
        await page.bringToFront()
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(route, { waitUntil: "domcontentloaded" })

        const h1 = page.locator("h1").first()
        await expect(h1).toBeVisible()
        await settleDocument(page)

        const semantic = await page.evaluate(() => ({
          documentLanguage: document.documentElement.lang || null,
          h1Count: document.querySelectorAll("h1").length,
          headingCount: document.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
          mainLandmarkCount: document.querySelectorAll("main, [role=main]").length,
          navigationLandmarkCount: document.querySelectorAll("nav, [role=navigation]").length
        }))

        const viewports: ViewportEvidence[] = []
        for (const viewport of VIEWPORTS) {
          await page.setViewportSize(viewport)
          await settleDocument(page)
          viewports.push(
            await page.evaluate((currentViewport) => {
              const isVisible = (element: Element | null) => {
                if (!element) return false
                const styles = window.getComputedStyle(element)
                const rect = element.getBoundingClientRect()
                return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0
              }
              const root = document.documentElement
              return {
                viewport: currentViewport,
                documentClientWidth: root.clientWidth,
                documentScrollWidth: root.scrollWidth,
                horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
                h1Visible: isVisible(document.querySelector("h1")),
                mainVisible: isVisible(document.querySelector("main, [role=main]"))
              }
            }, viewport)
          )
        }

        await page.emulateMedia({ reducedMotion: "reduce" })
        await settleDocument(page)
        const motionVisibility: MotionVisibilityEvidence = {
          reducedMotion: await captureReducedMotionEvidence(page),
          visibility: await captureVisibilityEvidence(page, visibilityProbe)
        }

        examples.push({
          id: idForDefinition(definition, route),
          route,
          title: definition.title || definition.name || null,
          declaredAssessment: definition.contract?.assessment || null,
          semantic,
          viewports,
          motionVisibility
        })
      }
    } finally {
      await visibilityProbe.close()
    }

    const artifact: LocalEvidenceArtifact = {
      kind: "semiotic-docs-example-local-contract-evidence",
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      capturedAt: new Date().toISOString(),
      environment: {
        browser: "local-chromium",
        network: "local-origin-only",
        scope: [
          "Local route loading, DOM landmark counts, heading counts, and viewport geometry.",
          "External network requests are blocked for this capture.",
          "Each route is loaded with reduced-motion emulation and must retain its semantic surface.",
          "A local Chromium probe tab attempts a background/foreground transition for each route; emitted visibility states and semantic continuity after restoration are recorded."
        ],
        exclusions: [
          "This artifact does not establish SSR behavior.",
          "This artifact does not establish performance, deployment, or cross-browser behavior.",
          "This artifact does not establish full accessibility equivalence.",
          "This artifact does not establish policy-specific animation suppression or pause/resume behavior when a route exposes no observable signal."
        ]
      },
      examples
    }

    validateEvidenceArtifact(artifact, definitions.map(routeForDefinition))

    const artifactPath = testInfo.outputPath("docs-example-local-contract-evidence.v2.json")
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    await testInfo.attach("docs-example-local-contract-evidence.v2.json", {
      path: artifactPath,
      contentType: "application/json"
    })
  })
})
