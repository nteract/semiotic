import { fingerprintValue } from "semiotic/artifact"
import { compareEditions, verifySnapshot } from "./edition"
import type { GuideState, ReservoirSnapshot } from "./types"

export const PUBLIC_ROOT = "/stories/reservoir-guide"
export async function loadSnapshot(url: string, signal?: AbortSignal) {
  const deadline = AbortSignal.timeout(20_000)
  signal = signal ? AbortSignal.any([signal, deadline]) : deadline
  const parsed = new URL(url, window.location.origin)
  if (
    parsed.origin !== window.location.origin ||
    !parsed.pathname.startsWith(`${PUBLIC_ROOT}/`) ||
    !parsed.pathname.endsWith("/snapshot.json")
  )
    throw new Error("Unsupported edition download address")
  const response = await fetch(parsed, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Edition download failed (${response.status})`)
  if (Number(response.headers.get("content-length")) > 5_000_000)
    throw new Error("Edition exceeds the 5 MB limit")
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Edition response has no data")
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.length
    if (size > 5_000_000) {
      await reader.cancel()
      throw new Error("Edition exceeds the 5 MB limit")
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return verifySnapshot(JSON.parse(new TextDecoder().decode(bytes)))
}

export async function checkForUpdate(
  snapshot: ReservoirSnapshot,
  state: GuideState,
  signal?: AbortSignal,
) {
  const deadline = AbortSignal.timeout(25_000)
  signal = signal ? AbortSignal.any([signal, deadline]) : deadline
  const response = await fetch(`${PUBLIC_ROOT}/current.json`, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Update check failed (${response.status})`)
  const text = await response.text()
  if (text.length > 10_000) throw new Error("Invalid edition index")
  const current = JSON.parse(text)
  if (current.editionId === snapshot.editionId && current.fingerprint === snapshot.fingerprint)
    return null
  if (current.editionId === snapshot.editionId)
    throw new Error("An immutable edition was changed in place; update refused")
  const next = await loadSnapshot(current.snapshotURL, signal)
  if (next.editionId !== current.editionId || next.fingerprint !== current.fingerprint)
    throw new Error("Edition index and downloaded values disagree")
  return { snapshot: next, comparison: compareEditions(snapshot, next, state) }
}

export async function saveOffline(html: string, state: GuideState, snapshotFingerprint: string) {
  if (!("serviceWorker" in navigator) || !("caches" in window))
    throw new Error(
      "This browser cannot save an offline address. Download the self-contained HTML instead.",
    )
  const registration = await navigator.serviceWorker.register(`${PUBLIC_ROOT}/offline/worker.js`, {
    scope: `${PUBLIC_ROOT}/offline/`,
  })
  if (!registration.active)
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing ?? registration.waiting
      if (!worker) {
        reject(new Error("Offline worker unavailable"))
        return
      }
      const timeout = window.setTimeout(() => {
        worker.removeEventListener("statechange", changed)
        reject(new Error("Offline worker activation timed out"))
      }, 15_000)
      const changed = () => {
        if (worker.state === "activated" || worker.state === "redundant") {
          window.clearTimeout(timeout)
          worker.removeEventListener("statechange", changed)
          if (worker.state === "activated") resolve()
          else reject(new Error("Offline worker could not activate"))
        }
      }
      worker.addEventListener("statechange", changed)
      changed()
    })
  const id = fingerprintValue({ state, snapshotFingerprint }).fingerprint
  const url = `${window.location.origin}${PUBLIC_ROOT}/offline/?saved=${encodeURIComponent(id)}`
  await (
    await caches.open("e03-saved-editions-v1")
  ).put(url, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
  return url
}

export function download(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
