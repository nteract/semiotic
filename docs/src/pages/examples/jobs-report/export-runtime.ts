import { briefingHTML, graphicSVG, sourceCSV } from "./exports"
import { buildBriefing, handoff, type BriefingReading } from "./packet"
import type { JobsSnapshot } from "./model"

export async function downloadBriefing(
  snapshot: JobsSnapshot,
  month: string,
  asOf: string,
  format: "packet" | "svg" | "png" | "html" | "csv",
  reading: BriefingReading = "direction",
) {
  const briefing = buildBriefing(snapshot, month, asOf, reading)
  let blob: Blob
  if (format === "packet")
    blob = new Blob([JSON.stringify(handoff(briefing), null, 2)], { type: "application/json" })
  else if (format === "csv") blob = new Blob([sourceCSV(snapshot, asOf)], { type: "text/csv" })
  else {
    const { renderChartWithEvidence } = await import("semiotic/server")
    const rendered = renderChartWithEvidence(briefing.component, briefing.props, {
      artifactContract: briefing.contract,
    })
    if (
      rendered.evidence.empty ||
      rendered.evidence.markCountByType.rect !== briefing.props.data.length
    )
      throw new Error("The graphic did not draw every revision step")
    const svg = graphicSVG(briefing, rendered.svg)
    blob = new Blob([format === "html" ? briefingHTML(briefing, svg) : svg], {
      type: format === "html" ? "text/html" : "image/svg+xml",
    })
    if (format === "png") {
      const url = URL.createObjectURL(blob)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        const canvas = document.createElement("canvas")
        canvas.width = 1520
        canvas.height = 1120
        const context = canvas.getContext("2d")
        if (!context) throw new Error("PNG export needs a browser canvas")
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error("PNG export failed"))),
            "image/png",
          ),
        )
      } finally {
        URL.revokeObjectURL(url)
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `jobs-${briefing.edition}.${format === "packet" ? "packet.json" : format}`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
