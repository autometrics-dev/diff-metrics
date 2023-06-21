# Autometrics Metrics Report

A Github action that comments on PRs to tell you how metrics are going to be affected. The
report tells you immediately if your new feature is well instrumented, and shows a useful
summary of the metrics that will be reported without needing to go through the diff.

<!-- Put a screen shot of the PR comment here. -->

## Inputs

- `gh-token`: a github token that gives access to
  + the PR
  + the repo
  + read/write access to comments on issues/PR
  **The built-in `${{ secrets.GITHUB_TOKEN }}` will work, you do not need to create a new one.**
  To make the built-in token work, the job must be given a specific set of permissions. The permissions added in the
  ["Example Usage" section](#example-usage) show the minimal set of permissions needed.
- `rs-roots`: a list of project roots for rust projects, one root per line.
  The values are given relative to the root of the repository, and should
  point to the directory containing the `Cargo.toml` directory.
- `retention-days`: the number of days to keep the list of functions as
  [workflow
  artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#about-workflow-artifacts).
  By default it will use the same retention settings as the settings in the
  repository (by setting `retention-days` to 0)
- `am-version`: a string that allows to choose the version of `am_list` to
  download/use. You can skip the patch (e.g. `0.2`) or the minor (e.g. `0`) to
  tell the action to download the latest version that falls within the bound.
  Defaults to an empty string (`""`), which means "download the latest version,
  semver-wise"
  
| Argument | Mandatory
:----------:|:-----------:
gh-token | yes 
rs-roots | no 
retention-days | no
am-version | no

## Outputs

The action does 2 things:
- it writes comments to pull request giving the monitoring impact of the Pull Request.
- it saves the data used to compute this report as workflow artifacts. Workflow artifacts
  stay private to the repository that created them, but this allows for further processing
  if need be.
  

## Example Usage

The job must only contain the checkout step and the diff-metrics step, the steps that follow
within the job would act on an older version of the repository.

```yaml
name: Metrics report

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
│  └── Cargo.toml
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
    project-c
```


###### Language support

Look at the issues in the repository to see the advancement of language support.
All languages in the table will be eventually supported.

Language | Support 
:---:|:---:|:---:
[Rust](https://github.com/autometrics-dev/autometrics-rs) | ✅ 
[Typescript](https://github.com/autometrics-dev/autometrics-ts) | ❌
[Go](https://github.com/autometrics-dev/autometrics-go) | ❌
[Python](https://github.com/autometrics-dev/autometrics-py) | ❌
[C#](https://github.com/autometrics-dev/autometrics-cs) | ❌
