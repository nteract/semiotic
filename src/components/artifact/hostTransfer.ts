import {
  validateArtifactPacket,
  type ArtifactPacket,
  type ArtifactTransferFormat
} from "./inheritance"
import { escapeXmlAttribute, insertSvgRootContent } from "../shared/svgRoot"

export type ArtifactSidecarFormat =
  "png-sidecar" | "notebook" | "static-package"

export interface AdjacentArtifactSidecar {
  format: ArtifactSidecarFormat
  hostPath: string
  sidecarPath: string
  mediaType: "application/json"
  content: string
}

const SIDECAR_FORMATS = new Set<ArtifactTransferFormat>([
  "png-sidecar",
  "notebook",
  "static-package"
])

function assertPacket(packet: ArtifactPacket): void {
  if (!validateArtifactPacket(packet).valid) {
    throw new TypeError("Artifact packet must be valid before host transfer.")
  }
}

function packetJson(packet: ArtifactPacket): string {
  return JSON.stringify(packet)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/** Embed a complete SVG-format packet as machine-readable XML metadata. */
export function embedArtifactPacketInSvg(
  svg: string,
  packet: ArtifactPacket
): string {
  assertPacket(packet)
  if (packet.transfer.format !== "svg") {
    throw new TypeError("SVG metadata requires an SVG-format artifact packet.")
  }
  const metadata = `<metadata xmlns="http://www.w3.org/2000/svg" data-semiotic-artifact="${escapeXmlAttribute(packet.artifactId)}">${packetJson(packet).replace(/&/g, "&amp;")}</metadata>`
  return insertSvgRootContent(svg, metadata)
}

/** Prepare an inspectable JSON file to be written beside a static host. */
export function createAdjacentArtifactSidecar(
  packet: ArtifactPacket,
  hostPath: string
): AdjacentArtifactSidecar {
  assertPacket(packet)
  if (!SIDECAR_FORMATS.has(packet.transfer.format)) {
    throw new TypeError(
      "Adjacent sidecars require a PNG, notebook, or static-package packet."
    )
  }
  if (typeof hostPath !== "string" || !hostPath.trim()) {
    throw new TypeError("Sidecar host path must be a non-empty string.")
  }
  return {
    format: packet.transfer.format as ArtifactSidecarFormat,
    hostPath,
    sidecarPath: `${hostPath}${/[\\/]$/.test(hostPath) ? "" : "."}artifact-contract.json`,
    mediaType: "application/json",
    content: `${packetJson(packet)}\n`
  }
}
