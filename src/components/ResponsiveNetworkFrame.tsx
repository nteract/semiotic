"use client"
import NetworkFrame from "./NetworkFrame"
import createResponsiveFrame from "./ResponsiveFrame"
import { ResponsiveFrameProps } from "./ResponsiveFrame"
import { NetworkFrameProps } from "./types/networkTypes"

export const ResponsiveNetworkFrame =
	/*#__PURE__*/ createResponsiveFrame(NetworkFrame) as
	<TNode = Record<string, any>, TEdge = Record<string, any>>(props: ResponsiveFrameProps & NetworkFrameProps<TNode, TEdge>) => JSX.Element
