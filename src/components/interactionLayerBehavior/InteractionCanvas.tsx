import * as React from "react"
import { canvasEvent } from "../svg/frameFunctions"

type InteractionCanvasProps = {
    height: number,
    width: number,
    overlayRegions: any,
    margin: any,
    voronoiHover: Function
}

type InteractionCanvasState = {
    ref: any,
    interactionContext: any,
    overlayRegions: any,
    margin: any
}

class InteractionCanvas extends React.Component<InteractionCanvasProps, InteractionCanvasState> {
    constructor(props: InteractionCanvasProps) {
        super(props)

        const {
            overlayRegions,
            margin } = props

        this.state = {
            ref: null,
            interactionContext: null,
            overlayRegions,
            margin
        }
    }

    canvasMap: Map<string, number> = new Map()

    componentDidMount() {
        this.canvasRendering()
    }

    componentDidUpdate(prevProps: InteractionCanvasProps, prevState: InteractionCanvasState) {
        if (this.state.overlayRegions !== prevState.overlayRegions) {
            this.canvasRendering()
        }
    }


    canvasRendering = () => {

        const canvasMap = this.canvasMap
        const { overlayRegions, interactionContext } = this.state
        if (interactionContext === null || !overlayRegions) return

        const { height, width } = this.props
        const { margin } = this.state

        canvasMap.clear()

        const interactionContext2D = interactionContext.getContext("2d")

        interactionContext2D.imageSmoothingEnabled = false
        interactionContext2D.setTransform(1, 0, 0, 1, margin.left, margin.top)
        interactionContext2D.clearRect(
            -margin.left,
            -margin.top,
            width,
            height
        )

        interactionContext2D.lineWidth = 1

        overlayRegions.forEach((overlay, oi) => {
            const interactionRGBA = `rgba(${Math.floor(
                Math.random() * 255
            )},${Math.floor(Math.random() * 255)},${Math.floor(
                Math.random() * 255
            )},255)`

            canvasMap.set(interactionRGBA, oi)

            interactionContext2D.fillStyle = interactionRGBA
            interactionContext2D.strokeStyle = interactionRGBA

            const p = new Path2D(overlay.props.d)
            interactionContext2D.stroke(p)
            interactionContext2D.fill(p)
        })
    }


    render() {
        const { width, height, voronoiHover } = this.props
        const { overlayRegions } = this.state


        return <canvas
            className="frame-canvas-interaction"
            ref={(canvasContext: any) => {
                const boundCanvasEvent = canvasEvent.bind(
                    null,
                    canvasContext,
                    overlayRegions,
                    this.canvasMap
                )
                if (canvasContext) {
                    canvasContext.onmousemove = e => {
                        const overlay = boundCanvasEvent(e)
                        if (overlay && overlay.props) {
                            overlay.props.onMouseEnter()
                        } else {
                            voronoiHover(null)
                        }
                    }
                    canvasContext.onclick = e => {
                        const overlay = boundCanvasEvent(e)
                        if (overlay && overlay.props) {
                            overlay.props.onClick()
                        }
                    }
                    canvasContext.ondblclick = e => {
                        const overlay = boundCanvasEvent(e)
                        if (overlay && overlay.props) {
                            overlay.props.onDoubleClick()
                        }
                    }
                }
                this.setState({ interactionContext: canvasContext })
            }}
            style={{
                position: "absolute",
                left: `0px`,
                top: `0px`,
                imageRendering: "pixelated",
                pointerEvents: "all",
                opacity: 0
            }}
            width={width}
            height={height}
        />
    }
}

export default InteractionCanvas