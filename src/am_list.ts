// This module handles downloading and running am_list tool.
//
// This is also probably where we define the data types for the Datasets. (or an extra .d.ts file)

import * as tmp from 'tmp'
import decompress from 'decompress'
import {PathLike} from 'fs'
import {GitHub} from '@actions/github/lib/utils'
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)

const OWNER = 'autometrics-dev'
const REPO = 'am_list'
const ASSET_NAME = 'am_list-x86_64-unknown-linux-gnu.tar.gz'
const ARCHIVE_NAME = 'am_list-x86_64-unknown-linux-gnu'

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

export async function download_am_list(
  octokit: InstanceType<typeof GitHub>,
  version: string
): Promise<string> {
  const release = await octokit.rest.repos.getReleaseByTag({
    owner: OWNER,
    repo: REPO,
    tag: version
  })

  if (release.status !== 200) {
    throw new Error(
      `Fetching release ${version} failed: ${release.data.body_text}`
    )
  }

  const assets = await octokit.rest.repos.listReleaseAssets({
    owner: OWNER,
    repo: REPO,
    release_id: release.data.id
  })

  if (assets.status !== 200) {
    throw new Error(
      `Fetching assets for release ${version} failed: ${assets.status}`
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
          `Fetching asset for release ${version} failed: ${tarball.status}`
        )
      }

      const rawData = Buffer.from(tarball.data as unknown as ArrayBuffer)

      await decompress(rawData, tmpDir.name)

      return `${tmpDir.name}/${ARCHIVE_NAME}/am_list`
    }
  }

  throw new Error(
    `No asset found for release ${version} (trying to find ${ASSET_NAME})`
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
