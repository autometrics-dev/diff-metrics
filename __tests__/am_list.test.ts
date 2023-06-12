import {downloadAmList} from '../src/am_list'
import {expect, test} from '@jest/globals'
import * as fs from 'fs'
import * as github from '@actions/github'

// This test token needs to be valid even if the code eventually doesn't use any authentificated endpoint, because:
// - the github.getOctokit constructor won't accept no auth, and
// - building a raw Octokit does not typecheck with download_am_list
//   (ref: https://github.com/actions/toolkit/issues/1419)
// This token has only public repos access, and no impersonation authorization.
// This token is valid only until 2024-06-07.
const READ_ONLY_TEST_TOKEN =
  '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'

test('downloads the linux version of am_list', async () => {
  const octokit = github.getOctokit(READ_ONLY_TEST_TOKEN, {
    userAgent: 'autometrics-dev/diff-metrics-test'
  })
  const path = await downloadAmList(octokit, 'v0.2.0')
  expect(() =>
    fs.accessSync(path, fs.constants.R_OK | fs.constants.X_OK)
  ).not.toThrow()
})
