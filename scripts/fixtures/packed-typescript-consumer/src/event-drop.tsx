import * as React from "react"
import { EventDropChart as AIEventDropChart } from "semiotic/ai"
import {
  EventDropChart,
  type EventDropChartHandle,
  type EventDropChartProps,
  type PhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "semiotic/physics"

// Recompile released consumer patterns against the installed package. Mixing
// two releases' recursive callback types in one program is a different contract.
type ReleasedFrameProps = Partial<
  Omit<
    StreamPhysicsFrameProps,
    "config" | "initialSpawnPacing" | "initialSpawns" | "size"
  >
>
type ReleasedComponent = React.ForwardRefExoticComponent<
  EventDropChartProps & React.RefAttributes<PhysicsFrameHandle>
>

const releasedPhysicsComponent: ReleasedComponent = EventDropChart
const releasedAIComponent: ReleasedComponent = AIEventDropChart
const legacyRef = React.createRef<PhysicsFrameHandle>()
const legacyCallback: React.RefCallback<PhysicsFrameHandle> = (handle) => {
  handle?.push({ time: 1, arrivalTime: 2 })
}
const frameProps: ReleasedFrameProps = {
  onFrame: (store) => {
    store.readBodies()
  },
  controllers: [{ id: "observe", tick: ({ result }) => void result.events }],
  bodyForces: ({ body }) => ({ x: 0, y: -body.y })
}
const props: EventDropChartProps = { data: [{ time: 1 }], frameProps }

const ForwardedEventDrop = React.forwardRef<
  PhysicsFrameHandle,
  EventDropChartProps
>((chartProps, ref) => <EventDropChart {...chartProps} ref={ref} />)

const physicsRef = React.createRef<React.ComponentRef<typeof EventDropChart>>()
const aiRef = React.createRef<React.ComponentRef<typeof AIEventDropChart>>()
const physicsHandle: EventDropChartHandle | null = physicsRef.current
const aiHandle: EventDropChartHandle | null = aiRef.current
physicsHandle?.getLedger()
aiHandle?.getClock()

// Negative assertions prevent an accidentally untyped signature from passing.
// @ts-expect-error EventDrop refs retain their concrete handle type.
physicsRef.current?.unknownHandleMethod()
// @ts-expect-error AI re-exports retain the same concrete handle type.
aiRef.current?.unknownHandleMethod()
const invalidConfig: EventDropChartProps["frameProps"] = {
  // @ts-expect-error Frame configuration remains typed.
  config: { timeScale: "fast" }
}

export const eventDropCompatibility = {
  releasedPhysicsComponent,
  releasedAIComponent,
  invalidConfig,
  legacyPhysicsObjectRef: <EventDropChart {...props} ref={legacyRef} />,
  legacyAIObjectRef: <AIEventDropChart {...props} ref={legacyRef} />,
  legacyPhysicsCallback: <EventDropChart {...props} ref={legacyCallback} />,
  legacyAICallback: <AIEventDropChart {...props} ref={legacyCallback} />,
  forwardedRef: <ForwardedEventDrop {...props} ref={legacyRef} />,
  inferredPhysicsRef: <EventDropChart {...props} ref={physicsRef} />,
  inferredAIRef: <AIEventDropChart {...props} ref={aiRef} />,
  livePhysics: (
    <EventDropChart
      live
      frameProps={{ config: { timeScale: 2, emitters: false } }}
      ref={(handle) => {
        handle?.getLedger()
        handle?.setTimeScale(1)
        // @ts-expect-error Callback inference must not collapse to any.
        handle?.unknownHandleMethod()
      }}
    />
  ),
  liveAI: (
    <AIEventDropChart
      live
      frameProps={{ config: { timeScale: 2, emitters: false } }}
      ref={(handle) => {
        handle?.getLedger()
        handle?.setTimeScale(1)
        // @ts-expect-error Callback inference must not collapse to any.
        handle?.unknownHandleMethod()
      }}
    />
  )
}
