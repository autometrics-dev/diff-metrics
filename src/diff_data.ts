// This handles comparing DataSets, and producing the data model that is going
// to be exposed as a PR commet

import {AmFunction, DataSet, DataSetMap} from './am_list'

export type DataSetDiff = {
  newly_autometricized: AmFunction[]
  no_longer_autometricized: AmFunction[]
}

export type DataSetDiffMap = {
  [root: string]: DataSetDiff
}

export function diff_dataset_maps(
  head_map: DataSetMap,
  base_map: DataSetMap
): DataSetDiffMap {
  const ret: DataSetDiffMap = {}
  for (const [head_root, head_set] of Object.entries(head_map)) {
    ret[head_root] = diff_dataset(
      head_set,
      base_map[head_root] ?? {autometricized_functions: []}
    )
  }

  for (const [base_root, base_set] of Object.entries(base_map)) {
    if (base_root in Object.keys(head_map)) {
      continue
    }
    ret[base_root] = diff_dataset({autometricized_functions: []}, base_set)
  }

  return ret
}

function diff_dataset(head_set: DataSet, base_set: DataSet): DataSetDiff {
  const head = to_set(head_set)
  const base = to_set(base_set)
  return {
    newly_autometricized: difference(head, base),
    no_longer_autometricized: difference(base, head)
  }
}

function to_set(dataset: DataSet): Set<AmFunction> {
  const ret = new Set<AmFunction>()
  for (const fn of dataset.autometricized_functions) {
    ret.add(fn)
  }
  return ret
}

// Returns what's in A but not in B
function difference<T>(setA: Set<T>, setB: Set<T>): T[] {
  const _difference = new Set(setA)
  for (const elem of setB) {
    _difference.delete(elem)
  }
  return Array.from(_difference.values())
}
