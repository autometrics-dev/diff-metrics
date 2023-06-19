// This handles taking a list of data models that describe the difference between datasets,
// and post the information as a comment on the PR the workflow has been triggered for.

import * as core from '@actions/core'
import {GitHub} from '@actions/github/lib/utils'
import {DataSetDiff, DataSetDiffMap} from './diff_data'
import {AmFunction, DataSet, DataSetMap} from './am_list'
import {Context} from '@actions/github/lib/context'

const COMMENT_HEADER = '# <i>Autometrics Compare Metrics</i>'
const COMMENT_FOOTER =
  '\n\n<a href="https://github.com/autometrics-dev/diff-metrics"><sub>Autometrics diff-metrics</sub></a>'

export type DiffStats = {
  old: DataSetMap
  new: DataSetMap
  diff: DataSetDiffMap
}

export async function updateOrPostComment(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  stats: DiffStats
): Promise<void> {
  const issueNumber = context.payload.pull_request?.number || 0
  const commentInfo = {
    ...context.repo,
    issue_number: issueNumber
  }
  const comment = {
    ...commentInfo,
    body: formatComment(stats, context.repo.repo)
  }

  let commentId
  try {
    const comments = (await octokit.rest.issues.listComments(commentInfo)).data
    for (let i = comments.length; i--; ) {
      const c = comments[i]
      if (c.user?.type === 'Bot' && (c.body ?? '').includes(COMMENT_FOOTER)) {
        commentId = c.id
        break
      }
    }
  } catch (_ee) {
    const ee: Error = _ee as Error
    core.error(`Error checking for previous comments: ${ee.message}`)
  }

  if (commentId) {
    core.info(`Updating previous comment #${commentId}`)
    try {
      await octokit.rest.issues.updateComment({
        ...context.repo,
        comment_id: commentId,
        body: comment.body
      })
    } catch (_ee) {
      const ee: Error = _ee as Error
      core.error(`Error editing previous comment: ${ee.message}`)
      commentId = null
    }
  }

  if (!commentId) {
    core.info('Creating new comment')
    try {
      await octokit.rest.issues.createComment(comment)
    } catch (_e) {
      const e: Error = _e as Error
      core.error(`Error creating comment: ${e.message}`)
      core.info(`Submitting a PR review comment instead...`)
      try {
        const issue = context.issue || context.payload.pull_request
        await octokit.rest.pulls.createReview({
          owner: issue.owner,
          repo: issue.repo,
          pull_number: issue.number,
          event: 'COMMENT',
          body: comment.body
        })
      } catch (_ee) {
        const ee: Error = _ee as Error
        core.error('Error creating PR review.')
        throw ee
      }
    }
  }
}

function formatComment(stats: DiffStats, repoName: string): string {
  const header = `${COMMENT_HEADER}\n${formatSummary(
    stats.diff,
    stats.old,
    stats.new
  )}`

  if (
    Object.entries(stats.diff).length === 0 ||
    Object.values(stats.diff).every(
      datasetDiff =>
        datasetDiff.existingNewlyAutometricized.length === 0 &&
        datasetDiff.newFunctionsAutometricized.length === 0 &&
        datasetDiff.newFunctionsNotAm.length === 0 &&
        datasetDiff.existingNoLongerAutometricized.length === 0
    )
  ) {
    return `${header}\n${COMMENT_FOOTER}`
  }

  return (
    `${header}\n` +
    `## Differences in Datasets\n${formatDiffMap(stats.diff, repoName)}\n` +
    '## Details\n' +
    `<details><summary>Old Dataset</summary>\n${formatDatasetMap(
      stats.old,
      repoName
    )}</details>\n` +
    `<details><summary>New Dataset</summary>\n${formatDatasetMap(
      stats.new,
      repoName
    )}</details>\n` +
    `${COMMENT_FOOTER}`
  )
}

