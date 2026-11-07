import { useCallback, useEffect, useMemo, useState } from "react"
import { useAsyncAction } from "../../../hooks/useAsyncAction"
import bootstrapJSON from "./bootstrap.json"
import { compareEditions } from "./edition"
import { checkForUpdate, download, loadSnapshot, saveOffline } from "./host"
import { defaultState, readStateSearch, resolveState, stateSearch } from "./state"
import { prepareGuide } from "./prepare"
import type { EditionHeader } from "./exports"
import type { GuideState, PreparedGuide, ReservoirSnapshot } from "./types"

export const bootstrap = bootstrapJSON as unknown as {
  header: EditionHeader
  guide: PreparedGuide
  snapshotURL: string
}
type Offer = NonNullable<Awaited<ReturnType<typeof checkForUpdate>>>

export function useGuideHost() {
  const [snapshot, setSnapshot] = useState<ReservoirSnapshot | null>(null)
  const [state, setState] = useState<GuideState>(bootstrap.guide.state)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("Loading the pinned history for exploration…")
  const [offer, setOffer] = useState<Offer | null>(null)
  const [savedURL, setSavedURL] = useState("")
  const [attempt, setAttempt] = useState(0)
  const {
    busy,
    begin: beginOperation,
    cancel: stopOperation,
    finish: finishOperation,
    isCurrent,
  } = useAsyncAction()
  useEffect(() => {
    let requested = bootstrap.guide.state
    try {
      requested = readStateSearch(window.location.search, bootstrap.header)
      setState(requested)
    } catch (failure) {
      setError((failure as Error).message)
    }
    const controller = new AbortController()
    loadSnapshot(`/stories/reservoir-guide/${requested.editionId}/snapshot.json`, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return
        if (
          loaded.editionId !== requested.editionId ||
          (requested.editionId === bootstrap.header.editionId &&
            loaded.fingerprint !== bootstrap.header.fingerprint)
        )
          throw new Error(
            "The pinned edition differs from the requested identity or authored opening",
          )
        setSnapshot(loaded)
        setStatus("Saved historical edition ready. Updates are checked only when you ask.")
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setStatus(
            `Exploration unavailable: ${failure.message}. The authored historical opening remains readable.`,
          )
      })
    return () => {
      controller.abort()
      stopOperation()
    }
  }, [attempt, stopOperation])
  const header = snapshot ?? bootstrap.header
  const issue =
    error ||
    resolveState(
      state,
      (snapshot ?? { ...header, series: {}, sourceLineOverrides: {} }) as ReservoirSnapshot,
    )
  const guide = useMemo(
    () =>
      issue
        ? null
        : snapshot
          ? prepareGuide(snapshot, state)
          : JSON.stringify(state) === JSON.stringify(bootstrap.guide.state)
            ? bootstrap.guide
            : null,
    [snapshot, state, issue],
  )
  const select = useCallback((next: GuideState) => {
    stopOperation()
    setState(next)
    setError("")
    setSavedURL("")
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${stateSearch(next)}${window.location.hash}`,
    )
  }, [stopOperation])
  useEffect(() => {
    const pop = () => {
      stopOperation()
      try {
        setState(readStateSearch(window.location.search, header))
        setError("")
        setSavedURL("")
      } catch (failure) {
        setError((failure as Error).message)
      }
    }
    window.addEventListener("popstate", pop)
    return () => window.removeEventListener("popstate", pop)
  }, [header, stopOperation])
  async function exportView(kind: "html" | "packet" | "offline") {
    if (!snapshot || issue) return
    const owner = beginOperation()
    try {
      const { exportSelection } = await import("./export-runtime")
      if (!isCurrent(owner)) return
      const result = exportSelection(snapshot, state)
      if (kind === "offline") {
        const url = await saveOffline(result.html, state, snapshot.fingerprint)
        if (!isCurrent(owner)) return
        setSavedURL(url)
        setStatus(
          "This fixed selection is saved on this browser. Its offline address and downloaded HTML do not update themselves.",
        )
      } else {
        download(
          kind === "html" ? result.html : JSON.stringify(result.packet),
          `reservoir-${state.stationId}-${state.waterYear}-${state.monthDay}.${kind === "html" ? "html" : "json"}`,
          kind === "html" ? "text/html" : "application/json",
        )
        setStatus(
          `Downloaded the selected ${kind === "html" ? "self-contained HTML edition" : "data packet"}.`,
        )
      }
    } catch (failure) {
      if (isCurrent(owner))
        setStatus(`Save failed: ${(failure as Error).message}. The current view is retained.`)
    } finally {
      finishOperation(owner)
    }
  }
  async function refresh() {
    if (!snapshot) return
    const controller = beginOperation()
    setOffer(null)
    try {
      const next = await checkForUpdate(snapshot, state, controller.signal)
      if (!isCurrent(controller)) return
      setOffer(next)
      setStatus(
        next
          ? "A different edition is available. Review the changes before accepting."
          : "No newer edition is offered. This remains the same historical snapshot.",
      )
    } catch (failure) {
      if (isCurrent(controller))
        setStatus(
          `Update check failed: ${(failure as Error).message}. Saved historical edition retained; retrieved ${snapshot.retrievedAt}.`,
        )
    } finally {
      finishOperation(controller)
    }
  }
  function acceptUpdate() {
    if (!offer || !snapshot) return
    // Re-evaluate compatibility against the selection at acceptance time.
    const comparison = compareEditions(snapshot, offer.snapshot, state)
    setSnapshot(offer.snapshot)
    select(comparison.nextState)
    setOffer(null)
    setStatus(
      comparison.selectionIssue
        ? `Edition accepted; ${comparison.selectionIssue} Your original selection is retained for inspection.`
        : "Edition accepted. Reservoir, water years, calendar date and baseline selection preserved.",
    )
  }
  async function importPacket(file: File | undefined) {
    if (!file || !snapshot) return
    const owner = beginOperation()
    try {
      if (file.size > 2_000_000) throw new Error("Packet exceeds the 2 MB limit")
      const { importGuidePacket } = await import("./packet")
      if (!isCurrent(owner)) return
      const text = await file.text()
      if (!isCurrent(owner)) return
      const imported = importGuidePacket(JSON.parse(text), snapshot)
      select(imported.state)
      setStatus(imported.issue ?? "Saved packet verified against this pinned edition.")
    } catch (failure) {
      if (isCurrent(owner))
        setStatus(`Import refused: ${(failure as Error).message}. Current selection retained.`)
    } finally {
      finishOperation(owner)
    }
  }
  return {
    header,
    snapshot,
    state,
    guide,
    issue,
    status,
    busy,
    offer,
    savedURL,
    select,
    exportView,
    refresh,
    acceptUpdate,
    importPacket,
    reset: () => select(defaultState(header)),
    retry: () => setAttempt((a) => a + 1),
  }
}
