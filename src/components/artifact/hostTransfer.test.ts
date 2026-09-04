import { describe, expect, it } from "vitest"
import { buildArtifactContract } from "./contract"
import {
  createArtifactPacket,
  validateArtifactPacket,
  type ArtifactTransferFormat
} from "./inheritance"
import {
  createAdjacentArtifactSidecar,
  embedArtifactPacketInSvg,
  type ArtifactSidecarFormat
} from "./hostTransfer"

function hostContract(id = "host-transfer") {
  return buildArtifactContract(
    "LineChart",
    {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y"
    },
    {
      id,
      intents: "trend",
      claims: [
        {
          id: `${id}-claim`,
          text: "The value is above zero.",
          kind: "observation",
          status: "supported",
          evidenceIds: [`${id}-evidence`]
        }
      ],
      evidence: [
        {
          id: `${id}-evidence`,
          role: "source-data",
          fingerprint: `sha256:${id}`
        }
      ]
    }
  )
}

describe("artifact host transfers", () => {
  it("rejects unsupported packet formats during construction and validation", () => {
    expect(() =>
      createArtifactPacket(hostContract(), {
        format: "pdf" as ArtifactTransferFormat
      })
    ).toThrow('Unsupported artifact packet format "pdf"')

    const forged = createArtifactPacket(hostContract("forged"))
    forged.transfer.format = "pdf" as ArtifactTransferFormat
    expect(validateArtifactPacket(forged).errors).toContain(
      "Artifact packet transfer format is not supported."
    )
  })

  it("embeds a complete, escaped packet in SVG metadata", () => {
    const contract = hostContract('svg"><unsafe\t\n\r')
    contract.claims[0].text = "</metadata><script>alert(1)</script> & context"
    const packet = createArtifactPacket(contract, { format: "svg" })
    const svg = embedArtifactPacketInSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>',
      packet
    )
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    const metadata = document.querySelector("metadata")

    expect(document.querySelector("parsererror")).toBeNull()
    expect(metadata?.getAttribute("data-semiotic-artifact")).toBe(
      packet.artifactId
    )
    expect(JSON.parse(metadata?.textContent ?? "null")).toEqual(packet)
    expect(svg).not.toContain("</metadata><script>")
    expect(svg).toContain('<path d="M0 0" />')
  })

  it.each([
    '<svg xmlns="http://www.w3.org/2000/svg" aria-label="A > B" width="400"></svg>',
    "<svg xmlns='http://www.w3.org/2000/svg' aria-label='A > B' width='400'/>",
    '<?xml version="1.0"?><!-- <svg aria-label="decoy"> --><svg xmlns="http://www.w3.org/2000/svg"/>',
    '<!DOCTYPE svg [<!ENTITY decoy "<svg>">]><svg xmlns="http://www.w3.org/2000/svg"/>',
    '<s:svg xmlns:s="http://www.w3.org/2000/svg" aria-label="A > B"/>'
  ])("inserts metadata inside the actual SVG root: %s", (host) => {
    const packet = createArtifactPacket(hostContract(), { format: "svg" })
    const svg = embedArtifactPacketInSvg(host, packet)
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    const metadata = document.getElementsByTagNameNS(
      "http://www.w3.org/2000/svg",
      "metadata"
    )[0]
    expect(metadata.parentNode).toBe(document.documentElement)
    expect(JSON.parse(metadata.textContent!)).toEqual(packet)
    if (host.includes("A > B"))
      expect(document.documentElement.getAttribute("aria-label")).toBe("A > B")
  })

  it.each([
    "<svg-icon></svg-icon>",
    "<html><svg></svg></html>",
    "<!-- <svg> -->",
    '<svg aria-label="unterminated>'
  ])("rejects a decoy or malformed SVG root: %s", (host) => {
    expect(() =>
      embedArtifactPacketInSvg(
        host,
        createArtifactPacket(hostContract(), { format: "svg" })
      )
    ).toThrow("svg root element")
  })

  it.each([
    [
      "png-sidecar",
      "/exports/chart.png",
      "/exports/chart.png.artifact-contract.json"
    ],
    [
      "notebook",
      "/exports/analysis.ipynb",
      "/exports/analysis.ipynb.artifact-contract.json"
    ],
    [
      "static-package",
      "/exports/article/",
      "/exports/article/artifact-contract.json"
    ]
  ] as const)(
    "delivers a %s packet as an adjacent JSON sidecar",
    (format, hostPath, sidecarPath) => {
      const packet = createArtifactPacket(hostContract(format), { format })
      const sidecar = createAdjacentArtifactSidecar(packet, hostPath)

      expect(sidecar).toMatchObject({
        format: format as ArtifactSidecarFormat,
        hostPath,
        sidecarPath,
        mediaType: "application/json"
      })
      expect(JSON.parse(sidecar.content)).toEqual(packet)
    }
  )

  it("keeps host helpers explicit about their supported packet classes", () => {
    const htmlPacket = createArtifactPacket(hostContract("html"), {
      format: "html"
    })

    expect(() => embedArtifactPacketInSvg("<svg></svg>", htmlPacket)).toThrow(
      "SVG-format"
    )
    expect(() =>
      createAdjacentArtifactSidecar(htmlPacket, "/exports/chart.html")
    ).toThrow("Adjacent sidecars")
  })
})
