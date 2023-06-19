// This handles comparing DataSets, and producing the data model that is going
// to be exposed as a PR commet

import {AmFunction, DataSet, DataSetMap} from './am_list'
import {difference, intersection} from './utils'

export type DataSetDiff = {
  existingNewlyAutometricized: AmFunction[]
  existingNoLongerAutometricized: AmFunction[]
  deletedFunctions: AmFunction[]
  newFunctionsAutometricized: AmFunction[]
  newFunctionsNotAm: AmFunction[]
  coverageRatioDiff?: number
}

export type DataSetDiffMap = {
  [root: string]: DataSetDiff
}

export function diffDatasetMaps(
  headMap: DataSetMap,
  baseMap: DataSetMap
): DataSetDiffMap {
  const ret: DataSetDiffMap = {}
  for (const [headRoot, headSet] of Object.entries(headMap)) {
    ret[headRoot] = diffDataset(
      headSet,
      baseMap[headRoot] ?? {autometricizedFunctions: [], otherFunctions: []}
    )
  }

  for (const [baseRoot, baseSet] of Object.entries(baseMap)) {
    if (headMap[baseRoot]) {
      continue
    }
    ret[baseRoot] = diffDataset(
      {autometricizedFunctions: [], otherFunctions: []},
      baseSet
    )
  }

  return ret
}

export function diffDataset(headSet: DataSet, baseSet: DataSet): DataSetDiff {
  const allNewFunctions = [
    ...headSet.autometricizedFunctions,
    ...headSet.otherFunctions
  ]
  const allOldFunctions = [
    ...baseSet.autometricizedFunctions,
    ...baseSet.otherFunctions
  ]

  const allAddedFunctions = difference(allNewFunctions, allOldFunctions)
  const deletedFunctions = difference(allOldFunctions, allNewFunctions)

  const newFunctionsAutometricized = intersection(
    allAddedFunctions,
    headSet.autometricizedFunctions
  )
  const newFunctionsNotAm = intersection(
    allAddedFunctions,
    headSet.otherFunctions
  )

  const existingNewlyAutometricized = intersection(
    baseSet.otherFunctions,
    headSet.autometricizedFunctions
  )
  const existingNoLongerAutometricized = intersection(
    headSet.otherFunctions,
    baseSet.autometricizedFunctions
  )

  const newCoverageRatio =
    headSet.autometricizedFunctions.length / allNewFunctions.length
  const oldCoverageRatio =
    baseSet.autometricizedFunctions.length / allOldFunctions.length

  const coverageRatioDiff = isNaN(newCoverageRatio - oldCoverageRatio)
    ? undefined
    : newCoverageRatio - oldCoverageRatio

  return {
    existingNewlyAutometricized,
    existingNoLongerAutometricized,
    deletedFunctions,
    newFunctionsAutometricized,
    newFunctionsNotAm,
    coverageRatioDiff
  }
}
