export const findFirstAccessorValue = (accessorArray, data) => {
  for (let i = 0; i < accessorArray.length; i++) {
    console.log(
      " accessorArray[i](data)",
      accessorArray[i],
      accessorArray[i](data)
    )
    console.log("data", data)
    const valueCheck = accessorArray[i](data)
    console.log("valueCheck", valueCheck, !isNaN(valueCheck))
    if (
      valueCheck !== undefined &&
      !Number.isNaN(valueCheck) &&
      valueCheck !== null
    )
      return valueCheck
  }

  return undefined
}
