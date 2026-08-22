import { installVitePreloadRecovery, renderEntryLoadFallback } from "../src/preloadRecovery"

installVitePreloadRecovery()
import("../src/index.jsx").catch(() => renderEntryLoadFallback())
