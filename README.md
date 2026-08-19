# 请执行 Trae 项目初始化任务：独立站SEO管理平台（NestJS + MySQL + React）

## 本地运行

本地和 Cloud Run 使用同一组服务镜像：`Dockerfile.api`、`Dockerfile.admin`、`Dockerfile.storefront`。容器内统一监听 `8080`，服务间通过 Compose DNS 和同源代理访问，结构与线上三服务一致。

```bash
make local-init       # 首次生成被 git 忽略的 .env.local
make local-up         # 构建并启动 MySQL、Redis 和三个应用服务
make local-ps
```

本地配置只修改根目录 `.env.local`，字段模板见 `.env.local.example`。常用地址：

- Admin：http://localhost:8088
- Storefront：http://localhost:8080
- API：http://localhost:3000

Admin 与 Storefront 浏览器请求同源 `/api/*`，各自容器再代理至 `api:8080`，不要在前端写入 API 容器地址。停止环境使用 `make local-down`；清空本地数据库和 Redis 数据须显式运行 `make local-reset`。

线上部署说明见 [`deploy/cloudrun/README.md`](deploy/cloudrun/README.md)。

## 项目背景
您需要构建一个外贸ERP+独立站一体化平台的SEO管理子系统。商家可在后台可视化配置站点全局SEO、页面TDK、多语言hreflang、结构化数据、站点地图等，前台自动生成搜索引擎友好的HTML。本任务将生成前后端完整代码，后端提供API，前端实现设计稿中的所有界面。

## 第一步：确认技术栈（默认执行）
- **前端**：React 18 + TypeScript 5 + Vite + Ant Design 5（ProComponents可选）
- **后端**：NestJS 10+ (Node.js 20+) + TypeORM + MySQL 8.0+
- **ORM**：TypeORM（Data Mapper 模式）
- **构建**：Vite（前端），Nest CLI（后端）
- **测试**：Vitest（前端），Jest（后端）
- **代码规范**：ESLint + Prettier + Husky
- **请严格按照此技术栈生成所有文件，无需额外确认。**

## 第二步：创建目录结构（前后端分离，但可同仓库或分开，本任务采用同仓库 monorepo 结构）

```
项目根目录/
├── .trae/
│   ├── rules/
│   │   └── project_rules.md        # 核心规则（始终生效）
│   ├── skills/
│   │   ├── backend-dev/
│   │   │   └── SKILL.md            # 后端开发技能
│   │   └── frontend-dev/
│   │       └── SKILL.md            # 前端开发技能（含Ant Design用法）
│   └── specs/
│       └── seo-spec.md             # 业务需求规格（从设计稿提炼）
├── backend/                         # 后端NestJS项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── seo/                # SEO全局设置模块
│   │   │   ├── page/               # 页面覆盖管理（首页/产品列表/详情/自定义）
│   │   │   ├── product/            # 商品管理（含SEO标签）
│   │   │   ├── sitemap/            # 站点地图与robots.txt
│   │   │   └── auth/               # 认证（JWT）
│   │   ├── common/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── pipes/
│   │   │   └── guards/
│   │   ├── config/                 # 数据库、JWT等配置
│   │   ├── migrations/             # TypeORM迁移文件
│   │   └── main.ts
│   ├── test/
│   ├── .env.example
│   ├── .gitignore
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/                        # 前端React项目
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SeoSettings/        # 全局设置页（含页签切换）
│   │   │   ├── PageOverride/       # 页面覆盖（首页为例）
│   │   │   ├── ProductSeo/         # 商品编辑页SEO标签
│   │   │   ├── SitemapRobots/      # 高级页签（站点地图/robots/hreflang）
│   │   │   └── PreviewModal/       # 搜索结果预览弹窗（Google模拟）
│   │   ├── components/
│   │   │   ├── SeoPreviewCard/     # 预览卡片（实时更新）
│   │   │   ├── LanguageTabs/       # 多语言切换组件
│   │   │   └── CodeBlock/          # 结构化数据代码展示
│   │   ├── services/               # API调用（axios）
│   │   ├── hooks/                  # 自定义hooks
│   │   ├── types/                  # TypeScript接口
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

## 第三步：生成所有配置文件（完整路径+内容）

### 3.1 项目核心规则（始终生效）
**文件路径：** `.trae/rules/project_rules.md`
**内容：**
```markdown
# 项目核心规则 - 独立站SEO管理平台（NestJS + MySQL + React）

