# Google Cloud Run 部署指南

本项目使用三个独立 Cloud Run 服务，不再提供根目录统一 `Dockerfile`：

1. **Cloud Run 控制台分别连接代码库**：创建三个服务，分别选择 `/Dockerfile.api`、`/Dockerfile.storefront` 和 `/Dockerfile.admin`。
2. **统一 Cloud Build 流水线**：创建使用仓库根目录 `/cloudbuild.yaml` 的触发器，由一次构建分别部署 API、管理后台和 storefront。

当前 Google Cloud 参数为：项目 `mercivo-admin`，区域 `asia-east1`，Cloud SQL 连接名默认 `mercivo-admin:asia-east1:mercivo-mysql`。这些值属于当前项目，没有沿用参考项目 `celuxent` 的配置。

流水线使用 Cloud Build 默认构建机型，不强制指定 `E2_HIGHCPU_8`。所有镜像串行构建，避免默认小机型并行构建时内存不足。如果项目或区域没有高 CPU 构建配额，强制设置该机型会在构建开始前报 `failed precondition: due to quota restrictions`。

三个 Cloud Run 服务均为 `min=0`、`max=1`、`1 CPU / 512 MiB`，空闲时可以缩容到零。流水线先部署 API，再自动读取其 Cloud Run URL 并注入 storefront；随后读取 storefront URL 构建管理后台，首次部署不需要预先准备 `api/admin/sites` 三个域名。

## 0. Cloud Run 控制台分别连接代码库

需要创建三次服务，三项都选择：持续部署 → 从代码库、分支 `^main$`、构建类型 Dockerfile、区域 `asia-east1`、允许未经身份验证的调用、容器端口 `8080`。

| 创建顺序 | Cloud Run 服务 | 来源位置 | 运行时配置 |
| --- | --- | --- | --- |
| 1 | `mercivo-api` | `/Dockerfile.api` | Cloud SQL、数据库/JWT Secret 及 API 环境变量 |
| 2 | `mercivo-storefront` | `/Dockerfile.storefront` | `API_INTERNAL_URL=https://mercivo-api-xxx.run.app` |
| 3 | `mercivo-admin-ui` | `/Dockerfile.admin` | `API_INTERNAL_URL=https://mercivo-api-xxx.run.app` |

只有 API 服务需要关联 Cloud SQL 实例 `mercivo-admin:asia-east1:mercivo-mysql`，并使用 `mercivo-runtime@mercivo-admin.iam.gserviceaccount.com` 运行。普通环境变量参考 `deploy/cloudrun/direct.env.example`；以下敏感变量从 Secret Manager 注入：

- `DB_PASSWORD` → `mercivo-db-password:latest`
- `JWT_SECRET` → `mercivo-jwt-secret:latest`
- `SYSTEM_ADMIN_PASSWORD` → `mercivo-system-admin-password:latest`

全新空数据库第一次部署时，把 `DB_SCHEMA_BOOTSTRAP` 临时设置为 `true`。首次部署成功后立即改回 `false`，后续版本只运行 TypeORM migration，不再执行 schema synchronize。

先部署 API 并确认 `/healthz` 返回 200，再把其完整 `https://...run.app` 地址作为另外两个服务的 `API_INTERNAL_URL`。Admin 浏览器继续请求同源 `/api/v1`，由 Admin Nginx 转发到 API，因此不依赖浏览器跨域；Storefront 同样由服务端转发并保留租户原始 Host。

Cloud Run 自动生成的服务 URL 虽然包含一段哈希，但它属于服务而不是 revision，发布新 revision 后不会变化。也可以在域名准备好后统一改成 `API_INTERNAL_URL=https://api.mercivo.com`。三服务调用链如下：

```text
浏览器 -> mercivo-admin-ui.run.app/api/* -> Admin Nginx -> API_INTERNAL_URL
浏览器 -> mercivo-storefront.run.app/api/* -> Storefront Node -> API_INTERNAL_URL
```

Admin 和 Storefront 均不在浏览器中直接暴露 Cloud Run API 地址。两者的 `API_INTERNAL_URL` 必须填写 API 服务详情页显示的完整 HTTPS URL，不能填写 revision 名称、容器名或 `localhost`。当前方案要求 API 服务允许未经身份验证的调用；如果后续关闭公开调用，需要在代理层增加 Google ID Token，不能只切换 Cloud Run 的认证开关。

