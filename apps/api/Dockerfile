# Build from the repository root: docker build -f apps/api/Dockerfile .
# Base image pinned by digest (Dependabot keeps it current).
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS base
# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- build: full toolchain, compiles shared + API (including the seed) ------
FROM base AS build
COPY package.json package-lock.json ./
COPY scripts/build-shared.mjs scripts/build-shared.mjs
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=apps/api
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && npm run build

# --- runtime: production dependencies and compiled output only --------------
# No TypeScript, tsx, vitest or sources: less to exploit if something breaks.
FROM base AS runtime
COPY package.json package-lock.json ./
COPY scripts/build-shared.mjs scripts/build-shared.mjs
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace=apps/api && npm cache clean --force
WORKDIR /app/apps/api
COPY apps/api/prisma prisma
RUN npx prisma generate
COPY --from=build /app/apps/api/dist dist

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
