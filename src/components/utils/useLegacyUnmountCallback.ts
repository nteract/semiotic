import { useEffect, useRef } from "react"

// to properly replicate behavior of componentWillUnmount, the effect must not have dependencies
// which is why we need to store latest props and state values in ref that can be accessible during unmount
// TODO get rid of the behavior and props.onUnmount
export function useLegacyUnmountCallback(props: any, state: any) {
  let ref = useRef<[any, any]>()
  ref.current = [props, state]
  useEffect(() => {
    return () => {
      const [props, state] = ref.current
      const onUnmount = props.onUnmount
      if (onUnmount) {
        onUnmount(props, state)
      }
    }
  }, [])
}
