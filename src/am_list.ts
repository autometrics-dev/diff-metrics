// This module handles downloading and running am_list tool.
//
// This is also probably where we define the data types for the Datasets. (or an extra .d.ts file)

import * as tmp from 'tmp'
import decompress from 'decompress'
import {PathLike} from 'fs'
import {GitHub} from '@actions/github/lib/utils'
import {exec} from 'child_process'
import * as core from '@actions/core'
import {promisify} from 'util'
import * as semver from 'semver'
// Removing false positive
// eslint-disable-next-line import/no-unresolved
import {components} from '@octokit/openapi-types'

const execAsync = promisify(exec)

const OWNER = 'autometrics-dev'
const REPO = 'am_list'
const ASSET_NAME = 'am_list-x86_64-unknown-linux-gnu.tar.gz'
const ARCHIVE_NAME = 'am_list-x86_64-unknown-linux-gnu'

type Release = components['schemas']['release']

export type AmFunction = {
  module: string
  function: string
}

export type DataSet = {
  autometricized_functions: AmFunction[]
}

export type DataSetMap = {
  [root: string]: DataSet
}

export type Language = 'rust' | 'typescript' | 'go'

export async function downloadAmList(
  octokit: InstanceType<typeof GitHub>,
  versionConstraint?: string
): Promise<string> {
  const release = await getAmListReleaseId(octokit, versionConstraint)
  core.info(
    `Version constraint: ${versionConstraint ?? 'latest'}\nVersion picked: ${
      release.tag_name
    }`
  )

  const assets = await octokit.rest.repos.listReleaseAssets({
    owner: OWNER,
    repo: REPO,
    release_id: release.id
  })

  if (assets.status !== 200) {
    throw new Error(
      `Fetching assets for release ${release.tag_name} failed: ${assets.status}`
    )
  }

  for (const asset of assets.data) {
    if (asset.name === ASSET_NAME) {
      const tmpDir = tmp.dirSync()

      const tarball = await octokit.rest.repos.getReleaseAsset({
        owner: OWNER,
        repo: REPO,
        asset_id: asset.id,
        headers: {accept: 'application/octet-stream'}
      })

      if (tarball.status !== 200) {
        throw new Error(
          `Fetching asset for release ${release.tag_name} failed: ${tarball.status}`
        )
      }

      const rawData = Buffer.from(tarball.data as unknown as ArrayBuffer)

      await decompress(rawData, tmpDir.name)

      return `${tmpDir.name}/${ARCHIVE_NAME}/am_list`
    }
  }

  throw new Error(
    `No asset found for release ${release.tag_name} (trying to find ${ASSET_NAME})`
  )
}
export async function getAmListReleaseId(
  octokit: InstanceType<typeof GitHub>,
  versionConstraint?: string
): Promise<Release> {
  const releases = await octokit.rest.repos.listReleases({
    owner: OWNER,
    repo: REPO,
    per_page: 200
  })

  if (releases.status !== 200) {
    throw new Error(`Fetching releases failed: ${releases.status}`)
  }

  const sorted_releases = releases.data.sort(function (v1, v2) {
    return semver.rcompare(v1.tag_name, v2.tag_name)
  })

  if (!versionConstraint) {
    return sorted_releases[0]
  }

  const constraintPrefix = `v${versionConstraint}`
  for (const release_candidate of sorted_releases) {
    if (release_candidate.tag_name.startsWith(constraintPrefix)) {
      return release_candidate
    }
  }

  throw new Error(
    `No release matching the constraint ${versionConstraint} found.`
  )
}

export async function computeDataSet(
  am_list: PathLike,
  project_root: PathLike,
  language: Language
): Promise<DataSet> {
  const {stdout} = await execAsync(
    `${am_list} list -l ${language} ${project_root}`
  )

  return {
    autometricized_functions: JSON.parse(stdout)
  }
}
