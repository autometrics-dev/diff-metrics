// This module handles creating and storing an artifact for a given dataset.

import {DataSetMap} from './am_list'
import * as tmp from 'tmp'
import * as fs from 'fs'
import * as artifact from '@actions/artifact'
import {DataSetDiffMap} from './diff_data'

const DATASET_ARTIFACT_NAME = 'dataset.json'
const DATASET_DIFF_ARTIFACT_NAME = 'diff.json'

async function storeJsonArtifact(
  name: string,
  artifactName: string,
  data: string,
  retention: number
): Promise<void> {
  const artifactClient = artifact.create()

  const tmpDir = tmp.dirSync()
  const artifactPath = `${tmpDir.name}/${artifactName}`
  fs.writeFileSync(artifactPath, data)

  await artifactClient.uploadArtifact(name, [artifactPath], tmpDir.name, {
    continueOnError: true,
    retentionDays: retention
  })
}

export async function storeDataSetMap(
  name: string,
  amData: DataSetMap,
  retention: number
): Promise<void> {
  await storeJsonArtifact(
    name,
    DATASET_ARTIFACT_NAME,
    JSON.stringify(amData),
    retention
  )
}

export async function storeDataSetDiffMap(
  name: string,
  data: DataSetDiffMap,
  retention: number
): Promise<void> {
  await storeJsonArtifact(
    name,
    DATASET_DIFF_ARTIFACT_NAME,
    JSON.stringify(data),
    retention
  )
}
