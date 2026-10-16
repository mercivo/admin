# Mercivo 第一版上线前修复与验收报告

- 验收时间：2026-10-16 02:27–02:36（Asia/Shanghai）
- 验收源码提交基线：`a4a0ba989c56dc00efba592d6bbc7229dc80a0a9`
- Node.js：`v22.18.0`
- Docker：`29.2.1`
- Docker Compose：`v5.1.0`
- 结论：**通过**

## 一、实施结果

1. 已执行 `make local-reset`，仅删除 Mercivo Compose 容器、MySQL 卷和 Redis 卷。
2. 已从当前源码重新构建并启动 MySQL、Redis、迁移任务、API、Admin、Storefront。
3. 初始化核验通过：迁移 1 条、系统管理员 1 条；租户、站点、商品、采购单、销售单均为 0；未导入演示业务数据。
4. 最终验收后未再次清理数据库或 Redis，服务保持运行，UAT 数据完整保留。

## 二、关键修复

- 将历史迁移归并为唯一可验证的初始基线，空库执行后 TypeORM schema diff 为 0。
- 注册事务补齐管理员 TeamMember；修复公开询盘指派管理员的兼容逻辑。
- 后端 API E2E 去除硬编码密码、演示租户和测试后清理行为，改为环境凭据和唯一运行号。
- 翻译 Excel 处理从存在已知漏洞且无修复版本的 `xlsx` 切换到 `exceljs`。
- 升级 NestJS、multer、mysql2、axios、Tiptap 等生产依赖，三个应用生产依赖审计均为 0 漏洞。
- 修复 Tiptap 3 重复 Link 扩展和编辑器初始化时序导致的商品新建页白屏。
- 修复语言持久化、Storefront 语言切换、销售确认弹窗、商品价格字重等回归问题。
- Playwright 增加全局真实环境初始化、HTML/JUnit 报告以及失败 trace/截图/视频留存。

## 三、自动化结果

| 门禁 | 结果 |
| --- | --- |
| 后端单元测试 | 29 suites / 174 tests 全部通过 |
| 后端真实数据库 API E2E | 7 / 7 通过 |
| 真实 API 全业务链 UAT | 44 / 44 检查通过 |
| Chromium 全量回归 | 52 / 52 通过 |
| ASCII `-` 空值占位扫描 | 通过 |
| Backend 生产构建 | 通过 |
| Admin 生产构建 | 通过，主包 gzip 469.16 KB |
| Storefront 生产构建 | 通过，主包 gzip 282.65 KB |
| Backend/Admin/Storefront `npm audit --omit=dev` | 0 / 0 / 0 漏洞 |
| API/Admin/Storefront HTTP 冒烟 | 全部通过 |
| 容器异常日志扫描 | 未发现迁移失败、未处理异常、数据库异常或持续重启 |

## 四、业务一致性与数据留存

主验收运行号：`UAT-20261016-FINAL`

- 租户：`59afc798-05a4-4761-8df6-b7a6b4b0cec2`
- 站点：`8ac7d78a-2e53-42ee-a727-f2d293cf2dea`
- 公开站点 slug：`site-89034676-mv9vjh31`
- 商品：`33e9d49a-3072-4776-a020-b4afe6de8779`
- 采购单：`PO202610151830354481`，状态 `completed`
- 销售单：`SO202610151830355979`，状态 `completed`
- 付款、收款：各 CNY 100.00，均为 `confirmed`
- 库存：默认仓 BASE 85、备用仓 BASE 10；另有规格初始余额 0，符合采购 100、调拨 10、销售出库 5 的业务链。
- 询盘：2 条，公开询盘与后台线索均保留。

最终库计数：迁移 1、系统管理员 1、租户 6、站点 6、商品 2、客户 1、采购单 1、销售单 1、资金流水 2、询盘 2。额外租户来自 API E2E 和 Playwright 重跑，均为带时间戳的可追溯测试数据。

详细 ID 索引见 [release-uat.json](./logs/release-uat.json)，浏览器报告见 [Playwright HTML 报告](./artifacts/playwright-report/index.html)，JUnit 结果见 [results.xml](./artifacts/playwright-results/results.xml)。

## 五、最终运行态

- API：healthy，端口 3000
- Admin：running，端口 8088
- Storefront：healthy，端口 8080
- MySQL：healthy，端口 3307
- Redis：healthy，端口 6381
- 当前可见浏览器已复核最终公开站点：站点名称、商品、分类、分页、询盘表单和页脚均正常展示。

镜像：

- `mercivo-api:latest`：`sha256:6a57bce8acab5cab755c229f30abb7bc77f47f7071805524006522b309cc735f`
- `mercivo-admin:latest`：`sha256:a11eb47b5f4e6d15ae7d82ae8e70abce04378a3ecf2fd8eba8889a14c012e0ef`
- `mercivo-storefront:latest`：`sha256:c58da27096e18ee3d08b7e7595fed9f51ec0016d8b2490939755bc8070b76d8c`

## 六、非阻断风险

1. Admin 和 Storefront 构建仍提示原始 chunk 超过 500 KB；gzip 大小分别低于本轮 500 KB / 300 KB 门禁。建议第二版继续拆分 ECharts、站点编辑器与通用依赖。
2. Admin CSP 会阻止 Google Fonts 外链样式，当前自动回退到本地系统字体，不影响业务闭环。上线前若要求完全一致的 Inter 字体，建议自托管字体，而不是放宽 CSP。
3. 完整开发依赖树仍包含旧 ESLint/Jest 工具链告警；生产依赖审计为 0。建议后续单独升级测试工具链，避免与本次业务上线混合扩大变更面。

## 七、放行结论

构建、迁移、生产依赖安全审计、后端单测、真实数据库 API E2E、44 项全业务链 UAT、52 项 Chromium 回归、HTTP 冒烟、日志扫描和数据库一致性均通过。未发现跨租户泄漏、权限绕过、库存/金额错误、发布失败或公开站不可用等阻断项。

**最终结论：通过，可以进入第一版上线部署流程。**
