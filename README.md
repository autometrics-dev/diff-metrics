# Autometrics Diff Metrics (alpha)

> **Warning**
> The action is not stable yet. You can try to use it and give feedback 
if you wish, but there is no `@v1` version to use for now

<!-- Put a screen shot of the PR comment here. -->

<!-- Put a language support table here. Or at least mention that it's mostly driven by am_list -->

## Inputs

- `gh-token`: a github token that gives access to
  + the PR
  + the repo
  + read/write access to comments on issues/PR
  The permissions added in the
  "Example Usage" section allow to use the built-in `${{ secrets.GITHUB_TOKEN }}`
  directly for that.
- `rs-roots`: a list of project roots for rust projects, one root per line.
  The values are given relative to the root of the repository, and should
  point to the directory containing the `Cargo.toml` directory.
- `retention-days`: the number of days to keep the list of functions as
  [workflow
  artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#about-workflow-artifacts).
  By default it will use the same retention settings as the settings in the
  repository (by setting `retention-days` to 0)

## Outputs

This action has no programmatic output to use in further steps. It only writes
its output as a comment to the PR.

## Example Usage

The job must only contain the diff-metrics step and the checkout one, otherwise the steps that follow
might see an older version of the repository

```yaml
name: Compare Metrics

on: [pull_request]

jobs:
  build:

    # The task only runs on linux x64 machines.
    runs-on: ubuntu-latest

    # Permissions are necessary to be able to edit and write comments on the PR
    permissions:
      issues: write
      pull-requests: write
      repository-projects: read
      contents: read

    steps:
    - uses: actions/checkout@v3
    - uses: autometrics-dev/diff-metrics@v1
      with:
        gh-token: ${{ secrets.GITHUB_TOKEN }}
        rust-roots: |
          .
```


### Mono repo example

In the case of a mono repo that would look like
```
.
├── project-a
│  ├── README.md
│  │ ...
│  └── Cargo.toml
├── project-b
│  ├── README.md
│  │ ...
│  └── Cargo.toml
├── project-c
│  ├── README.md
│  │ ...
│  └── package.json
└── README.md
```

The step using diff-metrics would look like this:
```yaml
uses: autometrics-dev/diff-metrics@v1
with:
  gh-token: ${{ secrets.GITHUB_TOKEN }}
  rust-roots: |
    project-a
    project-b
  ts-roots: |
    project-c
```
