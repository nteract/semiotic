import { useEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

export function useScrollRestoration() {
  const type = useNavigationType()
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    const pathChanged = previousPathname.current !== pathname
    previousPathname.current = pathname
    if (pathChanged && (type === "PUSH" || type === "REPLACE")) {
      window.scrollTo(0, 0)
    }
  }, [pathname, type])
}
