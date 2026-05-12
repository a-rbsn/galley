# syntax=docker/dockerfile:1.7

# --- Build stage --------------------------------------------------------
# --platform=$BUILDPLATFORM keeps the Svelte build on the runner's native
# architecture. Production dependencies are installed in a separate target-
# platform stage below so native modules match the runtime image.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

RUN apk add --no-cache python3 make g++
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Production dependencies -------------------------------------------
FROM node:22-alpine AS prod-deps

RUN apk add --no-cache python3 make g++
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# --- Runtime stage ------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    GALLEY_CACHE_PATH=/data/cache.sqlite \
    GALLEY_CONFIG_PATH=/data/config.json

COPY --from=build /app/build ./build
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# su-exec lets the entrypoint chown /data as root then drop to node.
# libstdc++ is required by the native better-sqlite3 binding.
RUN apk add --no-cache su-exec libstdc++

# /data holds the persistent config + cache files. Mount a volume here.
RUN mkdir -p /data && chown -R node:node /app /data

# Entrypoint fixes /data ownership at startup (Docker creates named
# volumes as root) before exec-ing the Node server as the node user.
COPY --chmod=0755 entrypoint.sh /entrypoint.sh

EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "build"]
