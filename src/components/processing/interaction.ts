import { CustomHoverType } from "../types/annotationTypes"

const constructDataObject = (d?: { data?: object[]; type?: string }, points?: Object[]) => {
    if (d === undefined) return d
    return d && d.data ? { points, ...d.data, ...d } : { points, ...d }
}

export const changeVoronoi = (
    d?: { type?: string; data?: object[] },
    customHoverTypes?: CustomHoverType,
    customHoverBehavior?, voronoiHover?, points?
) => {
    //Until semiotic 2
    const dataObject = constructDataObject(d, points)
    if (customHoverBehavior) customHoverBehavior(dataObject)

    if (!d) voronoiHover(null)
    else if (customHoverTypes === true) {
        const vorD = Object.assign({}, dataObject)
        vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover"
        voronoiHover(vorD)
    } else if (customHoverTypes) {
        const arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
            ? customHoverTypes
            : [customHoverTypes]
        const mappedHoverTypes = arrayWrappedHoverTypes
            .map(c => {
                const finalC = typeof c === "function" ? c(dataObject) : c
                if (!finalC) return undefined
                return Object.assign({}, dataObject, finalC)
            })
            .filter(d => d)

        voronoiHover(mappedHoverTypes)
    }
}

export const clickVoronoi = (d: Object, customClickBehavior, points) => {
    //Until semiotic 2
    const dataObject = constructDataObject(d, points)

    if (customClickBehavior)
        customClickBehavior(dataObject)
}
export const doubleclickVoronoi = (d: Object, customDoubleClickBehavior, points) => {
    //Until semiotic 2
    const dataObject = constructDataObject(d, points)

    if (customDoubleClickBehavior)
        customDoubleClickBehavior(dataObject)
}

export const brushStart = (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?) => {
    if (interaction && interaction.start)
        interaction.start(e, columnName, data, columnData)
}

export const brushing = (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?) => {
    if (interaction && interaction.during)
        interaction.during(e, columnName, data, columnData)
}

export const brushEnd = (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?) => {
    if (interaction && interaction.end)
        interaction.end(e, columnName, data, columnData)
}
