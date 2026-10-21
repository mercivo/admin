# 环境变量说明

`.env.local` 只用于本机 Docker Compose，必须保持在 Git 忽略列表中。线上 Cloud Run 的密钥来自 Secret Manager，普通配置来自服务环境变量；两边不要复制同一份完整 env 文件。

## 本地 Docker Compose

| 变量 | 含义 | 是否敏感 |
| --- | --- | --- |
| `ENV_FILE` | Compose 传给 API/migrate 容器的 env 文件路径，固定为 `.env.local` | 否 |
| `GCLOUD_CONFIG_DIR` | 本机 gcloud 配置目录的绝对路径，Compose 只读挂载 ADC 凭据 | 是 |
| `DB_HOST_PORT` | 本机访问 MySQL 的映射端口；容器内仍使用 `3306` | 否 |
| `REDIS_HOST_PORT` | 本机访问 Redis 的映射端口；容器内仍使用 `6379` | 否 |
| `API_PORT` | API 映射到本机的端口 | 否 |
| `ADMIN_PORT` | Admin 映射到本机的端口 | 否 |
| `STOREFRONT_PORT` | Storefront 映射到本机的端口 | 否 |
| `STOREFRONT_URL` | Admin 构建时使用的前台预览地址 | 否 |
| `DB_PASSWORD` | 本地 MySQL root 密码 | 是 |
| `DB_DATABASE` | 业务数据库名 | 否 |
| `DB_POOL_MAX` | 单个 API 实例的最大数据库连接数 | 否 |
| `DB_SYNCHRONIZE` | TypeORM 自动同步表结构；所有环境固定为 `false` | 否 |
| `DB_SCHEMA_BOOTSTRAP` | 仅旧式空库兼容开关；当前迁移完整，固定为 `false` | 否 |
| `SEED_DATA_ENABLED` | 是否写入演示数据；正式开发数据基线固定为 `false` | 否 |
| `SYSTEM_ADMIN_BOOTSTRAP_ENABLED` | migrate 阶段是否确保系统管理员存在 | 否 |
| `SYSTEM_ADMIN_USERNAME` | 唯一保留的系统管理员用户名 | 否 |
| `SYSTEM_ADMIN_PASSWORD` | 系统管理员初始化/重置密码 | 是 |
| `JWT_SECRET` | JWT 签名密钥，本地与线上必须不同 | 是 |
| `JWT_EXPIRES_IN` | 登录令牌有效期，生产固定为 `24h` | 否 |
| `CORS_ORIGINS` | 允许跨域访问 API 的来源列表 | 否 |
| `STOREFRONT_PREVIEW_HOSTS` | 允许作为前台预览入口的 Host 列表 | 否 |
| `STOREFRONT_CNAME_TARGET` | 租户 CNAME 引导目标；本地使用 `localhost` | 否 |
| `TRUST_PROXY_HOPS` | API 信任的反向代理跳数 | 否 |
| `GCS_PROJECT_ID` | GCS 所属 Google Cloud 项目 | 否 |
| `GCS_BUCKET` | 统一的公开图片桶；不同环境通过对象前缀隔离 | 否 |
| `GCS_PUBLIC_BASE_URL` | 返回给客户端的公开图片基地址；当前生产使用 `https://storage.googleapis.com/mercivo-images-753805870951` | 否 |
| `GCS_OBJECT_PREFIX` | 对象环境目录；本地为 `local`，线上为 `production` | 否 |

本地 GCS 使用 `gcloud auth application-default login` 生成的 Application Default Credentials，不创建服务账号 JSON 长期密钥。Compose 通过 `GCLOUD_CONFIG_DIR` 将 gcloud 配置目录只读挂载到容器内，API 仅读取 `/run/gcloud/application_default_credentials.json`。

项目只使用 `mercivo-images-753805870951` 一个运行时存储桶：本地对象写入 `local/`，Cloud Run 对象写入 `production/`。旧的 `GCS_PRIVATE_BUCKET` 配置不再被代码读取，不应在新环境中配置。

在独立图片域名完成 DNS、TLS 和源站映射前，不得将 `GCS_PUBLIC_BASE_URL` 指向该域名。管理端和前台会把历史 `https://image.aihubflux.com/` 地址兼容转换到当前公开 GCS 地址，避免修改生产业务数据。

## Cloud Run

线上沿用数据库、JWT、域名和 GCS 变量，但：

- `NODE_ENV=production`
- `DB_SOCKET_PATH=/cloudsql/mercivo-admin:asia-east1:mercivo-mysql`
- `GCS_OBJECT_PREFIX=production`
- `DB_PASSWORD`、`JWT_SECRET`、`SYSTEM_ADMIN_PASSWORD` 必须来自 Secret Manager
- Cloud Run 使用运行时服务账号访问 GCS，不配置或上传 JSON 密钥

## 已移除变量

- `ADMIN_EMAIL`、`ADMIN_PASSWORD`：代码中没有读取，旧 seed 遗留。
- `DEMO_TENANT_PHONE`、`DEMO_TENANT_PASSWORD`：仅在启用演示 seed 时使用；当前所有环境禁止演示 seed。
- `ADMIN_DOMAIN`、`TLS_EMAIL`：只属于已弃用的本机 Caddy production overlay，不应放入日常 `.env.local`。

## 必须初始化的数据

清空后只保留或自动确保以下平台数据：

1. TypeORM `migrations` 记录：防止已执行迁移重复运行。
2. 唯一启用的 `system_admin` 用户：平台首次登录入口。
3. `plans` 平台套餐配置：至少保留 `trial`，注册租户和权限上限依赖它。

租户、站点、域名、商品、客户、站点版本、字典、成员和 Sitemap 状态均不属于空系统的必需数据。

## 安全重置

`npm run data:reset` 要求 `RESET_ENVIRONMENT`、`RESET_DATA_CONFIRM=mercivo-admin:<environment>:DELETE_BUSINESS_DATA` 和完全匹配的 `GCS_OBJECT_PREFIX`。默认的 `RESET_STORAGE_SCOPE=prefix` 只清理 `<GCS_OBJECT_PREFIX>/` 目录。

只有一次性清理历史遗留的无前缀模拟文件时才可设置 `RESET_STORAGE_SCOPE=all`；此时还必须提供 `RESET_STORAGE_CONFIRM=mercivo-admin:<environment>:DELETE_ALL_STORAGE_OBJECTS`。脚本会先验证统一图片桶可访问，再开始数据库清理。
