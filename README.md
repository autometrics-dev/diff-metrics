# Autometrics Diff Metrics

<!-- Put a screen shot of the PR comment here. -->

<!-- Put a language support table here. -->

- [ ] Is the GITHUB_TOKEN enough to be able to post PR comments (ie issue comments)?

## Inputs

## Outputs

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
        gh_token: ${{ secrets.GITHUB_TOKEN }}
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
  gh_token: ${{ secrets.GITHUB_TOKEN }}
  rust-roots: |
    project-a
    project-b
  ts-roots: |
    project-c
```
