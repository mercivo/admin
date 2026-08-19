# 本地容器部署

本地部署复用线上三个根目录 Dockerfile，不维护第二套镜像定义：

```text
localhost:8088 -> admin:8080      -> api:8080
localhost:8080 -> storefront:8080 -> api:8080
localhost:3000 -> api:8080        -> mysql:3306 / redis:6379
                         migrate -> mysql:3306 (one-shot before API)
```

## 使用

```bash
make local-init
# 按需编辑 .env.local
make local-config
make local-up
make local-logs
```

所有可变的本地端口、账号、数据库、初始化和可选 GCS 配置都集中在 `.env.local`。`docker-compose.yml` 只保留不会因开发者环境变化的容器内部地址。`migrate` 一次性容器对应线上的 `mercivo-migrate` Cloud Run Job，成功后 API 才会启动。

直接使用 Compose 时必须显式指定配置文件：

```bash
docker compose --env-file .env.local up -d --build
```

`.env.local` 不提交；新增变量时同时更新 `.env.local.example`。线上 Cloud Run 的环境变量和 Secret Manager 配置不从该文件读取。