## 项目概述
- 项目名称：独立站SEO管理平台（SEO Manager for Independent Site）
- 后端：NestJS 10+，数据库 MySQL 8.0+，ORM TypeORM
- 前端：React 18 + TypeScript + Ant Design 5
- 编码规范：全栈统一 ESLint + Prettier

---

## 一、通用规范
（保持与先前一致：缩进2空格，camelCase/PascalCase/kebab-case，禁止any，统一API响应格式等）

---

## 二、前端规范（React + Ant Design）
### 2.1 技术栈
- React 18 (函数组件 + Hooks)
- TypeScript 5
- Vite 4+
- Ant Design 5 (UI库)
- React Router v6 (路由)
- Axios (HTTP客户端)

### 2.2 设计实现要求
- 遵循设计稿中的色彩（主色 #1E6FFF，辅助 #F0F5FF，成功绿 #10B981）
- 字体：PingFang SC (中文) / Inter (英文)
- 组件尺寸：卡片圆角8px，轻量阴影，线性图标2px描边
- 后台布局：侧边菜单 + 顶部导航 + 内容区域（1440px宽）
- 所有表单使用Ant Design Form，实时预览通过状态提升实现

### 2.3 路由规划
- `/seo/global` - 全局SEO设置
- `/seo/override` - 页面覆盖（首页）
- `/product/edit/:id` - 商品编辑（含SEO标签）
- `/seo/advanced` - 高级设置（sitemap/robots/hreflang）

### 2.4 组件复用
- `SeoPreviewCard`：接收title, description, url, isMobile等props，实时渲染Google模拟卡片
- `LanguageTabs`：支持EN/中文/西班牙语切换，内部表单联动

---

## 三、后端规范（NestJS + TypeORM + MySQL）
### 3.1 技术栈版本
（同README：NestJS 10, Node 20, TypeORM 0.3, MySQL 8.0）

### 3.2 业务模块划分（必须实现）
- **SEO模块** (`modules/seo`)：管理全局设置（站点名称、标题模板、描述模板、分享图片、GA/GC代码）
- **Page模块** (`modules/page`)：管理页面覆盖（页面类型、多语言TDK、社交媒体设置）
- **Product模块** (`modules/product`)：商品管理，包含SEO覆盖字段和结构化数据增强（品牌、GTIN、评论）
- **Sitemap模块** (`modules/sitemap`)：生成sitemap.xml、管理robots.txt、检测hreflang配置

### 3.3 数据库设计（关键实体）
#### 3.3.1 `seo_global` 表（全局设置）
- id (uuid 主键)
- site_name (varchar)
- title_template (varchar)
- description_template (text)
- default_share_image (varchar, 存储URL)
- ga_id (varchar)
- gc_verification (text)
- created_at, updated_at

#### 3.3.2 `page_overrides` 表（页面覆盖）
- id (uuid)
- page_type (enum: 'home', 'product_list', 'product_detail', 'custom')
- page_id (varchar, 若为custom则存储自定义标识)
- language (varchar, 如 'en', 'zh', 'es')
- title (varchar)
- description (text)
- keywords (json, 存储数组)
- social_title (varchar, 可空)
- social_description (text, 可空)
- social_image (varchar, 可空)
- created_at, updated_at

#### 3.3.3 `products` 表（商品，含SEO字段）
- id (uuid)
- name (varchar)
- description (text)
- main_image (varchar)
- seo_title (varchar, 可空)
- seo_description (text, 可空)
- seo_image (varchar, 可空)
- brand (varchar, 可空)
- gtin (varchar, 可空)
- enable_reviews (tinyint, default 0)
- review_rating (decimal(2,1), 可空)
- created_at, updated_at

#### 3.3.4 `sitemap_info` 表（站点地图状态）
- id (int)
- last_generated_at (datetime)
- status (varchar, 默认 'generated')

#### 3.3.5 `hreflang_config` 表（多语言hreflang）
- id (int)
- language (varchar)
- base_url (varchar)

