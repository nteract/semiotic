import { buildRuntimeActions } from "./vacpAdapterActions"
import {
  buildRuntimeModelBase,
  clock,
  createRefs,
} from "./vacpAdapterModel"
import {
  diffStateSnapshots,
  jsonSafe,
  scopeCapabilitiesSnapshot,
  scopeStateSnapshot,
  stateToken,
} from "./vacpAdapterRuntime"
import { buildStateSnapshot } from "./vacpAdapterState"
import type {
  CreateSemioticVACPBridgeOptions,
  InstallSemioticVACPBridgeOptions,
  RuntimeModel,
  SemioticVACPBridge,
  SemioticVACPBridgeInstallation,
  SemioticVACPRefs,
} from "./vacpAdapterTypes"
import {
  VACP_SCHEMA_VERSION,
  type VacpActionCall,
  type VacpActionResult,
  type VacpCapabilitiesRequest,
  type VacpCapabilitiesSnapshot,
  type VacpStateRequest,
  type VacpStateSnapshot,
  type VacpStateUpdate,
} from "./vacpTypes"

export {
  SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
  SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
  SEMIOTIC_VACP_INSPECT_DATA_ACTION,
  SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
  SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
  type CreateSemioticVACPBridgeOptions,
  type InstallSemioticVACPBridgeOptions,
  type SemioticVACPCustomAction,
  type SemioticVACPBridge,
  type SemioticVACPBridgeInstallation,
  type SemioticVACPChart,
  type SemioticVACPDataAccess,
  type SemioticVACPNavigationBinding,
  type SemioticVACPRefs,
  type SemioticVACPSelectionActions,
  type SemioticVACPSelectionBinding,
  type SemioticVACPSelectionMode,
} from "./vacpAdapterTypes"

function runtimeModel(
  options: CreateSemioticVACPBridgeOptions,
  refs: SemioticVACPRefs
): RuntimeModel {
  const base = buildRuntimeModelBase(options, refs)
  return {
    ...base,
    actions: buildRuntimeActions(base, options, refs),
  }
}

/**
 * Create a dependency-free, SSR-safe bridge matching VACP's documented 0.1.0
 * in-page shape. The returned object does not touch `window`; installation is
 * an explicit separate step.
 */
