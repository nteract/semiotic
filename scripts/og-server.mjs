#!/usr/bin/env node
/**
 * OG Image HTTP Server — serves chart SVG/PNG from URL query parameters.
 *
 * Usage:
 *   node scripts/og-server.mjs                    # start on port 3001
 *   node scripts/og-server.mjs --port 8080        # custom port
 *
 * Endpoints:
 *   GET /og?component=BarChart&theme=dark&title=Revenue&width=800&height=400
 *   GET /og?component=LineChart&data=[...]&xAccessor=x&yAccessor=y&format=png&scale=2
 *
 * Query parameters:
 *   component  (required) — chart name (BarChart, LineChart, PieChart, etc.)
 *   format     — "svg" (default) or "png" (requires sharp)
 *   scale      — PNG scale factor (default 2 for retina)
 *   width      — chart width (default 1200)
 *   height     — chart height (default 630, standard OG ratio)
 *   theme      — theme preset name
 *   title      — chart title
 *   background — background color
 *   data       — JSON-encoded data array
 *   ...rest    — any other renderChart prop (camelCase)
 *
 * Deploy as:
 *   - Standalone Node.js server
 *   - Vercel serverless function (copy handler to api/og.js)
 *   - Cloudflare Worker (SVG only, no sharp)
 *
 * Examples:
 *   http://localhost:3001/og?component=BarChart&theme=tufte&title=Revenue%20by%20Region
 *   http://localhost:3001/og?component=PieChart&data=[{"category":"A","value":30},{"category":"B","value":70}]&format=png
 */

import { createServer } from "node:http"
import { URL } from "node:url"

// Dynamic import so this script works without building dist first
const { renderChart } = await import("../src/components/server/renderToStaticSVG.js")

const DEFAULT_PORT = 3001
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630 // standard OG image ratio

function parsePort() {
  const idx = process.argv.indexOf("--port")
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10)
  return DEFAULT_PORT
}

/**
 * Parse query parameters into renderChart props.
 * Handles JSON-encoded data, numeric values, and boolean flags.
 */
function parseProps(searchParams) {
  const props = {}

  for (const [key, value] of searchParams) {
    if (key === "component" || key === "format" || key === "scale") continue

    // Try JSON parse for complex values (data arrays, objects)
    if (value.startsWith("[") || value.startsWith("{")) {
      try {
        props[key] = JSON.parse(value)
        continue
      } catch {
        // fall through to string
      }
    }

    // Boolean
    if (value === "true") { props[key] = true; continue }
    if (value === "false") { props[key] = false; continue }

    // Number
    const num = Number(value)
    if (!isNaN(num) && value !== "") { props[key] = num; continue }

    // String
    props[key] = value
  }

  return props
}

async function handleRequest(req, res) {
  // CORS headers for cross-origin embedding
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname !== "/og") {
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end(`
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 40px auto;">
          <h1>Semiotic OG Image Server</h1>
          <p>Generate chart images from URL parameters.</p>
          <h3>Try it:</h3>
          <ul>
            <li><a href="/og?component=BarChart&theme=tufte&title=Revenue">/og?component=BarChart&theme=tufte&title=Revenue</a></li>
            <li><a href="/og?component=PieChart&data=[{%22category%22:%22A%22,%22value%22:30},{%22category%22:%22B%22,%22value%22:70}]">/og?component=PieChart&data=[...]</a></li>
            <li><a href="/og?component=LineChart&theme=dark&format=png">/og?component=LineChart&theme=dark&format=png</a></li>
          </ul>
          <p>See <a href="https://github.com/nteract/semiotic">semiotic docs</a> for all chart types and props.</p>
        </body>
      </html>
    `)
    return
  }

  const params = url.searchParams
  const component = params.get("component")
  const format = params.get("format") || "svg"
  const scale = parseInt(params.get("scale") || "2", 10)

  if (!component) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Missing required query parameter: component" }))
    return
  }

  try {
    const props = parseProps(params)
    props.width = props.width || DEFAULT_WIDTH
    props.height = props.height || DEFAULT_HEIGHT

    // Default data for demo when no data provided
    if (!props.data) {
      props.data = getDefaultData(component)
    }

    const svg = renderChart(component, props)

    if (format === "png") {
      // Dynamic import sharp
      let sharp
      try {
        sharp = (await import("sharp")).default
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "PNG format requires sharp. Install: npm install sharp" }))
        return
      }

      const png = await sharp(Buffer.from(svg))
        .resize(props.width * scale, props.height * scale)
        .png()
        .toBuffer()

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      })
      res.end(png)
    } else {
      res.writeHead(200, {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      })
      res.end(svg)
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: err.message }))
  }
}

/** Provide sample data so the server works without explicit data for demos */
function getDefaultData(component) {
  switch (component) {
    case "BarChart":
    case "StackedBarChart":
    case "GroupedBarChart":
      return [
        { category: "Q1", value: 42, region: "Americas" },
        { category: "Q2", value: 58, region: "Americas" },
        { category: "Q3", value: 65, region: "Americas" },
        { category: "Q4", value: 71, region: "Americas" },
        { category: "Q1", value: 28, region: "EMEA" },
        { category: "Q2", value: 35, region: "EMEA" },
        { category: "Q3", value: 41, region: "EMEA" },
        { category: "Q4", value: 48, region: "EMEA" },
      ]
    case "PieChart":
    case "DonutChart":
      return [
        { category: "Desktop", value: 58 },
        { category: "Mobile", value: 28 },
        { category: "Tablet", value: 10 },
        { category: "Other", value: 4 },
      ]
    case "LineChart":
    case "AreaChart":
      return Array.from({ length: 12 }, (_, i) => ({
        x: i + 1,
        y: Math.round(40 + 30 * Math.sin(i / 2) + i * 5),
      }))
    case "Scatterplot":
    case "BubbleChart":
      return Array.from({ length: 20 }, (_, i) => ({
        x: Math.round(20 + i * 3 + Math.random() * 10),
        y: Math.round(30000 + i * 4000 + Math.random() * 20000),
        size: Math.round(3 + Math.random() * 15),
      }))
    default:
      return [
        { category: "A", value: 10 },
        { category: "B", value: 20 },
        { category: "C", value: 15 },
      ]
  }
}

const port = parsePort()
const server = createServer(handleRequest)
server.listen(port, () => {
  console.log(`Semiotic OG Image Server running at http://localhost:${port}`)
  console.log(`Try: http://localhost:${port}/og?component=BarChart&theme=tufte&title=Revenue`)
})
