import React, { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import {
  recordAnnotationStatusChange,
  useConversationArc,
} from "semiotic/ai"
import { useReducedMotion } from "semiotic/utils"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  adventureActions,
  adventureReducer,
  createInitialAdventureState,
} from "./adventureReducer"
import {
  getAvailableChoices,
  getAvailableDestinations,
  getEnding,
  getRoom,
  isAdventureChoiceDisabled,
} from "./roomRegistry"
import { hintFlagForRoom, storySeed1984 } from "./storySeed1984"
import AnalystStatus from "./components/AnalystStatus"
import CgaShell from "./components/CgaShell"
import ChoicePanel from "./components/ChoicePanel"
import DataSummaryPanel from "./components/DataSummaryPanel"
import EndingScreen from "./components/EndingScreen"
import EvidenceDiskette from "./components/EvidenceDiskette"
import NarrativeTerminal from "./components/NarrativeTerminal"
import BoardroomRoom from "./rooms/BoardroomRoom"
import ExecutiveSuiteRoom from "./rooms/ExecutiveSuiteRoom"
import ForecastVaultRoom from "./rooms/ForecastVaultRoom"
import MapRoom from "./rooms/MapRoom"
import RecordsCatacombsRoom from "./rooms/RecordsCatacombsRoom"
import ServerCathedralRoom from "./rooms/ServerCathedralRoom"

const ROOM_COMPONENTS = {
  "executive-suite": ExecutiveSuiteRoom,
  "records-catacombs": RecordsCatacombsRoom,
  "map-room": MapRoom,
  "server-cathedral": ServerCathedralRoom,
  "forecast-vault": ForecastVaultRoom,
  boardroom: BoardroomRoom,
}

const DESTINATION_LABELS = {
  "executive-suite": "Executive Suite",
  "records-catacombs": "Records Catacombs",
  "map-room": "Corporate Map Room",
  "server-cathedral": "Server Cathedral",
  boardroom: "Boardroom",
}

const FRAME_COMPONENT = {
  xy: "StreamXYFrame",
  ordinal: "StreamOrdinalFrame",
  geo: "StreamGeoFrame",
  network: "StreamNetworkFrame",
  physics: "StreamPhysicsFrame",
}

function isTypingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  )
}

function inputType(value) {
  if (value === "navigation-tree") return "navigation-tree"
  if (value === "touch") return "touch"
  if (value === "keyboard" || value === "activate") return "keyboard"
  if (value === "programmatic") return "programmatic"
  return "pointer"
}

function formatDataValue(value) {
  if (value instanceof Date) {
    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    })
  }
  if (Array.isArray(value)) return value.join(" → ")
  if (value && typeof value === "object") return JSON.stringify(value)
  if (typeof value === "boolean") return value ? "yes" : "no"
  return value
}

function columnsForRows(rows) {
  const first = rows?.[0]
  if (!first || typeof first !== "object") return []
  return Object.keys(first)
    .filter((key) => !key.startsWith("_") && key !== "content")
    .slice(0, 9)
    .map((key) => ({
      key,
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
      format: formatDataValue,
    }))
}

function atmosphericLine(state) {
  const inspected = new Set(state.inspectedDatumIds)
  if (inspected.has("badge-roof-0914") || inspected.has("badge-roof-0918")) {
    return "You linger over the stale roof ping. Its two timestamps refuse to agree."
  }
  if (inspected.has("corporate-archaeology")) {
    return "The tiny department seems to interest you. The terminal approves of denominators."
  }
  if (inspected.has("b2-to-hq")) {
    return "You trace the flow backward rather than forward. Somewhere, a router feels seen."
  }
  if (inspected.has("daemon-projector") || inspected.has("PresentationDaemon")) {
    return "Ten confidence units enter without a defensible ancestor. The organ music stops."
  }
  if (inspected.has("mort-zork")) {
    return "The gold token rattles against the manual-lineage override. It has a mustache."
  }
  return null
}

