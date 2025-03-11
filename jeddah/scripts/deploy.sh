#!/bin/bash

service_name=$(basename $(dirname $(dirname "$(readlink -f "$0")")))

# Extract version from config.go
VERSION=$(grep 'Version: ' config/config.go | cut -d '"' -f 2)

if [ -z "$VERSION" ]
  then
    echo "Error: Unable to extract version from config/config.go"
    exit 1
fi

# Check if docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed.' >&2
  exit 1
fi

echo "Building container for $service_name v$VERSION"
# Build the docker container
docker build -t gauchoracing/mp_$service_name:"$VERSION" -t gauchoracing/mp_$service_name:latest --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 --push --progress=plain .