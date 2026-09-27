# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim

# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=apps/api

COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

# CHECKPOINT_DISABLE / PRISMA_HIDE_UPDATE_MESSAGE: no phoning home from the
# Prisma CLI at start-up.
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_URL=file:/data/novaspin.db \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
# Run as the image's unprivileged "node" user; only /data is writable to it.
# (A new named volume copies this ownership on first use.)
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8787

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://localhost:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# (Not named docker-entrypoint.sh: the node base image already uses that name.)
COPY --chmod=755 apps/api/docker-start.sh /usr/local/bin/novaspin-start
USER node
CMD ["novaspin-start"]
