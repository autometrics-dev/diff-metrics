// This handles taking a list of data models that describe the difference between datasets,
// and post the information as a comment on the PR the workflow has been triggered for.

import * as core from '@actions/core'
import {GitHub} from '@actions/github/lib/utils'
import {DataSetDiff, DataSetDiffMap} from './diff_data'
import {AmFunction, DataSet, DataSetMap} from './am_list'
import {Context} from '@actions/github/lib/context'

const COMMENT_HEADER = '<i>Autometrics Compare Metrics</i>'
const COMMENT_FOOTER =
  '\n\n<a href="https://github.com/autometrics-dev/diff-metrics"><sub>Autometrics diff-metrics</sub></a>'

export type DiffStats = {
  old: DataSetMap
  new: DataSetMap
  diff: DataSetDiffMap
}

export async function update_or_post_comment(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  stats: DiffStats
): Promise<void> {
  const issue_number = context.payload.pull_request?.number || 0
  const commentInfo = {
    ...context.repo,
    issue_number
  }
  const comment = {
    ...commentInfo,
    body: format_comment(stats, context.repo.repo)
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

function format_comment(stats: DiffStats, repo_name: string): string {
  return (
    `${COMMENT_HEADER}\n` +
    `<details><summary>Differences in Dataset</summary>${format_diff_map(
      stats.diff,
      repo_name
    )}</details>\n` +
    `<details><summary>Old Dataset</summary>${format_dataset_map(
      stats.old,
      repo_name
    )}</details>\n` +
    `<details><summary>New Dataset</summary>${format_dataset_map(
      stats.new,
      repo_name
    )}</details>\n` +
    `${COMMENT_FOOTER}`
  )
}

function format_root(root: string, repo_name: string): string {
  if (root.startsWith('.')) {
    return repo_name + root.substring(1)
  }

  return root
}

function format_diff_map(diff: DataSetDiffMap, repo_name: string): string {
  if (Object.entries(diff).length === 0) {
    return 'No data to report\n'
  }
  let ret = ''
  for (const [root, diff_item] of Object.entries(diff)) {
    ret = `${ret}${format_root(root, repo_name)}\n\n`
    ret = `${ret}${format_diff_table(diff_item)}\n\n`
  }

  return ret
}

function format_diff_table(diff: DataSetDiff): string {
  let ret = ''
  if (diff.newly_autometricized.length !== 0) {
    ret = `${ret}Newly annotated functions\n\n`
    ret = ret + table_am_function_list(diff.newly_autometricized)
  } else {
    ret = `${ret}No newly annotated function to report here.\n\n`
  }
  if (diff.no_longer_autometricized.length !== 0) {
    ret = `${ret}No longer annotated functions\n\n`
    ret = ret + table_am_function_list(diff.no_longer_autometricized)
  } else {
    ret = `${ret}No function that is no longer annotated to report here.\n\n`
  }

  return ret
}

function format_dataset_map(stat_map: DataSetMap, repo_name: string): string {
  if (Object.entries(stat_map).length === 0) {
    return 'No data to report\n'
  }
  let ret = ''
  for (const [root, dataset] of Object.entries(stat_map)) {
    ret = `${ret}${format_root(root, repo_name)}\n\n`
    ret = `${ret}${format_dataset(dataset)}\n\n`
  }

  return ret
}

function format_dataset(dataset: DataSet): string {
  let ret = ''

  if (dataset.autometricized_functions.length !== 0) {
    ret = `${ret}Annotated functions\n\n`
    ret = ret + table_am_function_list(dataset.autometricized_functions)
  } else {
    ret = `${ret}No annotated function to report.\n\n`
  }

  return ret
}

function table_am_function_list(list: AmFunction[]): string {
  let ret = ''
  ret = `${ret}|Module|Function|\n`
  ret = `${ret}|------|--------|\n`
  for (const fn of list) {
    ret = `${ret}|${fn.module}|${fn.function}|\n`
  }
  ret = `${ret}\n`

  return ret
}
