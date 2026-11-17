FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

WORKDIR /src

COPY go.work go.work.sum* ./
COPY pkg/go.mod pkg/go.sum pkg/
COPY migrator/go.mod migrator/go.sum migrator/
RUN go mod download

COPY pkg/ pkg/
COPY migrator/ migrator/
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /migrator ./migrator

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata && adduser -D -H migrator
ENV TZ=UTC
USER migrator

COPY --from=builder /migrator /migrator

ENTRYPOINT ["/migrator"]
