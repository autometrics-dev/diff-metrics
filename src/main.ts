import * as core from '@actions/core'
import * as github from '@actions/github'
import {DataSetMap, computeDataSet, downloadAmList} from './am_list'
import {diffDatasetMaps} from './diff_data'
import {updateOrPostComment} from './comment_pr'
import {storeDataSetDiffMap, storeDataSetMap} from './artifact'
import {checkoutBaseState} from './gitops'

const TOKEN = 'gh-token'
const TS_ROOTS = 'ts-roots'
const RS_ROOTS = 'rust-roots'
const RETENTION = 'retention-days'
const AM_LIST_VERSION = 'v0.2.0'

async function run(): Promise<void> {
  try {
    const payload = github.context.payload

    const token = core.getInput(TOKEN)
    const octokit = github.getOctokit(token, {
      userAgent: 'Autometrics/diff-metrics v1'
    })
    const ts_roots = core.getMultilineInput(TS_ROOTS)
    const rs_roots = core.getMultilineInput(RS_ROOTS)
    const retention = parseInt(core.getInput(RETENTION))

    core.startGroup(`Downloading am_list ${AM_LIST_VERSION}`)
    const am_path = await downloadAmList(octokit, AM_LIST_VERSION)
    core.endGroup()

    core.startGroup('[head] Building datasets for head branch')
    const new_datasets: DataSetMap = {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const ts_root of ts_roots) {
      core.warning('Typescript is not supported by am_list yet.')
    }
    for (const rs_root of rs_roots) {
      new_datasets[rs_root] = await computeDataSet(am_path, rs_root, 'rust')
    }

    core.info(JSON.stringify(new_datasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-after-${payload.after}`,
      new_datasets,
      retention
    )
    core.endGroup()

    // Setting up the base state to compare to.
    const baseSha = await checkoutBaseState(payload)

    core.startGroup('[base] Building datasets for base state')
    const old_datasets: DataSetMap = {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const ts_root of ts_roots) {
      core.warning('Typescript is not supported by am_list yet.')
    }
    for (const rs_root of rs_roots) {
      old_datasets[rs_root] = await computeDataSet(am_path, rs_root, 'rust')
    }

    core.info(JSON.stringify(old_datasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-before-${baseSha}`,
      old_datasets,
      retention
    )
    core.endGroup()

    const dataset_diff = diffDatasetMaps(new_datasets, old_datasets)
    await storeDataSetDiffMap(
      `autometrics-diff-${baseSha}-${payload.after}`,
      dataset_diff,
      retention
    )

    const issueRef = payload.pull_request?.number
    if (!issueRef) {
      core.info('no issue_ref found for this event. Ending.')
      return
    }
    core.startGroup(`Post comment on PR ${issueRef}`)

    await updateOrPostComment(octokit, github.context, {
      old: old_datasets,
      new: new_datasets,
      diff: dataset_diff
    })

    core.endGroup()
  } catch (_e) {
    const e: Error = _e as Error
    core.setFailed(e.message)
  }
}

run()
