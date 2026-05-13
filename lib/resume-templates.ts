/**
 * 公共简历模板种子数据（只读）。
 * 克隆时仅允许通过受校验的 templateId 从本目录解析正文，避免越权写入任意内容。
 */

export const RESUME_TEMPLATE_CATEGORY_IDS = [
  "all",
  "frontend",
  "fullstack",
  "product",
  "finance",
] as const

export type ResumeTemplateCategoryId = (typeof RESUME_TEMPLATE_CATEGORY_IDS)[number]

export type ResumeLibraryTemplate = {
  id: string
  category: Exclude<ResumeTemplateCategoryId, "all">
  /** 卡片主标题，如：字节跳动 · 前端核心架构师 */
  roleTitle: string
  /** 亮点标签 */
  highlightTags: string[]
  /** 卡片摘要（淡化展示，非完整正文） */
  summaryExcerpt: string
  /** 克隆写入 resumes.raw_text 的 Markdown 正文 */
  markdownBody: string
}

const TPL = (
  id: string,
  category: ResumeLibraryTemplate["category"],
  roleTitle: string,
  highlightTags: string[],
  summaryExcerpt: string,
  markdownBody: string,
): ResumeLibraryTemplate => ({
  id,
  category,
  roleTitle,
  highlightTags,
  summaryExcerpt,
  markdownBody,
})