如果 API revision 报“未监听 `PORT=8080`”，先查看 revision 日志中该提示之前的应用错误。API 本身会读取 Cloud Run 注入的 `PORT`；常见真实原因是 Cloud SQL 未绑定、`DB_SOCKET_PATH` 错误、Secret 未授权或 migration 失败，导致 NestJS 在开始监听前退出。

直接连接代码库使用的 `/Dockerfile.api` 内置启动网关：容器会立即监听 Cloud Run 注入的 `PORT=8080`，数据库初始化期间返回带 `Retry-After` 的 503 JSON；migration 和种子补全完成后启动内部 NestJS 并自动转发流量。日志中依次出现以下内容代表启动成功：

```text
Startup gateway listening on 0.0.0.0:8080
Database preparation completed
Server running on http://localhost:3000
API ready; gateway forwarding 8080 -> 3000
```

这项网关只解决“数据库准备完成前没有端口监听”的启动探针问题，不会吞掉数据库错误。Cloud SQL、Secret 或 migration 失败时，容器会明确输出 `API startup failed` 后退出，应继续按其前一条错误修复配置。

直接连接代码库模式不会自动执行独立的 migration Job。API 容器启动时会运行 migration，所以在创建表完成前保持 `max instances=1`；正式扩容时建议切换到 `cloudbuild.yaml`，由 `mercivo-migrate` Job 在 API revision 更新前执行迁移。

## 1. 前置资源

所有资源建议使用同一区域，默认示例为 `asia-east1`。

- Artifact Registry Docker 仓库：`mercivo`
- Cloud SQL for MySQL 8：数据库 `seo_platform`，用户 `mercivo`
- Secret Manager：
  - `mercivo-db-password`
  - `mercivo-jwt-secret`
  - `mercivo-system-admin-password`
- 运行服务账号：`mercivo-runtime@PROJECT_ID.iam.gserviceaccount.com`

首次启动可以暂不创建 Redis 和 Cloud Storage：未配置 `REDIS_HOST` 时验证码保存在 API 实例内存中，流水线会把 API 限制为最多 1 个实例；未配置存储桶时商品图片上传功能会返回“存储未配置”。正式扩容前再创建 Memorystore、VPC Connector 和存储桶。

启用 API：

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

创建镜像仓库和运行账号：

```bash
gcloud artifacts repositories create mercivo \
  --repository-format=docker \
  --location=asia-east1

gcloud iam service-accounts create mercivo-runtime \
  --display-name="Mercivo Cloud Run runtime"
```

运行账号至少需要：

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:mercivo-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:mercivo-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 2. Cloud Build 服务账号权限

在 Cloud Build → 设置中确认实际执行构建的服务账号。为该账号授予：

- Cloud Run Admin：`roles/run.admin`
- Artifact Registry Writer：`roles/artifactregistry.writer`
- Service Account User：对 `mercivo-runtime` 授予 `roles/iam.serviceAccountUser`
- Cloud Build Service Account：`roles/cloudbuild.builds.builder`

示例：

```bash
BUILD_SA="PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/artifactregistry.writer"

gcloud iam service-accounts add-iam-policy-binding \
  mercivo-runtime@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

部分新项目使用 Compute Engine 默认服务账号执行 Cloud Build，不要直接假定一定是 `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`，应以 Cloud Build 设置页面显示的账号为准。

## 3. 创建触发器

当前 Git 远端是 `https://github.com/mercivo/admin.git`：仓库所有者是 GitHub 组织 `mercivo`，不是本机使用的个人账号 `zhanggj3`。先由组织管理员在 GitHub Organization `mercivo` → Settings → GitHub Apps 中确认 Google Cloud Build GitHub App 已安装，并明确授权 `admin` 仓库。仅给个人账号授权时，Google Cloud 控制台可能一直等待组织仓库授权并最终报 `Deadline expired before operation could complete`。完成授权后，再在 Cloud Build → 代码库中连接 `mercivo/admin`。

创建触发器时选择：

- 事件：推送到分支
- 分支：`^main$`
- 配置类型：Cloud Build 配置文件
- 配置文件：`/cloudbuild.yaml`
- 不要选择 `/Dockerfile`

设置以下替换变量，必须把示例值替换成真实资源：

| 变量 | 示例 |
| --- | --- |
| `_REGION` | `asia-east1` |
| `_CLOUD_SQL_INSTANCE` | `mercivo-admin:asia-east1:mercivo-mysql` |
| `_DB_USER` | `mercivo` |
| `_DB_NAME` | `seo_platform` |
| `_STOREFRONT_CNAME_TARGET` | `sites.mercivo.com` |

