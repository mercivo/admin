# Mercivo 自托管上线清单（非 Cloud Run）

Cloud Run 是当前正式线上方案，见 `deploy/cloudrun/README.md`。本文件仅用于需要在单台服务器上通过 Compose + Caddy 自托管的场景。

## 必需环境变量

复制 `.env.local.example` 为服务器上的 `.env.production`，设置 `ENV_FILE=.env.production`，并至少覆盖：

```env
ENV_FILE=.env.production
DB_PASSWORD=使用密码管理器生成的强密码
DB_SCHEMA_BOOTSTRAP=false
JWT_SECRET=至少64位随机字符串
ADMIN_DOMAIN=admin.example.com
TLS_EMAIL=ops@example.com
STOREFRONT_CNAME_TARGET=sites.example.com
CORS_ORIGINS=https://admin.example.com
SYSTEM_ADMIN_PASSWORD=使用密码管理器生成的强密码
```

## DNS

1. 将 `admin.example.com` 的 A/AAAA 记录指向服务器。
2. 将 `sites.example.com` 的 A/AAAA 记录指向服务器。
3. 商户按后台“站点配置”中的指引添加 TXT 所有权验证记录。
4. 商户将自定义域名 CNAME 到 `STOREFRONT_CNAME_TARGET`。
5. 根域名不能使用 CNAME 时，使用 DNS 提供商的 ALIAS/ANAME，或直接配置 A/AAAA。

## 启动

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

Caddy 只会为数据库中已验证且启用的域名按需签发证书，可避免开放式证书签发风险。
生产编排会在关键密码或域名变量缺失时直接拒绝启动，避免误用仓库中的本地开发默认值。

## 上线验收

- `https://ADMIN_DOMAIN` 可登录且浏览器证书有效。
- 商户域名 TXT 验证成功，CNAME 指向平台后 HTTPS 可访问。
- 查看网页源代码时已有商户独立的 title、description、canonical、hreflang、JSON-LD 和正文。
- `/robots.txt` 与 `/sitemap.xml` 返回当前域名内容，不出现其他商户数据。
- 未发布、停用、过期商户域名返回 404。
- `/products/{id}` 返回商品独立 title、description、Product JSON-LD。
- 数据库与 Caddy `/data` 均已纳入每日备份。
- 对 80/443 开放公网访问，数据库、Redis、API 不直接暴露公网端口。
