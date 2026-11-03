import { expect, expectTypeOf, it, vi } from "vitest"
import type { HoverData } from "../../realtime/types"
import type { SemanticClickBehavior, SemanticHoverBehavior } from "./semanticInteractions"
import { buildCustomBehaviorProps } from "./streamPropsHelpers"

it("preserves frame datum types and semantic context through chart behavior props", () => {
  const hover = vi.fn<SemanticHoverBehavior<HoverData>>()
  const click = vi.fn<SemanticClickBehavior<HoverData>>()
  const props = buildCustomBehaviorProps({
    forceHoverBehavior: true,
    forceClickBehavior: true,
    customHoverBehavior: hover,
    customClickBehavior: click,
  })
  expectTypeOf(props.customHoverBehavior).toEqualTypeOf<SemanticHoverBehavior<HoverData> | undefined>()
  expectTypeOf(props.customClickBehavior).toEqualTypeOf<SemanticClickBehavior<HoverData> | undefined>()

  const datum: HoverData = { data: { value: 12 }, x: 30, y: 40 }
  props.customHoverBehavior!(datum, { type: "focus", inputType: "keyboard" })
  props.customClickBehavior!(datum, { type: "activate", inputType: "touch" })
  expect(hover).toHaveBeenCalledExactlyOnceWith(datum, { type: "focus", inputType: "keyboard" })
  expect(click).toHaveBeenCalledExactlyOnceWith(datum, { type: "activate", inputType: "touch" })
  expect(props.customHoverBehavior).toBe(hover)
  expect(props.customClickBehavior).toBe(click)
})