### 3.4 API端点设计（RESTful）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /api/v1/seo/global | 获取全局设置 |
| PUT  | /api/v1/seo/global | 更新全局设置 |
| GET  | /api/v1/page/override/:type/:lang | 获取特定页面覆盖 |
| PUT  | /api/v1/page/override | 创建或更新覆盖 |
| GET  | /api/v1/product/:id/seo | 获取商品SEO数据 |
| PUT  | /api/v1/product/:id/seo | 更新商品SEO数据 |
| GET  | /api/v1/sitemap/status | 获取sitemap状态 |
| POST | /api/v1/sitemap/generate | 重新生成sitemap |
| GET  | /api/v1/sitemap/robots | 获取robots.txt内容 |
| PUT  | /api/v1/sitemap/robots | 更新robots.txt |
| GET  | /api/v1/sitemap/hreflang/status | 检查hreflang配置 |

### 3.5 数据库配置（MySQL）
- 字符集：utf8mb4，排序规则 utf8mb4_unicode_ci
- 时区：UTC
- 连接池：10
- 生产环境关闭 `synchronize`，使用迁移文件

（其余规范如实体定义、事务、查询、迁移等参照README中“后端规范”章节，此处不再重复）

---

## 四、安全与中间件
（同README：helmet, cors, JWT认证, 限流, ConfigModule）

---

## 五、测试
（同README：Jest单元测试 + E2E，核心模块覆盖率≥80%）

---

## 六、Git工作流
（同README：Conventional Commits，分支策略）
```

---

### 3.2 后端开发技能（面向NestJS + MySQL，已包含在README，可复用）
**文件路径：** `.trae/skills/backend-dev/SKILL.md`
（内容与README中“后端开发技能”一致，但需结合本项目的实体定义示例，可略作调整）

---

### 3.3 前端开发技能（新增，因README未详细展开）
**文件路径：** `.trae/skills/frontend-dev/SKILL.md`
**内容：**
```markdown
---
name: react-antd-dev
description: Develop React frontend with Ant Design, TypeScript, and Vite, following design system.
---

# React + Ant Design 开发技能

## 适用场景
创建新页面、组件、实现设计稿、对接API。

## 工作流程

### 步骤1：创建页面组件
- 使用函数组件 + TypeScript
- 定义Props接口
- 使用Ant Design布局（Layout, Menu, Breadcrumb等）

### 步骤2：表单处理
- 使用 `Form` 组件，配合 `useForm` hook
- 校验规则使用 `rules` 属性
- 多语言切换使用 `Tabs` 包裹多个 `Form.Item`，但需注意表单字段命名（例如 `title_en`, `title_zh`）

### 步骤3：状态管理
- 使用React Context或Redux Toolkit（本项目建议Context + useReducer）
- API调用封装在 `services/`，使用Axios拦截器统一处理token和错误

### 步骤4：实时预览
- 监听表单字段变化（`onValuesChange`）
- 将数据传递给 `SeoPreviewCard` 组件，利用其内部逻辑渲染Google模拟结果

### 步骤5：代码分割与懒加载
- 使用React.lazy + Suspense

## 设计规范
- 颜色变量定义在 `src/styles/variables.css` 或使用CSS-in-JS
- 图标使用 `@ant-design/icons`
- 所有文本支持多语言（但本项目仅演示中英西三语，可用简单对象映射）
```

---

### 3.4 业务需求规格（从设计稿提炼，用于指导开发）
**文件路径：** `.trae/specs/seo-spec.md`
**内容：**
```markdown
# SEO管理功能规格

## 1. 全局SEO设置页
- 左侧菜单“网站装修”>“SEO设置”高亮
- 顶部页签：全局设置（默认）、页面覆盖、高级
- 全局设置表单（双列）：
  - 站点名称（输入框）
  - 全局标题模板（输入框，占位符示例）
  - 全局描述模板（文本域）
  - 默认分享图片（上传，预览缩略图）
  - Google Analytics ID
  - Google Search Console验证代码（带复制按钮）
- 底部保存按钮

## 2. 页面覆盖（首页为例）
- 左侧列表选择页面类型（首页、产品列表、产品详情、自定义）
- 选中首页后右侧显示覆盖表单：
  - 语言切换tab（EN/中文/西班牙语）
  - 页面标题（输入框，下方显示实际预览标题）
  - 元描述（文本域，字数计数器）
  - 关键词（标签输入器）
  - 社交媒体标题/描述/图片（折叠面板，默认使用全局）
- 右侧固定显示搜索结果预览卡片（实时变化）

## 3. 商品编辑页SEO标签
- 在商品编辑详情页内，标签行增加“SEO”
- 选中后：
  - 语言切换tab（继承商品多语言）
  - 覆盖页面标题（默认商品名）
  - 覆盖描述（默认截取描述前160字符）
  - 覆盖分享图（默认主图）
  - 结构化数据增强（折叠面板）：品牌名、GTIN、评论开关+评分输入
