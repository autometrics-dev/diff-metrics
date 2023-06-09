import {expect, test} from '@jest/globals'
import {DataSet, DataSetMap} from '../src/am_list'
import {
  diff_dataset,
  DataSetDiff,
  DataSetDiffMap,
  diff_dataset_maps
} from '../src/diff_data'

test('computes the differences between datasets with base empty', async () => {
  const head_set: DataSet = {
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ]
  }
  const base_set: DataSet = {autometricized_functions: []}
  const expected: DataSetDiff = {
    newly_autometricized: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    no_longer_autometricized: []
  }

  expect(diff_dataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between datasets with head empty', async () => {
  const base_set: DataSet = {
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ]
  }
  const head_set: DataSet = {autometricized_functions: []}
  const expected: DataSetDiff = {
    no_longer_autometricized: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ],
    newly_autometricized: []
  }

  expect(diff_dataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes the differences between diverse non-empty datasets', async () => {
  const base_set: DataSet = {
    autometricized_functions: [
      {module: 'main', function: 'main'},
      {module: 'main::db', function: 'add_user'}
    ]
  }
  const head_set: DataSet = {
    autometricized_functions: [
      {module: 'db::postgres', function: 'remove_user'},
      {module: 'main', function: 'main'}
    ]
  }
  const expected: DataSetDiff = {
    no_longer_autometricized: [{module: 'main::db', function: 'add_user'}],
    newly_autometricized: [{module: 'db::postgres', function: 'remove_user'}]
  }

  expect(diff_dataset(head_set, base_set)).toStrictEqual(expected)
})

test('computes a diff map in the same root', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ]
    }
  }
  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'db::postgres', function: 'remove_user'},
        {module: 'main', function: 'main'}
      ]
    }
  }
  const expected: DataSetDiffMap = {
    '.': {
      no_longer_autometricized: [{module: 'main::db', function: 'add_user'}],
      newly_autometricized: [{module: 'db::postgres', function: 'remove_user'}]
    }
  }

  expect(diff_dataset_maps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root removed', async () => {
  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [{module: 'main', function: 'main'}]
    },
    db: {
      autometricized_functions: [{module: 'main', function: 'add_user'}]
    }
  }

  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ]
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      no_longer_autometricized: [],
      newly_autometricized: [{module: 'main::db', function: 'add_user'}]
    },
    db: {
      no_longer_autometricized: [{module: 'main', function: 'add_user'}],
      newly_autometricized: []
    }
  }

  expect(diff_dataset_maps(head_set_map, base_set_map)).toStrictEqual(expected)
})

test('computes a diff map with a root added', async () => {
  const head_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [{module: 'main', function: 'main'}]
    },
    db: {
      autometricized_functions: [{module: 'main', function: 'add_user'}]
    }
  }

  const base_set_map: DataSetMap = {
    '.': {
      autometricized_functions: [
        {module: 'main', function: 'main'},
        {module: 'main::db', function: 'add_user'}
      ]
    }
  }

  const expected: DataSetDiffMap = {
    '.': {
      newly_autometricized: [],
      no_longer_autometricized: [{module: 'main::db', function: 'add_user'}]
    },
    db: {
      newly_autometricized: [{module: 'main', function: 'add_user'}],
      no_longer_autometricized: []
    }
  }

  expect(diff_dataset_maps(head_set_map, base_set_map)).toStrictEqual(expected)
})
