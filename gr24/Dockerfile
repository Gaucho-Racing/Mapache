FROM --platform=$BUILDPLATFORM golang:1.22-alpine3.19 as builder

RUN apk --no-cache add ca-certificates
RUN apk add --no-cache tzdata

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . ./
ARG TARGETOS
ARG TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /gr24

##
## Deploy
##
FROM alpine:3.19

WORKDIR /

COPY --from=builder /gr24 /gr24

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=America/Los_Angeles

ENTRYPOINT ["/gr24"]