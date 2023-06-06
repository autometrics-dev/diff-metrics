#!/usr/bin/env bash

set -euo pipefail

rm -rf dist/*
npm install --target_arch=x64 --target_platform=linux
npm run package