function ShortcutLegend({ onData, onHint, onRewind, hintDisabled, rewindDisabled }) {
  return (
    <details className="analyst-adventure__shortcuts">
      <summary>KEYBOARD / ACCESSIBILITY CONTROLS</summary>
      <div>
        <button type="button" onClick={onHint} disabled={hintDisabled} aria-keyshortcuts="H">
          H · REQUEST HINT
        </button>
        <button type="button" onClick={onData} aria-keyshortcuts="D">
          D · DATA SUMMARY
        </button>
        <button type="button" onClick={onRewind} disabled={rewindDisabled} aria-keyshortcuts="R">
          R · REWIND ROOM
        </button>
      </div>
      <p>1–4 choose · arrows navigate focused charts and trees · Enter/Space activate · Esc closes panels.</p>
    </details>
  )
}

function CaseMap({ destinations, state, onNavigate }) {
  if (!destinations.length) return null
  return (
    <nav className="analyst-adventure__case-map" aria-label="Available investigation locations">
      <span>CASE MAP // AVAILABLE ROUTES</span>
      <div>
        {destinations.map((roomId) => (
          <button
            key={roomId}
            type="button"
            data-completed={state.completedRoomIds.includes(roomId) ? "true" : "false"}
            onClick={() => onNavigate(roomId)}
          >
            {DESTINATION_LABELS[roomId]}
            {state.completedRoomIds.includes(roomId) ? " · EVIDENCE LOGGED" : ""}
          </button>
        ))}
      </div>
    </nav>
  )
}

function TitleScreen({ onStart }) {
  return (
    <section className="analyst-adventure__title-screen">
      <div className="analyst-adventure__title-art" aria-hidden="true">
        {Array.from("SEMIOTIC").map((letter, index) => (
          <span key={`${letter}-${index}`}>{letter}</span>
        ))}
      </div>
      <p>SEMIOTIC PRESENTS // SOFTWARE PRODUCT 1984</p>
      <h2>ANALYST ADVENTURE</h2>
      <h3>THE CASE OF THE VANISHING VISIONARY</h3>
      <p className="analyst-adventure__motto">“Making Synergy Tangible Since 1981.”</p>
      <button type="button" className="aa-primary-button" onClick={onStart} autoFocus>
        BEGIN INVESTIGATION
      </button>
      <small>Charts are witnesses. Read them closely. Seed: 1984.</small>
    </section>
  )
}

