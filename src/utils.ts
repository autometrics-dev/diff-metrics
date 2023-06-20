import {AmFunction} from './am_list'

function toSet(fnList: AmFunction[]): Set<string> {
  const ret = new Set<string>()
  for (const fn of fnList) {
    ret.add(JSON.stringify(fn))
  }
  return ret
}

// Returns what's in A but not in B
export function difference(
  listA: AmFunction[],
  listB: AmFunction[]
): AmFunction[] {
  const setA = toSet(listA)
  const setB = toSet(listB)
  const _difference = new Set(setA)
  for (const elem of setB) {
    _difference.delete(elem)
  }
  const ret: AmFunction[] = []
  for (const fn of _difference.values()) {
    ret.push(JSON.parse(fn))
  }
  return ret
}

// Returns what's in A and in B
export function intersection(
  listA: AmFunction[],
  listB: AmFunction[]
): AmFunction[] {
  const setA = toSet(listA)
  const setB = toSet(listB)
  const intersect = new Set([...setA].filter(fn => setB.has(fn)))
  const ret: AmFunction[] = []
  for (const fn of intersect.values()) {
    ret.push(JSON.parse(fn))
  }
  return ret
}

// Format a ratio between 0 and 1 to a percentage with 2 decimal digits. addSign can
// force the '+' sign on positive values, helpful to format changes/deltas
export function formatRatioAsPercentage(
  num: number,
  addSign?: boolean
): string {
  const perc = (100.0 * num).toFixed(2)
  if (addSign && num > 0) {
    return `+${perc.toString()}`
  } else {
    return perc.toString()
  }
}
