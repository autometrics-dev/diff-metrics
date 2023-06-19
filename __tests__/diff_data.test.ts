import {expect, test} from '@jest/globals'
import {DataSet, DataSetMap} from '../src/am_list'
import {
  diffDataset,
  DataSetDiff,
  DataSetDiffMap,
  diffDatasetMaps
} from '../src/diff_data'
import {existsSync} from 'fs'

test('computes the differences between datasets with base empty', async () => {
  const head_set: DataSet = {
    autometricizedFunctions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    otherFunctions: []
  }
  const base_set: DataSet = {autometricizedFunctions: [], otherFunctions: []}
  const expected: DataSetDiff = {
    newFunctionsAutometricized: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    newFunctionsNotAm: [],
    existingNewlyAutometricized: [],
    existingNoLongerAutometricized: [],
    coverageRatioDiff: undefined,
    deletedFunctions: []
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between datasets with head empty', async () => {
  const base_set: DataSet = {
    autometricizedFunctions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    otherFunctions: []
  }
  const head_set: DataSet = {autometricizedFunctions: [], otherFunctions: []}
  const expected: DataSetDiff = {
    deletedFunctions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    newFunctionsAutometricized: [],
    newFunctionsNotAm: [],
    existingNewlyAutometricized: [],
    existingNoLongerAutometricized: [],
    coverageRatioDiff: undefined
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between diverse non-empty datasets', async () => {
  const base_set: DataSet = {
    autometricizedFunctions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    otherFunctions: []
  }
  const head_set: DataSet = {
    autometricizedFunctions: [
      {module: 'db::postgres', function: 'remove_user'},
      {module: 'main', function: 'main'}
    ],
    otherFunctions: []
  }
  const expected: DataSetDiff = {
    deletedFunctions: [{module: 'main::db', function: 'add_user'}],
    newFunctionsAutometricized: [
      {module: 'db::postgres', function: 'remove_user'}
    ],
    newFunctionsNotAm: [],
    existingNewlyAutometricized: [],
    existingNoLongerAutometricized: [],
    coverageRatioDiff: 0.0
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes a diff map in the same root', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      otherFunctions: []
    }
  }
  const head_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [
        {module: 'db::postgres', function: 'remove_user'},
        {module: 'main', function: 'main'}
      ],
      otherFunctions: []
    }
  }
  const expected: DataSetDiffMap = {
    '.': {
      deletedFunctions: [{module: 'main::db', function: 'add_user'}],
      newFunctionsAutometricized: [
        {module: 'db::postgres', function: 'remove_user'}
      ],
      newFunctionsNotAm: [],
      existingNewlyAutometricized: [],
      existingNoLongerAutometricized: [],
      coverageRatioDiff: 0.0
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root removed', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [{module: 'main', function: 'main'}],
      otherFunctions: []
    },
    db: {
      autometricizedFunctions: [{module: 'main', function: 'add_user'}],
      otherFunctions: []
    }
  }

  const head_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      otherFunctions: []
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      deletedFunctions: [],
      newFunctionsAutometricized: [{module: 'main::db', function: 'add_user'}],
      newFunctionsNotAm: [],
      existingNewlyAutometricized: [],
      existingNoLongerAutometricized: [],
      coverageRatioDiff: 0.0
    },
    db: {
      deletedFunctions: [{module: 'main', function: 'add_user'}],
      newFunctionsAutometricized: [],
      newFunctionsNotAm: [],
      existingNewlyAutometricized: [],
      existingNoLongerAutometricized: [],
      coverageRatioDiff: undefined
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root added', async () => {
  const head_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [{module: 'main', function: 'main'}],
      otherFunctions: []
    },
    db: {
      autometricizedFunctions: [{module: 'main', function: 'add_user'}],
      otherFunctions: []
    }
  }

  const base_set_map: DataSetMap = {
    '.': {
      autometricizedFunctions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      otherFunctions: []
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      deletedFunctions: [{module: 'main::db', function: 'add_user'}],
      newFunctionsAutometricized: [],
      newFunctionsNotAm: [],
      existingNewlyAutometricized: [],
      existingNoLongerAutometricized: [],
      coverageRatioDiff: 0.0
    },
    db: {
      newFunctionsAutometricized: [{module: 'main', function: 'add_user'}],
      deletedFunctions: [],
      newFunctionsNotAm: [],
      existingNewlyAutometricized: [],
      existingNoLongerAutometricized: [],
      coverageRatioDiff: undefined
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

// TODO(gagbo): add more tests with variations of coverages and with some other_functions filled to test more cases.
// This should probably only be done once there is confidence that the format will not change though, because migrating
// typescript tests eats a lot of development time when the data format (the exported DataSet-related types) isn't fixed