export default function AnalystAdventureGame() {
  const [state, dispatch] = useReducer(
    adventureReducer,
    undefined,
    createInitialAdventureState,
  )
  const [chartWidth, hostRef] = useResponsiveWidth(300, 700)
  const reducedMotion = useReducedMotion()
  const [dataSummaryOpen, setDataSummaryOpen] = useState(false)
  const [analytics, setAnalytics] = useState({
    roomId: "executive-suite",
    title: "Executive telemetry",
    rows: [],
    description: "Start the case to inspect room data.",
  })
  const [hintRequestToken, setHintRequestToken] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  // Bumped by the secret "Lies" warp so the room remounts even if already there.
  const [roomEpoch, setRoomEpoch] = useState(0)
  const { record } = useConversationArc({
    capacity: 180,
    sessionId: "analyst-adventure-seed-1984",
  })

  const room = getRoom(state.currentRoomId)
  const RoomComponent = ROOM_COMPONENTS[state.currentRoomId]
  const choices = getAvailableChoices(state)
  const destinations = getAvailableDestinations(state)
  const started = Boolean(state.flags.storyStarted)
  const ending = state.endingId ? getEnding(state.endingId) : null
  const completedCurrentRoom = state.completedRoomIds.includes(state.currentRoomId)
  const hintUsedHere = Boolean(state.flags[hintFlagForRoom(state.currentRoomId)])
  const atmosphere = atmosphericLine(state)

  useEffect(() => {
    if (!started || ending) return
    record({
      type: "chart-rendered",
      component: FRAME_COMPONENT[room.frameFamily] ?? "EvidenceMontage",
      chartId: `analyst-adventure-${room.id}`,
      meta: { room: room.title, seed: state.seed },
    })
  }, [ending, record, room.frameFamily, room.id, room.title, started, state.seed])

  useEffect(() => {
    if (state.currentRoomId !== "boardroom") return
    setAnalytics({
      roomId: "boardroom",
      title: "Boardroom evidence montage",
      rows: state.evidence,
      description:
        "The evidence montage preserves each claim, scope, denominator, frame family, assistance status, provenance, and serialized chart configuration.",
    })
  }, [state.currentRoomId, state.evidence])

  const choose = useCallback(
    (choiceOrId) => {
      const choiceId = typeof choiceOrId === "string" ? choiceOrId : choiceOrId.id
      if (!choiceId || isAdventureChoiceDisabled(state, choiceId)) return
      dispatch(adventureActions.choose(choiceId))
      setAnnouncement(`Selected ${choiceId.replaceAll("-", " ")}.`)
      record({
        type: "chart-edited",
        component: FRAME_COMPONENT[room.frameFamily] ?? "AnalystAdventure",
        chartId: `analyst-adventure-${room.id}`,
        changedProps: ["story-choice"],
        meta: { choiceId },
      })
    },
    [record, room.frameFamily, room.id, state],
  )

  const navigate = useCallback((roomId) => {
    dispatch(adventureActions.navigate(roomId))
    setAnnouncement(`Traveling to ${DESTINATION_LABELS[roomId]}.`)
  }, [])

  // Secret pointer-only warp from the word "Lies" in "The Calendar That Lies".
  // Always mutates mount epoch so re-clicking while already in the suite still
  // remounts the room (otherwise the reducer is a no-op and nothing appears to happen).
  const secretCalendarWarp = useCallback(() => {
    dispatch(adventureActions.debugWarp("executive-suite"))
    setRoomEpoch((value) => value + 1)
    setDataSummaryOpen(false)
    setHintRequestToken(0)
    setAnnouncement("Warped to The Calendar That Lies.")
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const chart = document.querySelector(".aa-chart-viewport")
        chart?.scrollIntoView({ block: "start", behavior: "instant" })
      })
    })
  }, [])

  const startAdventure = useCallback(() => {
    dispatch(adventureActions.start())
    setAnnouncement("Investigation opened.")
  }, [])

  const restartAdventure = useCallback(() => {
    dispatch(adventureActions.restart())
    setDataSummaryOpen(false)
    setHintRequestToken(0)
    setAnnouncement("")
    setAnalytics({
      roomId: "executive-suite",
      title: "Executive telemetry",
      rows: [],
      description: "Start the case to inspect room data.",
    })
  }, [])

  const activateAnnotation = useCallback(
    (annotationId, options) => {
      if (options?.closeOnly) return
      dispatch(adventureActions.activateAnnotation(annotationId))
      recordAnnotationStatusChange("accepted", {
        annotationId,
        chartId: `analyst-adventure-${state.currentRoomId}`,
        arcId: "vanishing-visionary",
        meta: { input: "semantic-activation" },
      })
      setAnnouncement(`Activated chart annotation ${annotationId}.`)
    },
    [state.currentRoomId],
  )

  const inspect = useCallback((datumId, source) => {
    if (!datumId) return
    dispatch(adventureActions.inspectDatum(datumId, inputType(source)))
  }, [])

  const requestHint = useCallback(() => {
    if (!started || ending || hintUsedHere || state.currentRoomId === "boardroom") return
    setHintRequestToken((value) => value + 1)
    setAnnouncement("ZORKBOT-2000 is narrowing the search space.")
  }, [ending, hintUsedHere, started, state.currentRoomId])

  const useHint = useCallback(
    (roomId) => {
      dispatch(adventureActions.useHint(roomId))
      // A token is a one-shot request for the currently mounted room. Clear
      // it after delivery so a later room mount cannot replay the same hint.
      setHintRequestToken(0)
    },
    [],
  )

  const rewind = useCallback(() => {
    dispatch(adventureActions.rewind())
    setAnnouncement("Previous room snapshot restored, including evidence and secret state.")
  }, [])

  const reopenEvidence = useCallback(
    (artifact) => {
      const roomId = artifact?.provenance?.roomId
      if (roomId && roomId !== "forecast-vault" && roomId !== "boardroom") {
        dispatch(adventureActions.navigate(roomId))
        setAnnouncement(`Reopened ${artifact.label} in its original ${artifact.frame} room.`)
      }
    },
    [],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (/^[1-4]$/.test(event.key) && started && !ending) {
        const index = Number(event.key) - 1
        const choice = choices[index]
        if (choice) {
          event.preventDefault()
          choose(choice.id)
        }
        return
      }
      if (event.key.toLowerCase() === "h") {
        event.preventDefault()
        requestHint()
      } else if (event.key.toLowerCase() === "d") {
        event.preventDefault()
        setDataSummaryOpen(true)
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault()
        rewind()
      } else if (event.key === "Escape" && dataSummaryOpen) {
        event.preventDefault()
        setDataSummaryOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [choices, choose, dataSummaryOpen, ending, requestHint, rewind, started])

  const evidenceForUi = useMemo(
    () =>
      state.evidence.map((artifact) => ({
        ...artifact,
        hinted: artifact.reachedAfterHint,
      })),
    [state.evidence],
  )
  const dataColumns = useMemo(() => columnsForRows(analytics.rows), [analytics.rows])
  const choiceItems = choices.map((choice) => ({
    ...choice,
    tone: choice.kind === "correct" ? "cyan" : choice.kind === "secret" ? "magenta" : "default",
    disabled: isAdventureChoiceDisabled(state, choice.id),
  }))

  const headerAction = (
    <button
      type="button"
      className={`aa-shell__session-action aa-shell__session-action--${started ? "restart" : "begin"}`}
      data-session-action={started ? "restart" : "begin"}
      onClick={started ? restartAdventure : startAdventure}
    >
      {started ? "RESTART" : "BEGIN"}
    </button>
  )

  const status = (
    <AnalystStatus
      credibility={state.credibility}
      hintsUsed={state.hintsUsed}
      evidenceCount={state.evidence.filter((artifact) => artifact.id !== "settled-projection").length}
      visitedCount={state.visitedRoomIds.length}
      statusText={ending ? "Case ended" : completedCurrentRoom ? "Lead secured" : "Investigating"}
      items={[
        { id: "annotations", label: "Annotations", value: state.activatedAnnotationIds.length },
        { id: "seed", label: "Seed", value: state.seed },
      ]}
    />
  )
  const evidence = (
    <EvidenceDiskette
      evidence={evidenceForUi}
      defaultOpen={state.evidence.length > 0}
      onReopen={reopenEvidence}
    />
  )

  let shell
  if (!started) {
    shell = (
      <CgaShell
        title="ANALYST ADVENTURE"
        location={{ title: "ZORKCORP LOBBY", subtitle: "9:12 A.M. · CASE NOT YET OPEN" }}
        headerActions={headerAction}
        narrative={
          <NarrativeTerminal
            title="Incoming assignment"
            lines={storySeed1984.introduction}
            prompt="Mortimer Zork has vanished. His data has not."
          />
        }
        chart={<TitleScreen onStart={startAdventure} />}
        chartLabel="Analyst Adventure title screen"
        status={status}
        evidence={evidence}
        controls={
          <ShortcutLegend
            onData={() => setDataSummaryOpen(true)}
            onHint={requestHint}
            onRewind={rewind}
            hintDisabled
            rewindDisabled
          />
        }
      />
    )
  } else if (ending) {
    shell = (
      <CgaShell
        title="ANALYST ADVENTURE"
        location={{ title: "CASE TERMINATED", subtitle: ending.category.toUpperCase() }}
        headerActions={headerAction}
        narrative={
          <NarrativeTerminal
            title="Case recorder"
            lines={[`Ending reached after ${state.path.length} deterministic events.`]}
            prompt="Rewind preserves the investigation up to the decision that ended it."
          />
        }
        chart={
          <EndingScreen
            ending={{ ...ending, lines: ending.narrative, kind: ending.category }}
            evidence={state.evidence}
            onRewind={rewind}
            onRestart={restartAdventure}
          />
        }
        chartLabel={ending.title}
        status={status}
        evidence={evidence}
        controls={
          <ShortcutLegend
            onData={() => setDataSummaryOpen(true)}
            onHint={requestHint}
            onRewind={rewind}
            hintDisabled
            rewindDisabled={state.path.length === 0}
          />
        }
      />
    )
  } else {
    const roomProps = {
      room,
      state,
      width: chartWidth,
      reducedMotion,
      hintRequestToken,
      hintsRemaining: !hintUsedHere,
      onHintUsed: useHint,
      onInspect: inspect,
      onAnalyticsReady: setAnalytics,
      onActivateAnnotation: activateAnnotation,
      onShowSettledProjection: () => dispatch(adventureActions.showSettledProjection()),
      onChoose: choose,
      onReopenEvidence: reopenEvidence,
      onSecretCalendarWarp: secretCalendarWarp,
    }
    shell = (
      <CgaShell
        title="ANALYST ADVENTURE"
        location={{ title: room.title, subtitle: room.subtitle }}
        headerActions={headerAction}
        onSecretCalendarWarp={secretCalendarWarp}
        narrative={
          <NarrativeTerminal
            title={room.title}
            onSecretCalendarWarp={secretCalendarWarp}
            eyebrow={`ROOM ${state.visitedRoomIds.indexOf(room.id) + 1} // ${room.frameFamily.toUpperCase()}`}
            lines={[
              ...room.narrative,
              ...(atmosphere ? [{ speaker: "OBSERVATION", text: atmosphere, tone: "status" }] : []),
            ]}
            prompt={room.prompt}
          />
        }
        chart={<RoomComponent key={`${room.id}-${roomEpoch}`} {...roomProps} />}
        chartLabel={`${room.title} analytical puzzle`}
        choices={
          <ChoicePanel
            choices={choiceItems}
            onChoose={(choice) => choose(choice.id)}
            resolution={completedCurrentRoom ? room.successDebrief : undefined}
            resolutionAction={
              completedCurrentRoom && state.currentRoomId === "server-cathedral"
                ? {
                    label: "Proceed to the Boardroom",
                    onClick: () => navigate("boardroom"),
                  }
                : undefined
            }
            title={state.currentRoomId === "boardroom" ? "Deliver your conclusion" : "What does the chart establish?"}
            label={`${room.title} ${completedCurrentRoom ? "resolution" : "choices"}`}
          />
        }
        status={status}
        evidence={evidence}
        controls={
          <>
            <CaseMap destinations={destinations} state={state} onNavigate={navigate} />
            <ShortcutLegend
              onData={() => setDataSummaryOpen(true)}
              onHint={requestHint}
              onRewind={rewind}
              hintDisabled={hintUsedHere || state.currentRoomId === "boardroom"}
              rewindDisabled={state.path.length === 0}
            />
          </>
        }
      >
        <p className="analyst-adventure__live-announcement" role="status" aria-live="polite">
          {announcement}
        </p>
      </CgaShell>
    )
  }

  return (
    <div className="analyst-adventure" ref={hostRef} data-reduced-motion={reducedMotion ? "true" : "false"}>
      {shell}
      <DataSummaryPanel
        open={dataSummaryOpen}
        title={`${analytics.title} · data summary`}
        summary={analytics.description}
        columns={dataColumns}
        rows={analytics.rows}
        caption={`${analytics.title}: every field needed to answer the room's ordinary analytical question`}
        onClose={() => setDataSummaryOpen(false)}
      />
    </div>
  )
}
