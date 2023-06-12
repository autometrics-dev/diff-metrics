# Contributing

## Building the action for a PR

The `package.json` has an `all` script that will format, lint, package, and test
all the code in the repo for you. Running `npm run all` is the best way to get
the repo to a valid state after having made modifications on it.

## Reproducing issues

There is an organization-level, private, repository for a sample app that has
the github action registered. For @autometrics-dev members, it is the best way
to test regressions on the github action.

For external contributors, reproducing issues comes down to creating a very
small repository that has problem-triggering code, and then attaching the action
to it. The results of the Workflow run should then speak for itself.

## Release Management

> tl;dr 
>
> We are using release/v* branches, and moving tags like Docker image tags, that
> follow the latest relevant (patch|minor) version that's published.

The release management relies on moving tags for Github Actions. This is done,
so users of the actions can always mention the action using the same
`autometrics-dev/diff-metrics@v1` name for the action, and they get all the
non-breaking changes for free.

It is also important to leave the ability to target specific versions if some
users still want to have non-moving tags or if a regression sneaks in.

This is why we're using the Docker method here to deal with releases.

### Major version branches

Each major release will have its own `release/vX` branch, so that hotfixes can
be applied on the branches even after a new major version is done.

Just as Git Flow, the PRs and development of _features_ happen on `main`, and
occasionnally gets backported to `release/vX` branches if relevant.

The PRs for _fixes_ happen on `release/vX` branches, and if the bug is still
present on `main` too, it should be ported there as well.

### Creating a new major version

Creating a new major version implies 4 steps:
- create the `release/vX` branch from `main`, for example creating `release/v3`
  branch.
- create a PR to `release/v3` that updates the `package.json` version to `3.0.0`
  if not done.
- create a PR to `main` that updates the `package.json` version to `4.0.0-dev`
  if not done.
- once the `release/v3` PR is merged, create the `v3.0.0`, `v3.0`, and `v3`
  tags, all pointing to the new commit

### Moving tags

When a new PR is merged on a `release/vX` branch, it MUST bump the minor version or
the patch version in the `package.json` accordingly.

This version will then get tagged once merged on `release/vX`, with the exact patch
version it has, e.g. `v2.12.99`.

Once that tag is created, the new version also pulls all its relevant tags:
- `v2.12` must be moved to `v2.12.99`, and
- `v2` must be moved to `v2.12.99`
