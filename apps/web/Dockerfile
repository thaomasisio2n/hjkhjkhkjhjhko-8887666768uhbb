# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=apps/web

COPY apps/web apps/web
# The browser calls the API directly, so its public URL is baked in at build time.
ARG VITE_API_URL=http://localhost:8787
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=apps/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
