import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const [busy, setBusy] = useState(false)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [savedURL, setSavedURL] = useState("")
  const [attempt, setAttempt] = useState(0)
  const refreshController = useRef<AbortController | null>(null)
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
      refreshController.current?.abort()
    }
  }, [attempt])
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
    setState(next)
    setError("")
    setSavedURL("")
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${stateSearch(next)}${window.location.hash}`,
    )
  }, [])
  useEffect(() => {
    const pop = () => {
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
  }, [header])
  async function exportView(kind: "html" | "packet" | "offline") {
    if (!snapshot || issue) return
    setBusy(true)
    try {
      const { exportSelection } = await import("./export-runtime")
      const result = exportSelection(snapshot, state)
      if (kind === "offline") {
        setSavedURL(await saveOffline(result.html, state, snapshot.fingerprint))
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
      setStatus(`Save failed: ${(failure as Error).message}. The current view is retained.`)
    } finally {
      setBusy(false)
    }
  }
  async function refresh() {
    if (!snapshot) return
    setBusy(true)
    setOffer(null)
    refreshController.current?.abort()
    const controller = new AbortController()
    refreshController.current = controller
    try {
      const next = await checkForUpdate(snapshot, state, controller.signal)
      setOffer(next)
      setStatus(
        next
          ? "A different edition is available. Review the changes before accepting."
          : "No newer edition is offered. This remains the same historical snapshot.",
      )
    } catch (failure) {
      if (!controller.signal.aborted)
        setStatus(
          `Update check failed: ${(failure as Error).message}. Saved historical edition retained; retrieved ${snapshot.retrievedAt}.`,
        )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
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
    setBusy(true)
    try {
      if (file.size > 2_000_000) throw new Error("Packet exceeds the 2 MB limit")
      const { importGuidePacket } = await import("./packet")
      const imported = importGuidePacket(JSON.parse(await file.text()), snapshot)
      select(imported.state)
      setStatus(imported.issue ?? "Saved packet verified against this pinned edition.")
    } catch (failure) {
      setStatus(`Import refused: ${(failure as Error).message}. Current selection retained.`)
    } finally {
      setBusy(false)
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
