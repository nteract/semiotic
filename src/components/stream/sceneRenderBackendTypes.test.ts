import { expectTypeOf, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import type { LineSceneNode, RectSceneNode, SceneRenderMode } from "./types"

type Selector<Node> = Extract<SceneRenderMode<Node>, (...args: never[]) => unknown>

it("derives selector datum types from the scene node", () => {
  expectTypeOf<Parameters<Selector<RectSceneNode>>[0]>().toEqualTypeOf<Datum | null>()
  expectTypeOf<Parameters<Selector<LineSceneNode>>[0]>().toEqualTypeOf<Datum[] | null>()
})
