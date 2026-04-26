#!/bin/sh
# Docker creates named volumes owned by root, but Galley runs as the
# unprivileged `node` user. Without this chown, every writeFileSync to
# /data/config.json or /data/cache.json fails with EACCES — silently,
# because the API endpoints catch and return 500s the client treats as
# transient. The result is an instance that "completes" setup against
# an in-memory cache and forgets everything on the next container start.
#
# Run chown while still root, then drop to node via su-exec.
set -e

if [ -d /data ]; then
	chown -R node:node /data
	chmod 0775 /data
fi

exec su-exec node:node "$@"
