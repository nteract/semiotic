export const findFirstAccessorValue = (accessorArray, data) => {
  for (let i = 0; i < accessorArray.length; i++) {
    const valueCheck = accessorArray[i](data)
    if (valueCheck !== undefined && !isNaN(valueCheck) && valueCheck !== null)
      return valueCheck
  }

  return 0
}
