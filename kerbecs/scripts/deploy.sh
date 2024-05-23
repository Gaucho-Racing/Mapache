#!/bin/bash

# Check if version is provided
if [ -z "$1" ]
  then
    echo "No version number provided"
    exit 1
fi

# Check if docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed.' >&2
  exit 1
fi

echo "Building container for Kerbecs v$1"
# Build the docker container
docker build -t bk1031/kerbecs:"$1" -t bk1031/kerbecs:latest --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 --push --progress=plain .