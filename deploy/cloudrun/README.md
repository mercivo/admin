# Google Cloud Run 部署指南

本项目包含 `api`、`admin`、`storefront` 三个独立服务。Cloud Run 控制台中的“从代码库持续部署 → Dockerfile”一次只能创建一个服务，不能用根目录 `/Dockerfile` 完整部署本项目。生产环境请创建一个以仓库根目录 `cloudbuild.yaml` 为配置文件的 Cloud Build 触发器，由它统一测试、构建、迁移并部署三个 Cloud Run 服务。

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
| `_CLOUD_SQL_INSTANCE` | `project-id:asia-east1:mercivo-mysql` |
| `_ADMIN_ORIGIN` | `https://admin.mercivo.com` |
| `_API_PUBLIC_URL` | `https://api.mercivo.com` |
| `_STOREFRONT_PUBLIC_URL` | `https://sites.mercivo.com` |
| `_STOREFRONT_CNAME_TARGET` | `sites.mercivo.com` |

如果控制台连接仓库时持续出现 `Deadline expired before operation could complete`，可绕过该页面，用 CLI 创建触发器：

```bash
gcloud builds triggers create github \
  --name=mercivo-main \
  --region=asia-east1 \
  --repo-owner=mercivo \
  --repo-name=admin \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --substitutions=_REGION=asia-east1,_CLOUD_SQL_INSTANCE=PROJECT_ID:asia-east1:mercivo-mysql,_ADMIN_ORIGIN=https://admin.mercivo.com,_API_PUBLIC_URL=https://api.mercivo.com,_STOREFRONT_PUBLIC_URL=https://sites.mercivo.com,_STOREFRONT_CNAME_TARGET=sites.mercivo.com
```

如果 CLI 报仓库未连接，先重新安装或更新 `mercivo` 组织中的 Cloud Build GitHub App 授权；如果报权限错误，检查操作者是否具备 `roles/cloudbuild.connectionAdmin`、`roles/cloudbuild.builds.editor` 和 Service Usage 权限。若使用 Developer Connect/第二代代码库，请确保 Connection、Repository Link 和 Trigger 位于同一区域；若使用传统 Cloud Build GitHub App，则优先在 `global` 区域创建触发器。

## 4. 数据库和 Redis

Cloud Run 不能使用 `docker-compose.yml` 中的本地 MySQL、Redis Volume。流水线使用：

- Cloud SQL Unix Socket：`/cloudsql/PROJECT:REGION:INSTANCE`
- 首次启动使用 API 单实例内存验证码，不依赖 Redis

需要水平扩容 API 时，创建 Memorystore Redis 和 Serverless VPC Access Connector，配置 `REDIS_HOST`/`REDIS_PORT` 并恢复多个 API 实例。商品图片上传需要另行配置 `GCS_BUCKET`、`GCS_PROJECT_ID` 和可选的 `GCS_PUBLIC_BASE_URL`。

每次部署会先运行 `mercivo-migrate` Cloud Run Job，迁移成功后才更新 API，避免多个 API 实例同时执行迁移。

## 5. 域名

- `admin.mercivo.com` → `mercivo-admin`
- `api.mercivo.com` → `mercivo-api`
- `sites.mercivo.com` → `mercivo-storefront`

租户自定义域名按请求 `Host` 查询 `site_domains.hostname`，因此所有租户可以进入同一个 storefront 服务。需要注意，Cloud Run 原生域名映射不适合动态增加大量租户域名；生产环境应在 storefront 前使用 Google Cloud External HTTPS Load Balancer + Serverless NEG + Certificate Manager，或 Cloudflare for SaaS，并确保把租户原始域名传入 `Host` 或 `X-Forwarded-Host`。

## 6. 首次验证

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-east1,_CLOUD_SQL_INSTANCE=PROJECT_ID:asia-east1:mercivo-mysql,_ADMIN_ORIGIN=https://admin.mercivo.com,_API_PUBLIC_URL=https://api.mercivo.com,_STOREFRONT_PUBLIC_URL=https://sites.mercivo.com,_STOREFRONT_CNAME_TARGET=sites.mercivo.com

gcloud run services list --region=asia-east1
gcloud run jobs executions list --job=mercivo-migrate --region=asia-east1
```
