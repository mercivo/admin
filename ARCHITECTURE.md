# Mercivo 业务与系统架构

## 产品定位

Mercivo 是面向外贸企业的「外贸 ERP + 品牌独立站」平台。管理后台使用中文界面；独立站可配置多语言内容。

## 业务模块

| 一级模块 | 核心能力 | 当前边界 |
| --- | --- | --- |
| 外贸 ERP | 经营概览、商品管理、客户等级、客户管理 | 管理商品基础信息、分类、规格、价格、库存、发布状态以及客户档案、分级与备注。 |
| 品牌独立站 | 站点设计、预览、发布、版本回滚、域名与 SEO | 使用预设区块编排首页、商品、品牌介绍、联系方式与页脚；公开站只读取已发布快照。 |
| 系统管理 | 商户、套餐、配额、团队、字典 | 为 ERP 和独立站提供账号、权限、配额与基础配置，不承载第三个业务大模块。 |

项目不包含 CRM、营销自动化或生成式 AI 功能。公开站的联系入口展示企业维护的邮箱、电话、WhatsApp 和地址，不在平台内沉淀销售流程数据。

## 信息架构

```text
外贸 ERP
├─ 经营概览
├─ 商品管理
│  ├─ 商品列表
│  └─ 商品分类
└─ 客户管理
品牌独立站
└─ 站点设计
系统管理
├─ 账号设置
└─ 团队管理
```

## 独立站设计

- 采用「预设模板 + 区块配置」，支持导航、首屏、品牌介绍、商品列表、联系方式和页脚。
- 站点内容随发布生成不可变版本快照；线上访问不读取后台草稿。
- 多语言内容由商户直接维护，品牌名、SKU、数字、单位、链接和 HTML 结构保持稳定。
- SEO 在站点入口统一配置，生成 canonical、robots.txt、sitemap.xml、Open Graph 和 hreflang。
- 商品页标题和描述由商品名称、站点品牌与商品摘要按固定模板派生。

## 模块依赖

```mermaid
flowchart LR
  ERP["外贸 ERP<br/>商品 / 客户"] --> SITE["品牌独立站<br/>设计 / 发布"]
  SITE --> PUBLIC["公开站<br/>商品展示 / 联系方式"]
  SYSTEM["系统管理<br/>商户 / 权限 / 配额"] --> ERP
  SYSTEM --> SITE
```

## 应用边界

- `frontend`：内部管理后台，维护 ERP 数据、站点内容、发布版本与系统配置。
- `storefront`：面向访客的公开独立站，只消费已发布快照。
- `backend`：统一业务 API、商户隔离、站点/域名解析和版本发布。
- MySQL：业务主数据与发布版本；Redis：缓存和验证码等短期状态。

## 站点发布流

```mermaid
flowchart LR
  A[后台维护商品与站点内容] --> B[保存草稿]
  B --> C[发布站点]
  C --> D[生成不可变 SiteVersion 快照]
  D --> E[域名解析到已发布版本]
  E --> F[访客浏览公开独立站]
```

后台预览通过站点 slug 打开公开站；生产域名由 `site_domains` 映射到站点。内容异常时可回滚到历史发布版本。

## 运行与安全

| 服务 | 默认地址 |
| --- | --- |
| Storefront | `http://localhost:8080` |
| Admin | `http://localhost:8088` |
| API | `http://localhost:3000/api/v1` |
| MySQL | `localhost:3307` |
| Redis | `localhost:6381` |

```bash
make local-up
```

- JWT 携带 `tenantId/siteId/role`，后台 API 使用 RBAC 和租户范围查询。
- `system_admin` 不归属商户，只访问 `/system` 管理商户、套餐及 ERP/独立站配额。
- 商户停用或账号禁用会在下一次 API 请求时使已有 JWT 失效。
- 生产环境关闭 `DB_SYNCHRONIZE`，启动时先执行 TypeORM migrations，再执行幂等初始化。
- 默认 `SEED_DATA_ENABLED=false`；`SYSTEM_ADMIN_BOOTSTRAP_ENABLED=true` 仅确保系统管理员存在。
- 自定义域名完成 TXT 所有权验证后才可激活；TLS 证书由边缘网关或云负载均衡负责。

## 核心数据模型

- `tenants`：商户边界。
- `users`：平台管理员与商户成员。
- `products`、`customers`、`customer_levels`：ERP 主数据。
- `sites`、`site_domains`、`site_versions`：独立站配置、域名和发布快照。
- `plans`、`subscriptions`：商品、成员和站点配额。
- `dict_*`：ERP 与独立站使用的业务字典。

历史迁移保留旧版本升级轨迹；最新移除迁移负责在既有数据库中删除已下线模块的表和字段。
