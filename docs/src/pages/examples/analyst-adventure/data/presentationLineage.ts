export interface PresentationNode {
  id: string
  label: string
  kind: "source" | "store" | "agent" | "account" | "output" | "daemon" | "controller"
}

export interface PresentationFlow {
  id: string
  source: string
  target: string
  confidenceUnits: number
  legitimate: boolean
}

export const presentationNodes: PresentationNode[] = [
  { id: "SalesForecast", label: "Sales Forecast", kind: "source" },
  { id: "FinanceForecast", label: "Finance Forecast", kind: "source" },
  { id: "HRForecast", label: "HR Forecast", kind: "source" },
  { id: "DeckStore", label: "Deck Store", kind: "store" },
  { id: "ZorkBot", label: "ZorkBot", kind: "agent" },
  { id: "CEOAccount", label: "CEO Account", kind: "account" },
  {
    id: "BoardroomProjector",
    label: "Boardroom Projector",
    kind: "output",
  },
  {
    id: "PresentationDaemon",
    label: "Presentation Daemon",
    kind: "daemon",
  },
  {
    id: "B2PrinterController",
    label: "B2 Printer Controller",
    kind: "controller",
  },
]

export const presentationFlows: PresentationFlow[] = [
  {
    id: "sales-deck",
    source: "SalesForecast",
    target: "DeckStore",
    confidenceUnits: 35,
    legitimate: true,
  },
  {
    id: "finance-deck",
    source: "FinanceForecast",
    target: "DeckStore",
    confidenceUnits: 42,
    legitimate: true,
  },
  {
    id: "hr-deck",
    source: "HRForecast",
    target: "DeckStore",
    confidenceUnits: 23,
    legitimate: true,
  },
  {
    id: "deck-zorkbot",
    source: "DeckStore",
    target: "ZorkBot",
    confidenceUnits: 100,
    legitimate: true,
  },
  {
    id: "zorkbot-projector",
    source: "ZorkBot",
    target: "BoardroomProjector",
    confidenceUnits: 100,
    legitimate: true,
  },
  {
    id: "daemon-projector",
    source: "PresentationDaemon",
    target: "BoardroomProjector",
    confidenceUnits: 10,
    legitimate: false,
  },
  {
    id: "daemon-account",
    source: "PresentationDaemon",
    target: "CEOAccount",
    confidenceUnits: 1,
    legitimate: false,
  },
  {
    id: "daemon-b2-controller",
    source: "PresentationDaemon",
    target: "B2PrinterController",
    confidenceUnits: 1,
    legitimate: false,
  },
  {
    id: "controller-daemon-backedge",
    source: "B2PrinterController",
    target: "PresentationDaemon",
    confidenceUnits: 1,
    legitimate: false,
  },
]

export function derivePresentationLineageFacts(
  flows: readonly PresentationFlow[] = presentationFlows,
) {
  const projectorFlows = flows.filter((flow) => flow.target === "BoardroomProjector")
  const legitimateProjectorUnits = projectorFlows
    .filter((flow) => flow.legitimate)
    .reduce((sum, flow) => sum + flow.confidenceUnits, 0)
  const projectorUnits = projectorFlows.reduce((sum, flow) => sum + flow.confidenceUnits, 0)
  const unsupportedProjectorFlows = projectorFlows.filter((flow) => !flow.legitimate)
  const daemonInjection = unsupportedProjectorFlows.find(
    (flow) => flow.source === "PresentationDaemon",
  )
  const daemonTouchesB2 = flows.some(
    (flow) =>
      (flow.source === "PresentationDaemon" && flow.target === "B2PrinterController") ||
      (flow.target === "PresentationDaemon" && flow.source === "B2PrinterController"),
  )

  if (!daemonInjection) {
    throw new Error("Presentation lineage fixture is missing the daemon injection")
  }

  return {
    legitimateSourceUnits: flows
      .filter((flow) => flow.target === "DeckStore")
      .reduce((sum, flow) => sum + flow.confidenceUnits, 0),
    legitimateProjectorUnits,
    projectorUnits,
    unsupportedProjectorUnits: projectorUnits - legitimateProjectorUnits,
    daemonInjection,
    daemonTouchesB2,
    hasBackedge: flows.some((flow) => flow.id === "controller-daemon-backedge"),
  }
}

export const presentationLineageFacts = derivePresentationLineageFacts()
