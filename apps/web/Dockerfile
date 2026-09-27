# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=apps/web

COPY apps/web apps/web
# The browser calls the API directly, so its public URL is baked in at build
# time, and the Content-Security-Policy allows exactly that origin.
ARG VITE_API_URL=http://localhost:8787
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=apps/web \
  && API_ORIGIN="$(node -p 'new URL(process.env.VITE_API_URL).origin')" \
  && sed "s|__API_ORIGIN__|${API_ORIGIN}|g" apps/web/nginx.conf > /tmp/default.conf

# Runs nginx as an unprivileged user on port 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /tmp/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
