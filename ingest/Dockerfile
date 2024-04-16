FROM golang:1.22-alpine3.19 as builder

ENV GOOS=linux

RUN apk --no-cache add ca-certificates
RUN apk add --no-cache tzdata

WORKDIR /app

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY . ./

RUN go build -o /ingest

##
## Deploy
##
FROM alpine:3.19

WORKDIR /

COPY --from=builder /ingest /ingest

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=America/Los_Angeles

ENTRYPOINT ["/ingest"]