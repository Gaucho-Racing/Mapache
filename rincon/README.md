# Rincon

<img align="right" width="159px" src="https://github.com/BK1031/Rincon/blob/bk1031/readme/assets/rincon-circle.png?raw=true" alt="rincon-logo">

[![Build Status](https://github.com/BK1031/Rincon/actions/workflows/test.yml/badge.svg)](https://github.com/BK1031/Rincon/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/BK1031/Rincon/graph/badge.svg?token=R4NMABYGOZ)](https://codecov.io/gh/BK1031/Rincon)
[![GoDoc](https://pkg.go.dev/badge/github.com/bk1031/rincon?status.svg)](https://pkg.go.dev/github.com/bk1031/rincon?tab=doc)
[![Docker Pulls](https://img.shields.io/docker/pulls/bk1031/rincon?style=flat-square)](https://hub.docker.com/repository/docker/bk1031/rincon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/release/bk1031/rincon.svg?style=flat-square)](https://github.com/bk1031/rincon/releases)


Rincon is a cloud-native service registry written in [Go](https://go.dev/). 
It is designed to be fast, lightweight, and highly scalable.
Rincon is also platform-agnostic, and can run in the cloud, a container, or even on bare-metal,
making it perfect for both local development and production environments.

Rincon makes it easy for services to register themselves and to discover other services.
Built-in support for health checking allows monitoring service status and prevents routing to unavailable services.
External services such as SaaS vendors can also be registered to create a unified discovery interface.

## Getting Started

The easiest way to get started with Rincon is to use the official Docker image.
You can pull it from [Docker Hub](https://hub.docker.com/r/bk1031/rincon).

```bash
$ docker run -d -p 10311:10311 bk1031/rincon:latest
```

Alternatively if you have an existing compose file, you can add Rincon as a service.
This way you can also connect Rincon to your existing database.

```yml

```

## Configuration

## API Endpoints



## Roadmap