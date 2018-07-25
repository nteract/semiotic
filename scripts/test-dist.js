const puppeteer = require("puppeteer")

const path = require("path")

// Make sure that the async/await code below makes node crash
process.on("unhandledRejection", up => {
  throw up
})

// NOTE: Since the prettier config is using no-semicolons and this is an IIFE,
//       we are forced to have a semicolon to start this block.
;(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  })
  const page = await browser.newPage()

  page.setViewport({
    width: 800,
    height: 1000
  })

  page.on("pageerror", err => {
    console.log(`Page error: ${err.toString()}`)
    process.exit(1)
  })

  page.on("error", err => {
    console.log(`Error during puppeteer instrumentation: ${err.toString()}`)
    process.exit(2)
  })

  await page.goto(
    `file:${path.join(
      __dirname,
      "..",
      "integration-tests",
      "viz-examples",
      "index.html"
    )}`,
    { waitUntil: "domcontentloaded" }
  )

  const SemioticInterface = await page.evaluate(() =>
    Promise.resolve(Object.keys(window.Semiotic))
  )

  if (
    SemioticInterface.includes("default") &&
    SemioticInterface.includes("XYFrame")
  ) {
    // We good, or so we hope
  } else {
    throw new Error("Semiotic did not load from the dist copy")
  }

  await page.screenshot({ path: "screenshots/viz-examples.png" })

  await browser.close()
})()
