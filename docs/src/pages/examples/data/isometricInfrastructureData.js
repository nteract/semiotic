// A small production footprint: an internet-facing zone, a private subnet on
// a raised plate, and the traffic between them. Positions are grid cells on
// the ground plane (the layout, not the projection, owns them).

export const HOSTS = [
  { id: "internet", label: "Internet", kind: "cloud", zone: "public", col: 0.2, row: 5.2, cpu: 0, status: "ok", role: "Public clients" },
  { id: "edge-ip", label: "Edge IP", kind: "box", zone: "edge", col: 0, row: 0.6, cpu: 18, status: "ok", role: "Static egress address" },
  { id: "web-prd-1", label: "web-prd-1", kind: "server", zone: "dmz", col: 2, row: 2.6, cpu: 81, status: "alert", role: "Web tier (public)" },
  { id: "web-storage", label: "Web Storage", kind: "database", zone: "dmz", col: 3.4, row: 3.6, cpu: 42, status: "ok", role: "Session + asset store" },
  { id: "bastion", label: "demo-bastion", kind: "server", zone: "dmz", col: 4.8, row: 4.6, cpu: 12, status: "alert", role: "SSH jump host" },
  { id: "web-prd-2", label: "web-prd-2", kind: "server", zone: "private", col: 3.2, row: 0, cpu: 55, status: "ok", role: "Web tier (private)" },
  { id: "web-storage-2", label: "Web Storage 2", kind: "database", zone: "private", col: 4.4, row: 0.8, cpu: 64, status: "ok", role: "Replica store" },
  { id: "archive", label: "archive", kind: "server", zone: "cold", col: 6.2, row: 1.4, cpu: 6, status: "idle", role: "Cold backups" }
]

export const LINKS = [
  { source: "internet", target: "web-prd-1", protocol: "HTTPS 443", status: "ok" },
  { source: "internet", target: "web-storage", protocol: "S3 sync", status: "alert" },
  { source: "internet", target: "bastion", protocol: "SSH 22", status: "ok" },
  { source: "web-prd-1", target: "edge-ip", protocol: "egress", status: "ok" },
  { source: "web-prd-1", target: "web-prd-2", protocol: "gRPC 8443", status: "ok" },
  { source: "web-storage-2", target: "web-storage", protocol: "replication", status: "ok" },
  { source: "web-prd-2", target: "web-storage-2", protocol: "Postgres 5432", status: "ok" }
]

export const ZONES = [
  { id: "dmz", label: "INTERNET FACING", nodes: ["web-prd-1", "web-storage", "bastion"], depth: 10 },
  { id: "private", label: "PRIVATE SUBNET", nodes: ["web-prd-2", "web-storage-2"], elevation: 34, depth: 8 }
]

export const GRID = { cols: 7, rows: 6 }

export const PALETTE = {
  background: "#0b1a5c",
  ground: "rgba(126, 150, 255, 0.10)",
  zone: "#12267a",
  zoneEdge: "#3653d4",
  zoneLabel: "#e3e9ff",
  host: "#a9b8ff",
  hostAlert: "#ff8f9c",
  hostIdle: "#c9cedd",
  cloud: "#c9d6ff",
  link: "#eef2ff",
  linkAlert: "#ff5d73",
  linkEgress: "#63e6a4",
  label: "#d7deff"
}