- 右侧实时预览卡片

## 4. 搜索结果预览弹窗
- 模拟Google搜索结果样式：
  - 绿色小字显示URL
  - 蓝色标题（#1a0dab，20px）
  - 黑色描述（14px，最多160字符）
- 底部切换“桌面端预览”和“移动端预览”（移动端宽度变窄）
- 输入时实时更新

## 5. 高级设置（站点地图与robots.txt）
- 站点地图卡片：状态、最后更新时间、查看链接、重新生成按钮、自动更新提示
- Robots.txt卡片：文本域（可编辑）+ 保存按钮
- hreflang状态卡片：检查结果（绿色对勾），列出语言列表

## 6. 前台结构化数据示意
- 代码片段卡片，深色背景，显示JSON-LD（Product, Breadcrumb, Organization等）
- 前端页面仅展示代码高亮，不是最终用户界面
```

---

### 3.5 核心配置文件（后端）

**文件路径：** `backend/.env.example`
（内容与README相同，略）

**文件路径：** `backend/src/config/database.config.ts`
（内容与README相同，略）

**文件路径：** `backend/nest-cli.json`
（内容与README相同，略）

**文件路径：** `backend/package.json`
（内容与README相同，但项目名称改为“seo-platform-backend”，需调整）

**文件路径：** `backend/tsconfig.json`
（与README一致，严格模式）

**文件路径：** `backend/.gitignore`
（与README一致，但注意迁移文件需要提交.ts源文件）

---

### 3.6 核心配置文件（前端）

**文件路径：** `frontend/.env.example`
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

**文件路径：** `frontend/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**文件路径：** `frontend/package.json`
```json
{
  "name": "seo-platform-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.6",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

**文件路径：** `frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 第四步：生成初始业务模块代码（关键部分）

### 4.1 后端实体示例（SEO全局设置）
**文件路径：** `backend/src/modules/seo/seo-global.entity.ts`
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('seo_global')
export class SeoGlobal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_name', length: 255 })
  siteName: string;

  @Column({ name: 'title_template', length: 255, nullable: true })
  titleTemplate: string;

  @Column({ name: 'description_template', type: 'text', nullable: true })
  descriptionTemplate: string;

  @Column({ name: 'default_share_image', length: 500, nullable: true })
  defaultShareImage: string;

  @Column({ name: 'ga_id', length: 50, nullable: true })
  gaId: string;

  @Column({ name: 'gc_verification', type: 'text', nullable: true })
  gcVerification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 4.2 后端控制器示例（SEO全局设置）
**文件路径：** `backend/src/modules/seo/seo.controller.ts`
（需实现GET/PUT接口，使用DTO校验，返回统一格式）

### 4.3 前端页面示例（全局设置页）
**文件路径：** `frontend/src/pages/SeoSettings/index.tsx`
（使用Ant Design的Tabs, Form, Input, Upload, Button等，并集成SeoPreviewCard组件）

### 4.4 预览卡片组件
**文件路径：** `frontend/src/components/SeoPreviewCard/index.tsx`
（接收title, description, url, isMobile等props，渲染Google模拟卡片，支持桌面/移动切换）

---

## 第五步：初始化完成后的提示

所有文件生成后，请执行以下操作：
1. 分别在 `backend/` 和 `frontend/` 目录下运行 `npm install` 安装依赖。
2. 在 `backend/` 目录下根据 `.env.example` 创建 `.env`，配置MySQL连接。
3. 运行 `npm run migration:run` 创建表结构（迁移文件需手动生成或使用 `synchronize: true` 开发环境）。
4. 启动后端：`npm run start:dev`。
5. 启动前端：`npm run dev`。
6. 访问前端 `http://localhost:5173`，登录后即可使用SEO管理功能（认证暂可跳过，或使用预设token）。

---

## 第六步：提示AI生成完整代码

请按照上述结构，生成以下完整代码：
- 所有实体、DTO、控制器、服务、模块（后端）
- 所有页面、组件、服务、路由（前端）
- 确保API对接正确，预览卡片实时更新
- 遵循设计稿样式（颜色、字体、圆角、阴影）
- 实现多语言切换（至少EN/中文/西班牙语）
- 结构化数据预览页为代码高亮展示（可参考react-syntax-highlighter）

现在请开始执行初始化。
