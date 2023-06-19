// This handles comparing DataSets, and producing the data model that is going
// to be exposed as a PR commet

import {AmFunction, DataSet, DataSetMap} from './am_list'
import {difference, intersection} from './utils'

export type DataSetDiff = {
  existing_newly_autometricized: AmFunction[]
  existing_no_longer_autometricized: AmFunction[]
  deleted_functions: AmFunction[]
  new_functions_autometricized: AmFunction[]
  new_functions_not_am: AmFunction[]
  coverage_ratio_diff?: number
}

export type DataSetDiffMap = {
  [root: string]: DataSetDiff
}

export function diffDatasetMaps(
  head_map: DataSetMap,
  base_map: DataSetMap
): DataSetDiffMap {
  const ret: DataSetDiffMap = {}
  for (const [head_root, head_set] of Object.entries(head_map)) {
    ret[head_root] = diffDataset(
      head_set,
      base_map[head_root] ?? {autometricized_functions: [], other_functions: []}
    )
  }

  for (const [base_root, base_set] of Object.entries(base_map)) {
    if (head_map[base_root]) {
      continue
    }
    ret[base_root] = diffDataset(
      {autometricized_functions: [], other_functions: []},
      base_set
    )
  }

  return ret
}

export function diffDataset(head_set: DataSet, base_set: DataSet): DataSetDiff {
  const all_new_functions = [
    ...head_set.autometricized_functions,
    ...head_set.other_functions
  ]
  const all_old_functions = [
    ...base_set.autometricized_functions,
    ...base_set.other_functions
  ]

  const all_added_functions = difference(all_new_functions, all_old_functions)
  const deleted_functions = difference(all_old_functions, all_new_functions)

  const new_functions_autometricized = intersection(
    all_added_functions,
    head_set.autometricized_functions
  )
  const new_functions_not_am = intersection(
    all_added_functions,
    head_set.other_functions
  )

  const existing_newly_autometricized = intersection(
    base_set.other_functions,
    head_set.autometricized_functions
  )
  const existing_no_longer_autometricized = intersection(
    head_set.other_functions,
    base_set.autometricized_functions
  )

  const new_coverage_ratio =
    head_set.autometricized_functions.length / all_new_functions.length
  const old_coverage_ratio =
    base_set.autometricized_functions.length / all_old_functions.length

  const coverage_ratio_diff = isNaN(new_coverage_ratio - old_coverage_ratio)
    ? undefined
    : new_coverage_ratio - old_coverage_ratio

  return {
    existing_newly_autometricized,
    existing_no_longer_autometricized,
    deleted_functions,
    new_functions_autometricized,
    new_functions_not_am,
    coverage_ratio_diff
  }
}
