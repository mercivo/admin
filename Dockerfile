FROM node:20-alpine AS api-builder
WORKDIR /build/api
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS admin-builder
WORKDIR /build/admin
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_STOREFRONT_PREVIEW_URL=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STOREFRONT_PREVIEW_URL=$VITE_STOREFRONT_PREVIEW_URL
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS storefront-builder
WORKDIR /build/storefront
COPY storefront/package*.json ./
RUN npm ci
COPY storefront/ ./
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache dumb-init nginx wget \
  && mkdir -p /run/nginx /var/lib/nginx/tmp /var/log/nginx /srv/admin /app/storefront/dist

COPY --from=api-builder /build/api/node_modules ./node_modules
COPY --from=api-builder /build/api/dist ./dist
COPY --from=api-builder /build/api/package.json ./package.json
COPY --from=admin-builder /build/admin/dist /srv/admin
COPY --from=storefront-builder /build/storefront/dist ./storefront/dist
COPY storefront/server.mjs ./storefront/server.mjs
COPY deploy/cloudrun/start-api.sh ./start-api.sh
COPY deploy/cloudrun/start-unified.sh ./start-unified.sh
COPY deploy/cloudrun/unified.nginx.conf /etc/nginx/nginx.conf

RUN chmod +x ./start-api.sh ./start-unified.sh \
  && chown -R node:node /app /srv/admin /run/nginx /var/lib/nginx /var/log/nginx

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start-unified.sh"]
