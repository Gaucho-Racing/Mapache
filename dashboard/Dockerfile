FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Build-time Vite vars are baked into the bundle. Backend URL / WS URL
# default to the prod hostname inside src/consts/config.tsx, so they
# don't need to be passed here. Mapbox is the one that has to be
# injected at build time — empty token = maps won't render.
ARG VITE_MAPBOX_ACCESS_TOKEN=""
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