export const RESUME_TEMPLATE_CATALOG: ResumeLibraryTemplate[] = [
  TPL(
    "tpl-fe-byte-senior",
    "frontend",
    "字节跳动 · 前端核心架构师",
    ["高并发", "微前端", "STAR 原则", "性能优化"],
    "负责国际化业务线前端架构演进，主导微前端拆分与构建链路优化，将首屏 FCP 降低约 35%，支撑大促零重大事故……",
    `## 张三 | 前端架构师

### 职业摘要
- 8 年 Web 前端经验，5 年大型互联网高并发场景，擅长 **微前端 / 工程化 / 性能治理**。
- 主导过 **从 0 到 1** 的跨团队设计系统落地，推动 TypeScript 全链路覆盖。

### 工作经历

#### 字节跳动 · 前端架构师 | 2021.03 – 至今
- **STAR**：双 11 大促期间（S），首页白屏率与转化链路稳定性（T）承压；牵头搭建 **渐进式微前端** 与灰度发布体系（A），大促峰值 **0 P1 事故**（R）。
- 推动 **Webpack → Rspack** 试点，构建耗时下降约 **42%**，CI 队列时长下降约 **28%**。
- 搭建 **前端可观测性** 看板（错误率、长任务、CLS），建立周会复盘机制，线上 P95 LCP 优化 **~22%**。

#### 某一线电商 · 高级前端工程师 | 2017.06 – 2021.02
- 负责活动搭建平台核心模块，沉淀 **可视化搭建 + 物料市场**，活动页平均交付周期从 3 天缩短至 **4 小时级**。

### 技术栈
React、TypeScript、Rspack、微前端（qiankun / Module Federation）、Node.js、Kubernetes 基础

### 教育背景
985 院校 · 计算机科学与技术 · 本科`,
  ),
  TPL(
    "tpl-fe-ant-design",
    "frontend",
    "蚂蚁集团 · 体验技术部高级前端",
    ["中后台", "低代码", "无障碍", "设计系统"],
    "深度参与企业级中后台与低代码平台，主导表格/表单性能专项，推进 WCAG 2.1 AA 级无障碍改造……",
    `## 李四 | 高级前端工程师

### 职业摘要
专注 **企业级中后台** 与 **低代码**，熟悉复杂表单/大数据表格场景下的性能与可维护性治理。

### 工作经历

#### 蚂蚁集团 · 体验技术部 | 2019.07 – 至今
- 负责 **ProComponents** 业务线适配，推动虚拟滚动 + 分页策略统一，万级行表格滚动帧率稳定在 **55fps+**。
- **STAR**：监管报表项目（S）需满足审计与无障碍（T）；主导键盘导航与读屏适配（A），通过 **WCAG 2.1 AA** 抽检（R）。
- 搭建 **物料脚手架** 与示例站点，降低业务接入成本约 **30%**。

### 技术栈
React、TypeScript、Ant Design、Umi、微服务 BFF、Jest/Playwright

### 教育背景
双一流院校 · 软件工程 · 本科`,
  ),
  TPL(
    "tpl-fs-tencent",
    "fullstack",
    "腾讯 · 全栈工程师（Node + React）",
    ["全栈", "高可用", "从0到1", "DevOps"],
    "负责增长业务全栈交付，搭建 Node 网关与灰度体系，支撑日活千万级活动；推动 IaC 与容器化规范……",
    `## 王五 | 全栈工程师

### 职业摘要
**Node.js + React** 全栈，熟悉高可用网关、活动峰值治理与基础 DevOps。

### 工作经历

#### 腾讯 · PCG 增长平台 | 2020.05 – 至今
- **STAR**：春节红包活动（S）QPS 峰值陡增（T）；设计 **多级缓存 + 异步削峰** 与限流策略（A），核心接口 **99.95%** 可用性（R）。
- 搭建 **BFF 聚合层**，统一鉴权、埋点与实验分流，前端接入成本下降约 **40%**。
- 推动 **Docker + K8s** 部署模板，接入 CI/CD 与蓝绿发布。

### 技术栈
Node.js、NestJS、React、Redis、Kafka、Docker、Kubernetes、Prometheus

### 教育背景
211 院校 · 计算机科学与技术 · 本科`,
  ),
  TPL(
    "tpl-fs-meituan",
    "fullstack",
    "美团 · 到店事业群全栈开发",
    ["供应链", "GraphQL", "可观测性", "协作"],
    "参与商家供应链系统迭代，主导 GraphQL BFF 与领域模型梳理，完善链路追踪与告警分级……",
    `## 赵六 | 全栈开发工程师

### 职业摘要
偏 **业务中台 + BFF**，强调 **领域建模** 与 **可观测性** 闭环。

### 工作经历

#### 美团 · 到店事业群 | 2018.08 – 至今
- 引入 **GraphQL BFF**，减少前端多次往返请求，列表页接口耗时 P95 下降约 **25%**。
- 与产品/测试共建 **告警分级手册**，MTTR 下降约 **35%**。
- 参与 **从 0 到 1** 的供应商协同子系统，完成核心单据流与权限模型。

### 技术栈
Java/Spring Boot、Node.js、GraphQL、React、MySQL、ElasticSearch、OpenTelemetry

### 教育背景
一本院校 · 信息管理与信息系统 · 本科`,
  ),
  TPL(
    "tpl-pm-bytedance",
    "product",
    "字节跳动 · 商业化产品经理",
    ["增长", "AB实验", "数据驱动", "B端"],
    "负责广告客户增长产品，搭建实验平台与指标体系，推动自助开户漏斗转化率提升……",
    `## 陈七 | 产品经理（商业化）

### 职业摘要
**B 端增长 / 广告平台**，擅长指标体系、实验文化与跨部门推进。

### 工作经历

#### 字节跳动 · 商业化 | 2019.03 – 至今
- **STAR**：中小客户开户流失高（S）；联合设计 **引导式开户 + 风控前置**（A），**转化率 +18%**（R）。
- 搭建 **AB 实验看板**，统一显著性检验与样本量计算器，周均实验 **20+** 场。
- 输出 **PRD 模板** 与评审 checklist，研发返工率下降约 **12%**。

### 技能
SQL、数据埋点设计、Figma、SQL 看板（Hive/ClickHouse 协作）

### 教育背景
海外硕士 · 商业分析`,
  ),
  TPL(
    "tpl-pm-wechat",
    "product",
    "微信 · 支付体验产品经理",
    ["支付", "合规", "体验", "风控"],
    "聚焦支付链路体验与合规改造，推动无障碍支付与老年模式，协调银行与清算机构多接口升级……",
    `## 周八 | 产品经理（支付）

### 职业摘要
**支付 / 合规 / 体验** 交叉领域，强协同金融机构与研发团队。

### 工作经历

#### 腾讯微信 · 支付线 | 2017.11 – 至今
- 主导 **老年模式支付** 路径简化，客服进线量下降约 **9%**。
- **STAR**：合规改造窗口紧（S）；拆解里程碑与灰度策略（A），按期 **零重大客诉** 上线（R）。
- 建立 **体验度量**（任务完成率、时长、错误码分布）月报机制。

### 技能
Axure、SQL、埋点方案、合规文档协作

### 教育背景
985 院校 · 金融学 · 本科`,
  ),
  TPL(
    "tpl-fin-citic",
    "finance",
    "中信证券 · 行业研究员（TMT）",
    ["行研", "财务模型", "路演", "STAR"],
    "覆盖 TMT 赛道，搭建三表模型与同业对比框架，支持机构路演与内部投资决策……",
    `## 吴九 | 行业研究员（TMT）

### 职业摘要
**卖方行研**，擅长财务建模、产业链拆解与路演材料沉淀。

### 工作经历

#### 中信证券 · 研究部 | 2020.07 – 至今
- 覆盖 **云计算 / 软件 SaaS**，维护 **15+** 家核心公司模型，深度报告 **8** 篇。
- **STAR**：监管政策突变引发板块波动（S）；48h 内输出情景分析与组合影响评估（A），支持投资例会决策（R）。
- 搭建 **同业估值对比模板**（EV/Revenue、Rule of 40），提升团队效率。

### 技能
Excel 高级建模、Wind/Bloomberg、Python（数据处理）

### 教育背景
Top 财经院校 · 金融学 · 硕士`,
  ),
  TPL(
    "tpl-fin-goldman",
    "finance",
    "高盛（中国）· 投资银行部分析师",
    ["并购", "估值", "Excel", "高压协作"],
    "参与跨境并购与融资项目执行，负责可比公司分析、DCF 与敏感性表，支持材料制作与管理层路演……",
    `## 郑十 | 投资银行部分析师

### 职业摘要
**并购 / 融资执行**，熟悉估值、交易文件流程与高压节奏下的质量控制。

### 工作经历

#### 高盛（中国）| 2021.07 – 至今
- 参与 **2** 个跨境并购项目执行，负责 **Comps / DCF / Sensitivity** 模型维护。
- **STAR**：尽调材料截止前发现数据口径不一致（S）；牵头财务组对齐口径并复核（A），**按时**提交管理层材料（R）。
- 搭建 **项目文档 checklist**，降低低级错误复发率。

### 技能
DCF、LBO 基础、Excel/VBA、PPT、英语工作语言

### 教育背景
海外名校 · 金融工程 · 硕士`,
  ),
]

const templateById = new Map(RESUME_TEMPLATE_CATALOG.map((t) => [t.id, t]))

export const getResumeTemplateById = (id: string): ResumeLibraryTemplate | undefined =>
  templateById.get(id)

export const isValidResumeTemplateId = (id: string): boolean => templateById.has(id)
