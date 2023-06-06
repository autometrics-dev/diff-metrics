// This handles comparing DataSets, and producing the data model that is going
// to be exposed as a PR commet

import {AmFunction} from './am_list'

export type DataSetDiff = {
  newly_autometricized: AmFunction[]
  no_longer_autometricized: AmFunction[]
}