export function createSemioticVACPBridge(
  options: CreateSemioticVACPBridgeOptions
): SemioticVACPBridge {
  const viewId = options.viewId?.trim() || "main"
  const refs = createRefs(options.appId, viewId)
  const cacheLimit =
    typeof options.stateCacheSize === "number" &&
    Number.isFinite(options.stateCacheSize)
      ? Math.max(1, Math.floor(options.stateCacheSize))
      : 64
  const stateCache = new Map<string, VacpStateSnapshot>()

  const cacheSnapshot = (token: string, snapshot: VacpStateSnapshot) => {
    if (stateCache.has(token)) stateCache.delete(token)
    stateCache.set(token, snapshot)
    while (stateCache.size > cacheLimit) {
      const oldest = stateCache.keys().next().value
      if (typeof oldest !== "string") break
      stateCache.delete(oldest)
    }
  }

  const getCapabilities = (
    request?: VacpCapabilitiesRequest
  ): VacpCapabilitiesSnapshot => {
    const model = runtimeModel(options, refs)
    const snapshot: VacpCapabilitiesSnapshot = {
      version: VACP_SCHEMA_VERSION,
      createdAt: clock(options),
      graph: {
        version: VACP_SCHEMA_VERSION,
        nodes: model.nodes,
        edges: model.edges,
        actions: model.actions.map((action) => action.descriptor),
      },
    }
    return request ? scopeCapabilitiesSnapshot(snapshot, request) : snapshot
  }

  function getState(): Promise<VacpStateSnapshot>
  function getState(request: VacpStateRequest): Promise<VacpStateUpdate>
  async function getState(
    request?: VacpStateRequest
  ): Promise<VacpStateSnapshot | VacpStateUpdate> {
    const current = buildStateSnapshot(
      runtimeModel(options, refs),
      options,
      refs
    )
    if (!request) return current
    const { snapshot: scopedCurrent, refs: scopedRefs } = scopeStateSnapshot(
      current,
      request
    )
    const token = stateToken(scopedCurrent)
    const baseline = request.since
      ? stateCache.get(request.since)
      : undefined
    const useDelta =
      request.mode !== "full" && !!request.since && !!baseline

    let update: VacpStateUpdate
    if (useDelta) {
      const scopedBaseline = scopeStateSnapshot(
        baseline as VacpStateSnapshot,
        request
      ).snapshot
      update = {
        version: VACP_SCHEMA_VERSION,
        createdAt: scopedCurrent.createdAt,
        mode: "delta",
        token,
        baseToken: request.since as string,
        ...(scopedRefs ? { scope: { refs: scopedRefs } } : {}),
        delta: diffStateSnapshots(scopedBaseline, scopedCurrent),
      }
    } else {
      update = {
        version: VACP_SCHEMA_VERSION,
        createdAt: scopedCurrent.createdAt,
        mode: "full",
        token,
        ...(scopedRefs ? { scope: { refs: scopedRefs } } : {}),
        snapshot: scopedCurrent,
      }
    }
    cacheSnapshot(token, current)
    return update
  }

  const execute = async (call: VacpActionCall): Promise<VacpActionResult> => {
    const callId =
      call && typeof call.callId === "string" ? call.callId : ""
    try {
      if (!call || typeof call.name !== "string" || !call.name.trim()) {
        throw new Error("VACP action call requires a non-empty name.")
      }
      if (!callId) throw new Error("VACP action call requires a callId.")
      const model = runtimeModel(options, refs)
      const action = model.actions.find(
        (candidate) => candidate.descriptor.name === call.name
      )
      if (!action) {
        return {
          callId,
          ok: false,
          error: {
            message: `Unknown or currently unavailable VACP action "${call.name}".`,
            details: {
              available: model.actions.map(
                (candidate) => candidate.descriptor.name
              ),
            },
          },
        }
      }
      const result = await action.execute(call.params)
      const safeResult = jsonSafe(result)
      return {
        callId,
        ok: true,
        ...(safeResult !== undefined ? { result: safeResult } : {}),
      }
    } catch (error) {
      return {
        callId,
        ok: false,
        error: {
          message:
            error instanceof Error ? error.message : "VACP action failed.",
        },
      }
    }
  }

  return {
    version: VACP_SCHEMA_VERSION,
    refs,
    getCapabilities,
    getState,
    execute,
  }
}

/**
 * Install without clobbering an existing foreign bridge. Cleanup is
 * ownership-safe: it never deletes a value installed by somebody else later.
 */
export function installSemioticVACPBridge(
  bridge: SemioticVACPBridge,
  options: InstallSemioticVACPBridgeOptions = {}
): SemioticVACPBridgeInstallation {
  const globalKey = options.globalKey?.trim() || "__vacp"
  const target =
    options.target ??
    (typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : undefined)
  if (!target) {
    return {
      installed: false,
      globalKey,
      bridge,
      reason:
        `Refused to install "${globalKey}" without a browser window or an explicit target.`,
      cleanup: () => false,
    }
  }
  if (
    globalKey === "__proto__" ||
    globalKey === "prototype" ||
    globalKey === "constructor"
  ) {
    return {
      installed: false,
      globalKey,
      bridge,
      reason: `Refused unsafe global key "${globalKey}".`,
      cleanup: () => false,
    }
  }
  const existing = target[globalKey]
  if (existing !== undefined && existing !== bridge) {
    return {
      installed: false,
      globalKey,
      bridge,
      reason: `Refused to replace existing global "${globalKey}".`,
      cleanup: () => false,
    }
  }

  try {
    target[globalKey] = bridge
  } catch (error) {
    return {
      installed: false,
      globalKey,
      bridge,
      reason:
        error instanceof Error
          ? `Could not install "${globalKey}": ${error.message}`
          : `Could not install "${globalKey}".`,
      cleanup: () => false,
    }
  }
  return {
    installed: true,
    globalKey,
    bridge,
    cleanup: () => {
      if (target[globalKey] !== bridge) return false
      try {
        return delete target[globalKey]
      } catch {
        return false
      }
    },
  }
}