API、管理后台和 storefront 的默认 `run.app` 地址由流水线自动发现，不再需要 `_ADMIN_ORIGIN`、`_API_PUBLIC_URL` 或 `_STOREFRONT_PUBLIC_URL`。

如果控制台连接仓库时持续出现 `Deadline expired before operation could complete`，可绕过该页面，用 CLI 创建触发器：

```bash
gcloud builds triggers create github \
  --name=mercivo-main \
  --region=asia-east1 \
  --repo-owner=mercivo \
  --repo-name=admin \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --substitutions=_REGION=asia-east1,_CLOUD_SQL_INSTANCE=mercivo-admin:asia-east1:mercivo-mysql,_STOREFRONT_CNAME_TARGET=sites.mercivo.com
```

如果 CLI 报仓库未连接，先重新安装或更新 `mercivo` 组织中的 Cloud Build GitHub App 授权；如果报权限错误，检查操作者是否具备 `roles/cloudbuild.connectionAdmin`、`roles/cloudbuild.builds.editor` 和 Service Usage 权限。若使用 Developer Connect/第二代代码库，请确保 Connection、Repository Link 和 Trigger 位于同一区域；若使用传统 Cloud Build GitHub App，则优先在 `global` 区域创建触发器。

## 4. 数据库和 Redis

Cloud Run 不能使用 `docker-compose.yml` 中的本地 MySQL、Redis Volume。流水线使用：

- Cloud SQL Unix Socket：`/cloudsql/PROJECT:REGION:INSTANCE`
- 首次启动使用 API 单实例内存验证码，不依赖 Redis

需要水平扩容 API 时，创建 Memorystore Redis 和 Serverless VPC Access Connector，配置 `REDIS_HOST`/`REDIS_PORT` 并恢复多个 API 实例。商品图片上传需要另行配置 `GCS_BUCKET`、`GCS_PROJECT_ID` 和可选的 `GCS_PUBLIC_BASE_URL`。

每次部署会先运行 `mercivo-migrate` Cloud Run Job，迁移成功后才更新 API，避免多个 API 实例同时执行迁移。

## 5. 域名

- `admin.mercivo.com` → `mercivo-admin-ui`
- `api.mercivo.com` → `mercivo-api`
- `sites.mercivo.com` → `mercivo-storefront`

租户自定义域名按请求 `Host` 查询 `site_domains.hostname`，因此所有租户可以进入同一个 storefront 服务。需要注意，Cloud Run 原生域名映射不适合动态增加大量租户域名；生产环境应在 storefront 前使用 Google Cloud External HTTPS Load Balancer + Serverless NEG + Certificate Manager，或 Cloudflare for SaaS，并确保把租户原始域名传入 `Host` 或 `X-Forwarded-Host`。

推荐的生产流量边界：

- `admin.mercivo.com` 只进入 admin 服务；admin 构建时使用 `https://api.mercivo.com/api/v1`。
- `api.mercivo.com` 只进入 API 服务；CORS 仅允许 `https://admin.mercivo.com`。
- `sites.mercivo.com` 和所有已验证租户域名只进入 storefront 服务。
- 租户在后台先添加域名并配置 TXT 完成所有权验证，再配置 CNAME 到 `sites.mercivo.com`；根域名使用 DNS 服务商的 ALIAS/ANAME 或由接入层提供的 A/AAAA。
- 域名验证成功只代表应用允许解析该 Host，不等于 HTTPS 证书已经签发。证书必须由 External HTTPS Load Balancer + Certificate Manager 自动化，或由 Cloudflare for SaaS 托管。

如果租户数量会持续增长，优先选择 Cloudflare for SaaS：它原生覆盖自定义 hostname 的验证、证书签发和续期。若必须纯 Google Cloud，则需要额外实现一个域名控制面，在 TXT 验证成功后调用 Certificate Manager 创建/绑定证书，并在删除域名时清理证书；仅设置 CNAME 并不能让 Cloud Run 自动接受任意租户域名。

## 6. 首次验证

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-east1,_CLOUD_SQL_INSTANCE=mercivo-admin:asia-east1:mercivo-mysql,_STOREFRONT_CNAME_TARGET=sites.mercivo.com

gcloud run services list --region=asia-east1
gcloud run jobs executions list --job=mercivo-migrate --region=asia-east1
```
