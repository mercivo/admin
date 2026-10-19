# Google Cloud 成本与存储配置基线

> 核查日期：2026-10-19，项目：`mercivo-admin`，区域：`asia-east1`。

## 存储策略

- 运行时只使用 `mercivo-images-753805870951` 一个 Standard 单区域桶。
- 本地开发上传到 `local/`，Cloud Run 上传到 `production/`。
- 不允许回退到容器或主机本地目录；缺少 GCS 配置或凭据时直接返回存储服务不可用。
- `mercivo-private-753805870951` 已于 2026-10-12 确认为空且无代码引用，并已删除。
- `local/` 适合设置 30 天自动删除；`production/` 不设无条件删除规则。

Cloud Storage Standard 在 `asia-east1` 的存储单价约为 **US$0.02/GiB/月**。预算示例：

| 对象数据量 | 月存储费（不含请求和外网流量） |
| --- | ---: |
| 10 GiB | US$0.20 |
| 50 GiB | US$1.00 |
| 100 GiB | US$2.00 |

公网图片下载才是存储的主要变动费用，亚洲目的地低用量档一般按约 **US$0.12/GiB** 计算。小流量阶段保持 Standard，不将活跃商品图片转为 Nearline/Coldline，以避免取回费和最低保存期费用。

## Cloud SQL 现状与预算

> 2026-10-17 更新：生产已通过 `mercivo-main` 切换到 `mercivo-mysql-v2`（MySQL 8.4 Enterprise、1 vCPU / 3.75 GB、10 GB SSD、单可用区）。旧 `mercivo-mysql` 已按 `deploy/releases/v1.0.3/` 退役并删除，不再产生实例计算、100 GB SSD 和公网 IP 的持续费用。成功的源备份与 30 天最终备份保留，可能产生少量备份存储费。

2026-10-01 至 2026-10-19 项目实际费用为 **US$26.17**，几乎全部来自 Cloud SQL。该账期包含迁移前旧实例和一次性迁移费用，不能作为稳态月费：

- 旧实例 Standard storage：US$8.99；旧实例删除后不应继续增长。
- Serverless Export 200 GiB：US$2.00；迁移结束后不应继续增长。
- 当前实例 1 vCPU + 3.75 GiB 计算资源：稳态约 **US$49/月**。
- 公网 IP：约 **US$7.30/月**。
- 10 GB SSD、自动备份和 PITR：约 **US$2–6/月**。

`db-custom-1-3840` 是专用核心最低档，但不是 Cloud SQL 的绝对最低档。本阶段保持当前规格，不迁移共享核心，也不直接对生产实例降配。

当前实例的专用核心规格已是 **1 vCPU / 3.75 GB**，磁盘为 10 GB；迁移到共享核心需要另行评审和迁移，不在本轮范围。

### 推荐分阶段方案

1. 当前稳态基线：Cloud SQL 仅保留 10 GB 的 `mercivo-mysql-v2`，1 vCPU / 3.75 GB 常开，单区域、自动备份和 PITR；Cloud Run 使用请求计费、CPU 节流、`min-instances=0` / `max-instances=1`。
2. 旧 100 GB 实例已删除，预计每月减少约 US$74–80 的重叠费用；新实例稳态费用仍预计约 US$58–63/月，实际账单显示可能延迟。

Cloud Run 当前用量位于免费额内，2026-10-01 至 2026-10-19 原价 US$0.29，抵扣后为 US$0.00。

## Artifact Registry

- 保留生产使用的 `asia-east1/mercivo` 仓库。当前流量修订均使用该仓库。
- `cloud-run-source-deploy` 是旧的逐服务触发器产物。2026-10-19 核查发现历史 Cloud Run 修订仍引用其中镜像，因此只启用清理策略 dry-run，不实际删除。启用真实删除前必须先处理或明确放弃这些历史修订的回滚能力。
- `europe-west1/cloud-run-source-deploy` 仅包含 47.6 MB 旧镜像，项目部署配置无该区域引用，已于 2026-10-12 删除。
- 2026 年 9 月 Artifact Registry 实际费用约 **US$0.01**；按当前规模预算仍可按 **US$0.01–0.05/月** 估算。

## 项目月度预算

2026 年 9 月实际总费用为 **US$24.21**，但该账期包含 Cloud SQL 停机/低运行时段，不能作为数据库恢复常开后的稳定预算。按当前资源状态建议预留：

| 产品 | 月度预算 |
| --- | ---: |
| Cloud SQL（1 vCPU、3.75 GB、10 GB SSD、公网 IP，常开） | US$58–63 |
| Cloud Run（三个服务及一个迁移作业，当前处于免费额） | US$0–2 |
| Artifact Registry | US$0.01–0.05 |
| Cloud Storage（不含明显增长的公网图片流量） | US$0–2 |
| **合理费用区间** | **US$60–67/月** |
| **告警预算上限** | **US$70/月** |

## 成本控制线

- 预算 `Mercivo Monthly Cost Alert $70` 为 **US$70/月**，在 50% / 80% / 100% 实际支出和 100% 预测支出触发邮件。预算仅告警，不会自动停服。
- 迁移后的两个完整周每周检查 Cloud SQL CPU、内存、连接数、磁盘增长和慢查询；同时确认旧实例 Standard storage 与 Serverless Export SKU 不再增长。
- 暂不购买 Cloud SQL 承诺使用折扣；低流量阶段保留随时降配或迁移的灵活性更重要。

## 两周观察清单

分别在 2026-10-26 和 2026-11-02 执行并保存结果：

1. Billing Reports 按项目 `mercivo-admin`、服务、SKU 分组，确认旧实例 Standard storage 和 Serverless Export 自 2026-10-17 后无新增用量。
2. Cloud SQL Metrics 检查 CPU 利用率、内存使用率、连接数、磁盘利用率与磁盘增长；检查 Query Insights/慢查询是否存在持续异常。
3. 确认最近一次自动备份成功、PITR/二进制日志仍为 7 天、最终备份为 30 天。
4. 验证 API `/healthz`、管理端和独立站健康；确认 API `max-instances=1`、请求计费与 CPU throttling 未变化。
5. 若任一 SKU 异常增长，记录服务、SKU、日期、用量与费用，不以停止服务作为自动处置。

## 月度费用快照

每月第 2 个工作日保存上一个完整月的快照，至少包含：

| 维度 | 必填内容 |
| --- | --- |
| 项目 | `mercivo-admin` 总费用、抵扣、净费用 |
| 服务 | Cloud SQL、Cloud Run、Cloud Storage、Artifact Registry |
| Cloud SQL SKU | vCPU、RAM、SSD、IP、备份、Serverless Import/Export |
| 异常项 | 环比增幅、首次出现或超过 US$1 的 SKU |

验收线：项目总费用不超过 US$70；Cloud SQL 为 US$58–63；Cloud Run 抵扣后为 US$0–2；Storage 与 Artifact Registry 合计不超过 US$2。连续两个月 CPU、内存和连接数均明显低负载后，才单独评审 `db-g1-small` 迁移。

## 可恢复清理边界

- 旧镜像策略文件：`deploy/cost/cloud-run-source-deploy-cleanup.json`。当前必须保持 dry-run，直至历史修订回滚依赖完成专项评审。
- 迁移桶 `mercivo-db-migration-753805870951` 不在本轮删除范围。最终备份保留期结束、恢复演练确认且形成精确对象清单、验证查询和回滚决策后，再单独执行可恢复清理。
