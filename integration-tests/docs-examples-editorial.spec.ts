import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { EXAMPLES } from "../docs/src/pages/examples/examplesManifest.js"
import { blogEntriesMeta } from "../docs/src/blog/entries-meta.js"

for (const width of [1280, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`gallery keeps every caption inside its card at ${width}px in ${theme}`, async ({
      page
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(
        (value) => localStorage.setItem("semiotic-theme", value),
        theme
      )
      await page.goto("/examples")
      const cards = page.locator("a.examples-card")
      await expect(cards).toHaveCount(EXAMPLES.length)
      await page.evaluate(() => document.fonts.ready)
      const readings = await cards.evaluateAll((links) =>
        links.map((link) => {
          const card = link.getBoundingClientRect()
          const preview = link
            .querySelector(".examples-card-preview")!
            .getBoundingClientRect()
          const heading = link.querySelector("h2")!
          const caption = heading.nextElementSibling!
          const titleBounds = heading.getBoundingClientRect()
          const captionBounds = caption.getBoundingClientRect()
          return {
            path: link.getAttribute("href"),
            title: heading.textContent,
            caption: caption.textContent,
            textBelowPreview: titleBounds.top >= preview.bottom,
            captionInsideCard:
              captionBounds.bottom <= card.bottom &&
              captionBounds.right <= card.right,
            cardInsidePage:
              card.left >= 0 &&
              card.right <= document.documentElement.clientWidth
          }
        })
      )
      expect(readings).toEqual(
        EXAMPLES.map((example) => ({
          path: example.path,
          title: example.title,
          caption: example.description,
          textBelowPreview: true,
          captionInsideCard: true,
          cardInsidePage: true
        }))
      )
      for (const slug of ["jobs-report", "superpersuasion"]) {
        const card = page.locator(`a.examples-card[href="/examples/${slug}"]`)
        await card.scrollIntoViewIfNeeded()
        await expect(card.locator("h2")).toBeInViewport()
        await expect(card.locator("p")).toBeInViewport()
        await card.focus()
        await expect(card).toBeFocused()
        expect(
          await card.evaluate((node) => getComputedStyle(node).outlineStyle)
        ).not.toBe("none")
        await card.screenshot({ path: testInfo.outputPath(`${slug}.png`) })
      }
      const accessibility = await new AxeBuilder({ page })
        .include(".examples-card")
        .analyze()
      expect(accessibility.violations).toEqual([])
    })
  }
}

const reviewedSlugs = [
  "release-3-10-0",
  "release-3-9-0",
  "an-interoperability-layer",
  "notebook-to-production",
  "generation-is-cheap-trust-is-scarce",
  "when-the-pipeline-breaks",
  "navigating-a-chart-you-cant-see",
  "what-a-screen-reader-should-hear"
]

test("public blog archive exposes backdated posts and release bylines", async ({
  page
}, testInfo) => {
  await page.goto("/blog")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Semiotic 3.10.0"
  )
  while (await page.getByRole("button", { name: "Show older posts" }).count()) {
    await page.getByRole("button", { name: "Show older posts" }).click()
  }
  const archive = page.getByRole("region", { name: "Earlier blog posts" })
  await expect(archive.locator("a[href^='/blog/']")).toHaveCount(
    blogEntriesMeta.length - 1
  )
  for (const slug of reviewedSlugs.slice(1)) {
    await expect(archive.locator(`a[href="/blog/${slug}"]`)).toHaveCount(1)
  }
  for (const [slug, date] of [
    ["release-3-9-0", "2026-08-18"],
    ["release-3-10-0", "2026-09-10"]
  ]) {
    await page.goto(`/blog/${slug}`)
    await expect(page.locator("article time")).toHaveAttribute("datetime", date)
    await expect(page.locator("article")).toContainText("Semiotic Team")
    await expect(
      page.getByRole("heading", { name: "Upgrade notes" })
    ).toHaveCount(1)
    await page.screenshot({ path: testInfo.outputPath(`${slug}.png`) })
  }
})

test("published demos explain the reading and preserve keyboard interaction", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 900 })
  for (const slug of reviewedSlugs) {
    const entry = blogEntriesMeta.find((item) => item.slug === slug)!
    await page.goto(`/blog/${slug}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      entry.title
    )
    await expect(page.locator("article time")).toHaveAttribute(
      "datetime",
      entry.date
    )
    await expect(page.locator("article")).not.toContainText(
      "Unlisted — not in the blog index"
    )
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page.evaluate(() => {
      return {
        width: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")]
          .filter(
            (element) =>
              element.getBoundingClientRect().right > window.innerWidth
          )
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName,
            text: element.textContent?.slice(0, 100)
          }))
      }
    })
    expect(
      overflow.width,
      `${slug}: ${JSON.stringify(overflow.elements)}`
    ).toBeLessThanOrEqual(390)
  }
  await page.goto("/blog/notebook-to-production")
  await page.getByRole("button", { name: "Stacked bars", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Stacked bars", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByText("Monthly users by plan", { exact: true }).first()
  ).toHaveCount(1)
  // The screen-reader summary trigger is intentionally outside the visual flow.
  // Activate it from the keyboard, as a reader navigating the chart would.
  const summaryTrigger = page.getByRole("button", { name: /View data summary/ })
  await summaryTrigger.focus()
  await summaryTrigger.press("Enter")
  await expect(page.getByRole("table")).toContainText("Jan")
  await expect(page.getByRole("table")).toContainText("240")

  await page.goto("/blog/generation-is-cheap-trust-is-scarce")
  await page.getByRole("button", { name: "Stacked bar, no stackBy" }).click()
  await expect(page.getByRole("status")).toContainText("blocked")
  await expect(
    page
      .locator("article li")
      .filter({ hasText: /stackBy.*required|required.*stackBy/i })
  ).not.toHaveCount(0)
  await page
    .getByRole("button", { name: "Valid proposal", exact: true })
    .click()
  await expect(page.getByRole("status")).toContainText(
    "render evidence not requested"
  )

  await page.goto("/blog/when-the-pipeline-breaks")
  const annotationToggle = page.getByRole("checkbox")
  await annotationToggle.uncheck()
  await expect(
    page.getByText("Annotations hidden.", { exact: false })
  ).toHaveCount(1)
  await expect(
    page.locator("article li").filter({ hasText: "no single chart coordinate" })
  ).toHaveCount(1)
  await annotationToggle.check()
  await expect(
    page.getByText("2 annotations shown.", { exact: false })
  ).toHaveCount(1)

  await page.goto("/blog/navigating-a-chart-you-cant-see")
  const tree = page.getByRole("tree", {
    name: "Sales by region — navigable structure"
  })
  const first = tree.getByRole("treeitem").first()
  await first.focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowDown")
  await expect(first).not.toBeFocused()
  expect(await tree.ariaSnapshot()).toContain("West")
  expect(errors).toEqual([])
})
