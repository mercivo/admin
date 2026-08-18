# ============================================================
# Stage 1: 构建 NestJS 后端
# ============================================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci && npm cache clean --force
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src/ ./src/
RUN npm run build && npm prune --production

# ============================================================
# Stage 2: 构建 React 前端
# ============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force
COPY frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.mts frontend/index.html ./
COPY frontend/src/ ./src/
RUN npm run build

# ============================================================
# Stage 3: 生产镜像（Nginx + Node.js + Supervisord）
# ============================================================
FROM node:20-alpine AS production

# 安装 nginx 和 supervisor
RUN apk add --no-cache nginx supervisor dumb-init && \
    mkdir -p /run/nginx /var/log/supervisor /var/log/nginx && \
    chown -R node:node /var/log/nginx

# ---- 后端 ----
WORKDIR /app
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package.json ./

# ---- 前端 ----
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf

# ---- Supervisor 配置 ----
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 权限
RUN chown -R node:node /app /var/log/supervisor && \
    chown -R node:node /var/lib/nginx /run/nginx

USER node

EXPOSE 80

ENTRYPOINT ["dumb-init", "--"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]