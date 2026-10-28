# aihubflux.com 域名映射

## 固定服务域名

| 公网域名 | Cloud Run 服务 | 服务内配置 |
| --- | --- | --- |
| `erp.aihubflux.com` | `mercivo-admin` | `API_INTERNAL_URL` 和 `API_INTERNAL_HOST` 由 `cloudbuild.yaml` 动态发现 |
| `api.aihubflux.com` | `mercivo-api` | `CORS_ORIGINS=https://erp.aihubflux.com`、`STOREFRONT_PREVIEW_HOSTS=site.aihubflux.com`、`STOREFRONT_CNAME_TARGET=customers.aihubflux.com` |
| `site.aihubflux.com` | `mercivo-storefront` | `API_INTERNAL_URL` 由 `cloudbuild.yaml` 动态发现；`STOREFRONT_PATH_HOSTS=site.aihubflux.com` |

Cloudflare 中这三个名称只创建 Cloud Run 映射流程要求的记录，不修改根域名、邮件、图片或账号内其他 Zone 的记录。

## 租户访问

平台提供两种入口：

1. 共享入口：`https://site.aihubflux.com/<tenantId>`，也兼容站点 slug。
2. 自定义域名：租户先添加 `_mercivo-verification.<hostname>` TXT 完成所有权验证，再把 hostname CNAME 到 `customers.aihubflux.com`。Cloudflare for SaaS 经专用 Worker 回源到 `site.aihubflux.com`。

共享入口的租户参数会透传给站点、商品详情、客户登录、robots 和 sitemap 请求。自定义域名不使用路径参数，继续根据 `X-Forwarded-Host`/`Host` 查询已启用的 `site_domains` 记录。

Cloud Run 原生域名映射只能覆盖三个平台固定域名，不能为数量不断增长的租户 hostname 自动签发证书。租户自定义域名通过 `aihubflux.com` Zone 的 Cloudflare for SaaS Custom Hostnames 接入；API 只有在 Custom Hostname 与边缘证书均为 active 后才把业务域名标记为可用。
