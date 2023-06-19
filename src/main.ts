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
const AM_VERSION = 'am-version'

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
    const am_version =
      core.getInput(AM_VERSION) !== '' ? core.getInput(AM_VERSION) : undefined

    core.startGroup(`Downloading am_list matching ${am_version ?? 'latest'}`)
    const am_path = await downloadAmList(octokit, am_version)
    core.endGroup()

    core.startGroup('[head] Building datasets for head branch')
    const new_am_datasets: DataSetMap = {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const ts_root of ts_roots) {
      core.warning('Typescript is not supported by am_list yet.')
    }
    for (const rs_root of rs_roots) {
      new_am_datasets[rs_root] = await computeDataSet(am_path, rs_root, 'rust')
    }

    const headSha = payload.pull_request?.head.sha ?? payload.after
    core.info(JSON.stringify(new_am_datasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-after-${headSha}`,
      new_am_datasets,
      retention
    )
    core.endGroup()

    // Setting up the base state to compare to.
    const baseSha = await checkoutBaseState(payload)

    core.startGroup('[base] Building datasets for base state')
    const old_am_datasets: DataSetMap = {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const ts_root of ts_roots) {
      core.warning('Typescript is not supported by am_list yet.')
    }
    for (const rs_root of rs_roots) {
      old_am_datasets[rs_root] = await computeDataSet(am_path, rs_root, 'rust')
    }

    core.info(JSON.stringify(old_am_datasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-before-${baseSha}`,
      old_am_datasets,
      retention
    )
    core.endGroup()

    core.startGroup('Computing and saving the difference between the datasets')
    const dataset_diff = diffDatasetMaps(new_am_datasets, old_am_datasets)
    core.info(JSON.stringify(dataset_diff, undefined, 2))
    await storeDataSetDiffMap(
      `autometrics-diff-${baseSha}-${headSha}`,
      dataset_diff,
      retention
    )
    core.endGroup()

    const issueRef = payload.pull_request?.number
    if (!issueRef) {
      core.info('no issue_ref found for this event. Ending.')
      return
    }
    core.startGroup(`Post comment on PR ${issueRef}`)

    await updateOrPostComment(octokit, github.context, {
      old: old_am_datasets,
      new: new_am_datasets,
      diff: dataset_diff
    })

    core.endGroup()
  } catch (_e) {
    const e: Error = _e as Error
    core.setFailed(e.message)
  }
}

run()
