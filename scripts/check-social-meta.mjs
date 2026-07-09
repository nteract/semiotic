#!/usr/bin/env node
/* global console, fetch, process, URL */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Buffer } from "node:buffer"
import sharp from "sharp"

const DEFAULT_TARGET = "docs/build/examples/watermarks/index.html"
const SITE_URL = "https://semiotic.nteract.io"

const target = process.argv[2] || DEFAULT_TARGET
const isRemote = /^https?:\/\//i.test(target)

function fail(message) {
  console.error(`✗ ${message}`)
  process.exitCode = 1
}

function headContent(html) {
  const match = String(html).match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)
  return match ? match[1] : ""
}

function metaContent(head, selector, key) {
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${selector}=["']${key}["'])[^>]*\\bcontent=(["'])(.*?)\\1[^>]*>`, "i")
  return head.match(re)?.[2] || ""
}

async function loadHtml(input) {
  if (isRemote) {
    const res = await fetch(input, {
      headers: {
        "user-agent": "Semiotic social-meta checker (+https://github.com/nteract/semiotic)",
      },
    })
    if (!res.ok) throw new Error(`${input} returned HTTP ${res.status}`)
    const type = res.headers.get("content-type") || ""
    if (!type.includes("text/html")) throw new Error(`${input} returned content-type ${type || "(none)"}`)
    return res.text()
  }
  return readFileSync(resolve(input), "utf8")
}

async function checkImage(imageUrl) {
  if (!imageUrl) return

  if (isRemote) {
    const res = await fetch(imageUrl, {
      headers: {
        "user-agent": "Semiotic social-meta checker (+https://github.com/nteract/semiotic)",
      },
    })
    if (!res.ok) {
      fail(`image URL returned HTTP ${res.status}: ${imageUrl}`)
      return
    }
    const type = res.headers.get("content-type") || ""
    if (!type.includes("image/png")) fail(`image content-type is ${type || "(none)"} for ${imageUrl}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    const meta = await sharp(bytes).metadata()
    if (meta.width !== 1200 || meta.height !== 630) {
      fail(`remote image is ${meta.width}x${meta.height}, expected 1200x630`)
    }
    return
  }

  const url = new URL(imageUrl)
  if (url.origin !== SITE_URL) fail(`local og:image origin is ${url.origin}, expected ${SITE_URL}`)
  const imagePath = resolve("docs/build", url.pathname.replace(/^\//, ""))
  if (!existsSync(imagePath)) {
    fail(`local image file missing: ${imagePath}`)
    return
  }
  const meta = await sharp(imagePath).metadata()
  if (meta.width !== 1200 || meta.height !== 630) {
    fail(`local image is ${meta.width}x${meta.height}, expected 1200x630: ${imagePath}`)
  }
}

async function main() {
  const html = await loadHtml(target)
  const head = headContent(html)
  if (!head) {
    fail("document has no explicit <head>...</head> section")
    return
  }

  const fields = {
    title: html.match(/<title>([^<]+)<\/title>/i)?.[1] || "",
    ogTitle: metaContent(head, "property", "og:title"),
    ogDescription: metaContent(head, "property", "og:description"),
    ogImage: metaContent(head, "property", "og:image"),
    twitterCard: metaContent(head, "name", "twitter:card"),
    twitterImage: metaContent(head, "name", "twitter:image"),
  }

  for (const [name, value] of Object.entries(fields)) {
    if (!value) fail(`missing ${name} inside <head>`)
  }
  if (fields.twitterCard !== "summary_large_image") {
    fail(`twitter:card is ${fields.twitterCard || "(missing)"}, expected summary_large_image`)
  }
  if (fields.ogImage && !/^https:\/\/[^ ]+\.png$/i.test(fields.ogImage)) {
    fail(`og:image must be an absolute HTTPS PNG URL: ${fields.ogImage}`)
  }
  if (fields.twitterImage && fields.twitterImage !== fields.ogImage) {
    fail(`twitter:image differs from og:image`)
  }

  await checkImage(fields.ogImage)

  if (process.exitCode) return
  console.log(`✓ social metadata looks valid for ${target}`)
  console.log(`  title: ${fields.ogTitle}`)
  console.log(`  image: ${fields.ogImage}`)
}

main().catch((err) => {
  const cause = err.cause?.message ? ` (${err.cause.message})` : ""
  fail(`${err.message}${cause}`)
})