function formatRoot(root: string, repoName: string): string {
  if (root.startsWith('.')) {
    return repoName + root.substring(1)
  }

  return root
}

function formatSummary(
  diff: DataSetDiffMap,
  oldData: DataSetMap,
  newData: DataSetMap
): string {
  if (
    Object.entries(diff).length === 0 ||
    Object.values(diff).every(
      datasetDiff =>
        datasetDiff.existingNewlyAutometricized.length === 0 &&
        datasetDiff.newFunctionsAutometricized.length === 0 &&
        datasetDiff.newFunctionsNotAm.length === 0 &&
        datasetDiff.existingNoLongerAutometricized.length === 0
    )
  ) {
    return 'No change\n'
  }

  let amAdditions = 0
  let amRemovals = 0
  let deletions = 0
  let notAmAdditions = 0
  let oldTotalFns = 0
  let oldTotalAmFns = 0
  let newTotalFns = 0
  let newTotalAmFns = 0
  for (const [key, diffItem] of Object.entries(diff)) {
    amAdditions +=
      diffItem.existingNewlyAutometricized.length +
      diffItem.newFunctionsAutometricized.length
    notAmAdditions += diffItem.newFunctionsNotAm.length
    amRemovals += diffItem.existingNoLongerAutometricized.length
    deletions += diffItem.deletedFunctions.length

    oldTotalFns +=
      oldData[key].autometricizedFunctions.length ??
      0 + oldData[key].autometricizedFunctions.length ??
      0
    oldTotalAmFns += oldData[key].autometricizedFunctions.length ?? 0
    newTotalFns +=
      newData[key].autometricizedFunctions.length ??
      0 + newData[key].autometricizedFunctions.length ??
      0
    newTotalAmFns += newData[key].autometricizedFunctions.length ?? 0
  }

  let summaryText = ''

  if (amAdditions >= amRemovals) {
    summaryText = `${summaryText}${
      amAdditions - amRemovals
    } metrics added (+${amAdditions} / -${amRemovals})\n`
  } else {
    summaryText = `${summaryText}${
      amRemovals - amAdditions
    } metrics removed (+${amAdditions} / -${amRemovals})\n`
  }

  if (deletions !== 0) {
    summaryText = `${summaryText}${deletions} functions deleted\n`
  }

  if (notAmAdditions !== 0) {
    summaryText = `${summaryText}${notAmAdditions} new functions do _not_ have metrics.\n`
  }

  if (newTotalFns !== 0 && oldTotalFns !== 0) {
    const newCov = newTotalAmFns / newTotalFns
    const oldCov = oldTotalAmFns / oldTotalFns
    summaryText = `${summaryText}${
      100.0 * (newCov - oldCov)
    }% change in metrics coverage.\n`
  } else if (newTotalFns === 0) {
    summaryText = `${summaryText}Removing all functions.\n`
  } else if (oldTotalFns === 0) {
    const newCov = newTotalAmFns / newTotalFns
    summaryText = `${summaryText}${
      100.0 * newCov
    }% change in metrics coverage.\n`
  }

  return summaryText
}

function formatDiffMap(diff: DataSetDiffMap, repoName: string): string {
  if (Object.entries(diff).length === 0) {
    return 'No data to report\n'
  }
  let ret = ''
  for (const [root, diffItem] of Object.entries(diff)) {
    ret = `${ret}In \`${formatRoot(root, repoName)}\`\n\n`
    ret = `${ret}${formatDiffSummary(diffItem)}\n\n`
    ret = `${ret}${formatDiffTable(diffItem)}\n\n`
  }

  return ret
}

function formatDiffSummary(diff: DataSetDiff): string {
  const newFnCoverage =
    diff.newFunctionsAutometricized.length /
    (diff.newFunctionsAutometricized.length + diff.newFunctionsNotAm.length)
  const diffCoverageMessage = diff.coverageRatioDiff
    ? `${100.0 * diff.coverageRatioDiff ?? 1}% change in metrics coverage.`
    : ''
  if (isNaN(newFnCoverage)) {
    return diffCoverageMessage
  }
  return `${diffCoverageMessage} (${
    100.0 * newFnCoverage
  }% of new functions have metrics).`
}

