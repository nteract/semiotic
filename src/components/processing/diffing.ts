const simpleTypeDistill = typeProp => {
    if (typeProp && typeProp.type) {
        return typeProp.type
    }
    return typeProp
}

export const basicPropDiffing = (previousProp, nextProp) => {
    return simpleTypeDistill(previousProp) !== simpleTypeDistill(nextProp)
}

export const basicDataChangeCheck = (prevData, newData) => {
    return prevData !== newData ||
        (Array.isArray(prevData) &&
            Array.isArray(newData) &&
            !!prevData.find(p => newData.indexOf(p) === -1))
}
