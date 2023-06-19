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
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    other_functions: []
  }
  const base_set: DataSet = {autometricized_functions: [], other_functions: []}
  const expected: DataSetDiff = {
    new_functions_autometricized: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    new_functions_not_am: [],
    existing_newly_autometricized: [],
    existing_no_longer_autometricized: [],
    coverage_ratio_diff: undefined,
    deleted_functions: []
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between datasets with head empty', async () => {
  const base_set: DataSet = {
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    other_functions: []
  }
  const head_set: DataSet = {autometricized_functions: [], other_functions: []}
  const expected: DataSetDiff = {
    deleted_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    new_functions_autometricized: [],
    new_functions_not_am: [],
    existing_newly_autometricized: [],
    existing_no_longer_autometricized: [],
    coverage_ratio_diff: undefined
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between diverse non-empty datasets', async () => {
  const base_set: DataSet = {
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    other_functions: []
  }
  const head_set: DataSet = {
    autometricized_functions: [
      {module: 'db::postgres', function: 'remove_user'},
      {module: 'main', function: 'main'}
    ],
    other_functions: []
  }
  const expected: DataSetDiff = {
    deleted_functions: [{module: 'main::db', function: 'add_user'}],
    new_functions_autometricized: [
      {module: 'db::postgres', function: 'remove_user'}
    ],
    new_functions_not_am: [],
    existing_newly_autometricized: [],
    existing_no_longer_autometricized: [],
    coverage_ratio_diff: 0.0
  }

  expect(diffDataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes a diff map in the same root', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      other_functions: []
    }
  }
  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'db::postgres', function: 'remove_user'},
        {module: 'main', function: 'main'}
      ],
      other_functions: []
    }
  }
  const expected: DataSetDiffMap = {
    '.': {
      deleted_functions: [{module: 'main::db', function: 'add_user'}],
      new_functions_autometricized: [
        {module: 'db::postgres', function: 'remove_user'}
      ],
      new_functions_not_am: [],
      existing_newly_autometricized: [],
      existing_no_longer_autometricized: [],
      coverage_ratio_diff: 0.0
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root removed', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [{module: 'main', function: 'main'}],
      other_functions: []
    },
    db: {
      autometricized_functions: [{module: 'main', function: 'add_user'}],
      other_functions: []
    }
  }

  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      other_functions: []
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      deleted_functions: [],
      new_functions_autometricized: [
        {module: 'main::db', function: 'add_user'}
      ],
      new_functions_not_am: [],
      existing_newly_autometricized: [],
      existing_no_longer_autometricized: [],
      coverage_ratio_diff: 0.0
    },
    db: {
      deleted_functions: [{module: 'main', function: 'add_user'}],
      new_functions_autometricized: [],
      new_functions_not_am: [],
      existing_newly_autometricized: [],
      existing_no_longer_autometricized: [],
      coverage_ratio_diff: undefined
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root added', async () => {
  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [{module: 'main', function: 'main'}],
      other_functions: []
    },
    db: {
      autometricized_functions: [{module: 'main', function: 'add_user'}],
      other_functions: []
    }
  }

  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ],
      other_functions: []
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      deleted_functions: [{module: 'main::db', function: 'add_user'}],
      new_functions_autometricized: [],
      new_functions_not_am: [],
      existing_newly_autometricized: [],
      existing_no_longer_autometricized: [],
      coverage_ratio_diff: 0.0
    },
    db: {
      new_functions_autometricized: [{module: 'main', function: 'add_user'}],
      deleted_functions: [],
      new_functions_not_am: [],
      existing_newly_autometricized: [],
      existing_no_longer_autometricized: [],
      coverage_ratio_diff: undefined
    }
  }

  expect(diffDatasetMaps(head_set_map, base_set_map)).toStrictEqual(expected)
})

// TODO(gagbo): add more tests with variations of coverages and with some other_functions filled to test more cases.
// This should probably only be done once there is confidence that the format will not change though, because migrating
// typescript tests eats a lot of development time when the data format (the exported DataSet-related types) isn't fixed
