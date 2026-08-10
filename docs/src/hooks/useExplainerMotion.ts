import { useCallback, useState } from "react"
import { useReducedMotion } from "semiotic/utils"

export interface ExplainerMotionState {
  /** Whether the operating system requests reduced motion. */
  systemReducedMotion: boolean
  /** Whether the reader explicitly stopped motion on this page. */
  readerReducedMotion: boolean
  /** Effective motion state after combining system and reader preferences. */
  reducedMotion: boolean
  /** Toggle the page-local reader preference. */
  toggleReaderReducedMotion: () => void
}

/** Shared motion policy for long-form interactive documentation examples. */
export default function useExplainerMotion(): ExplainerMotionState {
  const systemReducedMotion = useReducedMotion()
  const [readerReducedMotion, setReaderReducedMotion] = useState(false)
  const toggleReaderReducedMotion = useCallback(() => {
    setReaderReducedMotion((current) => !current)
  }, [])

  return {
    systemReducedMotion,
    readerReducedMotion,
    reducedMotion: systemReducedMotion || readerReducedMotion,
    toggleReaderReducedMotion,
  }
}
