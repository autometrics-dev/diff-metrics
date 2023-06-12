import {exec} from 'child_process'
import {promisify} from 'util'
import * as core from '@actions/core'
import {WebhookPayload} from '@actions/github/lib/interfaces'
const execAsync = promisify(exec)

// checkoutBaseState puts the repo in the base state to compare datasets against.
// It integrates usage of the @actions/core API to make the actions its own group in Github Actions logs.
//
// It returns the sha of the base commit, as it is used to properly name the artifacts later.
export async function checkoutBaseState(
  payload: WebhookPayload
): Promise<string> {
  let baseRef
  let baseSha
  if (payload.pull_request) {
    core.startGroup('[base] Checking out base branch')
    baseRef = payload.pull_request?.base.ref
    baseSha = payload.pull_request?.base.sha
  } else {
    core.startGroup('[before] Checking out before state')
    baseSha = payload.before
  }

  try {
    if (!baseRef) throw Error('missing context.payload.pull_request.base.ref')
    await execAsync(`git fetch -n origin ${baseRef}`)
    core.info('successfully fetched base.ref')
  } catch (_e1) {
    const e1: Error = _e1 as Error
    core.error(`fetching base.ref failed: ${e1.message}`)

    try {
      await execAsync(`git fetch -n origin ${baseSha}`)
      core.info('successfully fetched base.sha')
    } catch (_e2) {
      const e2: Error = _e2 as Error
      core.error(`fetching base.sha failed: ${e2.message}`)
      try {
        await execAsync(`git fetch -n`)
      } catch (_e3) {
        const e3: Error = _e3 as Error
        core.error(`fetch failed: ${e3.message}`)
      }
    }
  }

  // Remove any leftover files (new files added in the PR)
  try {
    if (!baseRef) throw Error('missing context.payload.base.ref')
    await execAsync(`git reset --hard ${baseRef}`)
  } catch (e) {
    if (!baseSha)
      throw Error(
        'Cannot checkout the base state of the repo: missing context.payload.base.ref _and_ context.payload.base.sha'
      )
    await execAsync(`git reset --hard ${baseSha}`)
  }
  core.endGroup()
  return baseSha
}
