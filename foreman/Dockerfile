FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

RUN apk --no-cache add ca-certificates
RUN apk add --no-cache tzdata

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . ./
ARG TARGETOS
ARG TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /foreman

##
## Deploy
##
FROM alpine:3.21

WORKDIR /

COPY --from=builder /foreman /foreman

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=UTC

ENTRYPOINT ["/foreman"]
