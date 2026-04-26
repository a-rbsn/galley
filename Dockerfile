# syntax=docker/dockerfile:1.7

# --- Build stage --------------------------------------------------------
FROM node:22-alpine AS build

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

# /data holds the persistent config + cache files. Mount a volume here.
RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "build"]
