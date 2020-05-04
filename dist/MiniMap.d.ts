/// <reference types="react" />
import { XYFrameProps } from "./types/xyTypes";
interface MinimapProps extends XYFrameProps {
    brushStart: Function;
    brush: Function;
    brushEnd: Function;
    xBrushable: boolean;
    yBrushable: boolean;
    yBrushExtent?: number[];
    xBrushExtent?: number[];
    size: number[];
}
declare const MiniMap: (props: MinimapProps) => JSX.Element;
export default MiniMap;
