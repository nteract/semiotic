import { expect, test } from "@playwright/test"

test("Chart Clinic preserves renderer warnings on successful inspection", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/server/chart-clinic", { waitUntil: "domcontentloaded" })
  await expect(
    page.getByText("Inspectable and rendered", { exact: true })
  ).toBeVisible()
  await page.getByLabel("Chart config JSON", { exact: true }).fill(
    JSON.stringify({
      component: "BarChart",
      props: {
        data: [{ category: "A", value: 10 }],
        categoryAccessor: "category",
        valueAccessor: "value",
        title: "Measured values",
        description: "Category A has a value of ten.",
        annotations: [
          { type: "unavailable-clinic-annotation", label: "Unrendered" }
        ]
      }
    })
  )
  await expect(
    page.getByText("Inspectable and rendered", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("UNRENDERED_ANNOTATIONS", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("No blocking reasons.", { exact: true })
  ).toBeVisible()
  await page.getByLabel("Chart config JSON", { exact: true }).fill(
    JSON.stringify({
      component: "UnknownChart",
      props: {}
    })
  )
  await expect(page.getByText("Needs attention", { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
