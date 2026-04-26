# syntax=docker/dockerfile:1.7

# --- Build stage --------------------------------------------------------
# --platform=$BUILDPLATFORM keeps the build stage on the runner's native
# architecture (linux/amd64 on GitHub Actions). Without it, multi-arch
# builds emulate the build itself under QEMU, which crashes with
# "Illegal instruction" the moment Node hits an instruction the QEMU
# translator doesn't model. Galley's runtime deps are pure JS, so the
# resulting node_modules/build directory is portable to arm64.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Strip dev dependencies so we can copy a slim node_modules into the
# runtime image without rebuilding from the lockfile.
RUN pnpm prune --prod

# --- Runtime stage ------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    GALLEY_CACHE_PATH=/data/cache.json \
    GALLEY_CONFIG_PATH=/data/config.json

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# su-exec lets the entrypoint chown /data as root then drop to node.
RUN apk add --no-cache su-exec

# /data holds the persistent config + cache files. Mount a volume here.
RUN mkdir -p /data && chown -R node:node /app /data

# Entrypoint fixes /data ownership at startup (Docker creates named
# volumes as root) before exec-ing the Node server as the node user.
COPY --chmod=0755 entrypoint.sh /entrypoint.sh

EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "build"]
