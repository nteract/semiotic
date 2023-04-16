import { useRef, useMemo } from "react"

// this hooks should only be used for transitioning from class to function components
// this hooks is supposed to replicate behavior of getDerivedStateFromProps
// and some assumptions related to it:
// 1. initial state, defined in "constructor" should not trigger additional computation
// 2. the computation function can opt-out if it thinks that nothing has changed, so the existing state should be used
//
// ideally, the state must be refactored to be function component friendly, so this hooks should become irrelevant
export function useDerivedStateFromProps<Props, State>(
  fn: (nextProps: Props, prevState: State) => Partial<State> | null,
  props: Props,
  initialState: State
): State {
  let prevRef = useRef(initialState)
  let state = useMemo(() => {
    let state = prevRef.current
    let patch = fn(props, state)
    if (patch != null) {
      return { ...state, ...patch }
    }
    return state
  }, [props])
  prevRef.current = state
  return state
}
