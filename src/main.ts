import * as core from '@actions/core'
import * as github from '@actions/github'
import {DataSetMap, computeDataSet, downloadAmList} from './am_list'
import {diffDatasetMaps} from './diff_data'
import {updateOrPostComment} from './comment_pr'
import {storeDataSetDiffMap, storeDataSetMap} from './artifact'
import {checkoutBaseState} from './gitops'

const TOKEN = 'gh-token'
const TS_ROOTS = 'ts-roots'
const RS_ROOTS = 'rs-roots'
const GO_ROOTS = 'go-roots'
const PY_ROOTS = 'py-roots'
const RETENTION = 'retention-days'
const AM_VERSION = 'am-version'

async function run(): Promise<void> {
  try {
    const payload = github.context.payload

    const token = core.getInput(TOKEN)
    const octokit = github.getOctokit(token, {
      userAgent: 'Autometrics/diff-metrics v1'
    })
    const tsRoots = core.getMultilineInput(TS_ROOTS)
    const rsRoots = core.getMultilineInput(RS_ROOTS)
    const goRoots = core.getMultilineInput(GO_ROOTS)
    const pyRoots = core.getMultilineInput(PY_ROOTS)
    const retention = parseInt(core.getInput(RETENTION))
    const amVersion =
      core.getInput(AM_VERSION) !== '' ? core.getInput(AM_VERSION) : undefined

    core.startGroup(`Downloading am_list matching ${amVersion ?? 'latest'}`)
    const amPath = await downloadAmList(octokit, amVersion)
    core.endGroup()

    core.startGroup('[head] Building datasets for head branch')
    const newAmDatasets: DataSetMap = {}

    for (const goRoot of goRoots) {
      newAmDatasets[goRoot] = await computeDataSet(amPath, goRoot, 'go')
    }
    for (const tsRoot of tsRoots) {
      newAmDatasets[tsRoot] = await computeDataSet(amPath, tsRoot, 'typescript')
    }
    for (const rsRoot of rsRoots) {
      newAmDatasets[rsRoot] = await computeDataSet(amPath, rsRoot, 'rust')
    }
    for (const pyRoot of pyRoots) {
      newAmDatasets[pyRoot] = await computeDataSet(amPath, pyRoot, 'python')
    }

    const headSha = payload.pull_request?.head.sha ?? payload.after
    core.info(JSON.stringify(newAmDatasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-after-${headSha}`,
      newAmDatasets,
      retention
    )
    core.endGroup()

    // Setting up the base state to compare to.
    const baseSha = await checkoutBaseState(payload)

    core.startGroup('[base] Building datasets for base state')
    const oldAmDatasets: DataSetMap = {}

    for (const goRoot of goRoots) {
      oldAmDatasets[goRoot] = await computeDataSet(amPath, goRoot, 'go')
    }
    for (const tsRoot of tsRoots) {
      oldAmDatasets[tsRoot] = await computeDataSet(amPath, tsRoot, 'typescript')
    }
    for (const rsRoot of rsRoots) {
      oldAmDatasets[rsRoot] = await computeDataSet(amPath, rsRoot, 'rust')
    }
    for (const pyRoot of pyRoots) {
      oldAmDatasets[pyRoot] = await computeDataSet(amPath, pyRoot, 'python')
    }

    core.info(JSON.stringify(oldAmDatasets, undefined, 2))
    await storeDataSetMap(
      `autometrics-before-${baseSha}`,
      oldAmDatasets,
      retention
    )
    core.endGroup()

    core.startGroup('Computing and saving the difference between the datasets')
    const datasetDiff = diffDatasetMaps(newAmDatasets, oldAmDatasets)
    core.info(JSON.stringify(datasetDiff, undefined, 2))
    await storeDataSetDiffMap(
      `autometrics-diff-${baseSha}-${headSha}`,
      datasetDiff,
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
      old: oldAmDatasets,
      new: newAmDatasets,
      diff: datasetDiff
    })

    core.endGroup()
  } catch (_e) {
    const e: Error = _e as Error
    core.setFailed(e.message)
  }
}

run()