function formatDiffTable(diff: DataSetDiff): string {
  let ret = ''
  if (diff.existingNewlyAutometricized.length !== 0) {
    ret = `${ret} ![Green square](https://placehold.co/15x15/c5f015/c5f015.png) Existing functions that get metrics now\n\n`
    ret = ret + tableAmFunctionList(diff.existingNewlyAutometricized)
  } else {
    ret = `${ret}No existing function should start reporting metrics.\n\n`
  }

  if (diff.existingNoLongerAutometricized.length !== 0) {
    ret = `${ret} ![Red square](https://placehold.co/15x15/f03c15/f03c15.png) Existing functions that do not get metrics anymore\n\n`
    ret = ret + tableAmFunctionList(diff.existingNoLongerAutometricized)
  } else {
    ret = `${ret}No existing function should stop reporting metrics.\n\n`
  }

  if (diff.newFunctionsAutometricized.length !== 0) {
    ret = `${ret} ![Green square](https://placehold.co/15x15/c5f015/c5f015.png) New functions that get metrics\n\n`
    ret = ret + tableAmFunctionList(diff.newFunctionsAutometricized)
  } else if (diff.newFunctionsNotAm.length !== 0) {
    ret = `${ret}No new function has metrics.\n\n`
  }

  if (diff.newFunctionsNotAm.length !== 0) {
    ret = `${ret} ![Red square](https://placehold.co/15x15/f03c15/f03c15.png) New functions that do not get metrics\n\n`
    ret = ret + tableAmFunctionList(diff.existingNoLongerAutometricized)
  } else if (diff.newFunctionsAutometricized.length !== 0) {
    ret = `${ret}No new function is missing metrics!\n\n`
  }

  return ret
}

function formatDatasetMap(statMap: DataSetMap, repoName: string): string {
  if (Object.entries(statMap).length === 0) {
    return 'No data to report\n'
  }
  let ret = ''
  for (const [root, dataset] of Object.entries(statMap)) {
    ret = `${ret}In \`${formatRoot(root, repoName)}\`\n\n`
    ret = `${ret}${formatDataset(dataset)}\n\n`
  }

  return ret
}

function formatDataset(dataset: DataSet): string {
  let ret = ''

  if (dataset.autometricizedFunctions.length !== 0) {
    ret = `${ret}Annotated functions\n\n`
    ret = ret + tableAmFunctionList(dataset.autometricizedFunctions)
  } else {
    ret = `${ret}No annotated function to report.\n\n`
  }

  return ret
}

function tableAmFunctionList(
  list: AmFunction[],
  forceSingleTable?: boolean
): string {
  const PER_MODULE_TABLES_THRESHOLD = 10
  if (list.length < PER_MODULE_TABLES_THRESHOLD || forceSingleTable) {
    let ret = ''

    ret = `${ret}|Module|Function|\n`
    ret = `${ret}|------|--------|\n`
    for (const fn of list) {
      ret = `${ret}|${fn.module}|${fn.function}|\n`
    }
    ret = `${ret}\n`

    return ret
  }

  let ret = ''

  const perModuleFnList: {[module: string]: AmFunction[]} = {}
  for (const fn of list) {
    if (!perModuleFnList.hasOwnProperty(fn.module)) {
      perModuleFnList[fn.module] = []
    }

    perModuleFnList[fn.module].push(fn)
  }

  for (const [moduleName, moduleList] of Object.entries(perModuleFnList)) {
    ret = `${ret}Module ${moduleName}:\n`
    ret = `${ret}${tableAmFunctionList(moduleList, true)}\n`
  }

  return ret
}
