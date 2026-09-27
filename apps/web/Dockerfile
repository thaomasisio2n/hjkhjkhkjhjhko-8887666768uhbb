# Build from the repository root: docker build -f apps/web/Dockerfile .
# Base images are pinned by digest (Dependabot keeps them current).
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# No install scripts: nothing the web build needs runs one.
RUN npm ci --workspace=apps/web --ignore-scripts

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@novaspin/shared && npm run build --workspace=apps/web

# Where nginx forwards /api, and which proxies (if any) sit in front of it.
ARG API_UPSTREAM=api:8787
ARG TRUSTED_PROXIES=
RUN API_UPSTREAM="$API_UPSTREAM" TRUSTED_PROXIES="$TRUSTED_PROXIES" \
    sh apps/web/render-nginx-conf.sh apps/web/nginx.conf > /tmp/default.conf

# nginx as an unprivileged user on port 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:4714e0b1b2577eaa1a6131d07c958b67f0eb68e6d0521e90c6e5287db8cf0bc5
COPY --from=build /tmp/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
