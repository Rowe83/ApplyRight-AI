export type JdTemplateCategory = "frontend" | "fullstack" | "product"

export type JdTemplate = {
  id: string
  category: JdTemplateCategory
  roleTitle: string
  tags: string[]
  fullText: string
}

const JD = (
  id: string,
  category: JdTemplateCategory,
  roleTitle: string,
  tags: string[],
  fullText: string,
): JdTemplate => ({
  id,
  category,
  roleTitle,
  tags,
  fullText: fullText.trim(),
})

export const JD_TEMPLATE_CATALOG: JdTemplate[] = [
  JD(
    "jd-fe-senior",
    "frontend",
    "高级前端工程师",
    ["React", "TypeScript", "性能优化"],
    `职位名称：高级前端工程师

岗位职责：
- 负责核心业务 Web 端架构设计与开发，保障高可用与可维护性
- 推动组件库、工程化与性能优化，核心页面 LCP 提升 20% 以上
- 与产品、设计、后端协作，主导复杂交互与状态管理方案落地
- 参与 Code Review，指导初级工程师，沉淀最佳实践

任职要求：
- 本科及以上学历，3 年以上前端开发经验
- 精通 React / TypeScript，熟悉 Next.js 或同类 SSR 框架
- 熟悉 Web 性能优化、浏览器原理与前端安全基础
- 具备良好的沟通能力和责任心，有大型 ToB / ToC 项目经验优先
- 有微前端、可视化、Node 中间层经验者优先`,
  ),
  JD(
    "jd-fullstack",
    "fullstack",
    "全栈开发工程师",
    ["Node.js", "PostgreSQL", "云原生"],
    `职位名称：全栈开发工程师

岗位职责：
- 负责前后端功能端到端交付，从需求评审到上线运维
- 设计 RESTful / RPC API，编写高质量服务端与数据库模型
- 搭建 CI/CD、监控告警，保障服务 SLA
- 参与技术选型与系统重构，控制技术债

任职要求：
- 3 年以上全栈经验，熟悉 JavaScript / TypeScript 技术栈
- 熟练使用 React 或 Vue，掌握 Node.js（Express / Nest 等）至少一种框架
- 熟悉 PostgreSQL 或 MySQL，能编写高效 SQL 与索引优化
- 了解 Docker、Kubernetes 基础，有 AWS / 阿里云部署经验优先
- 具备良好的问题定位能力与跨团队协作意识`,
  ),
  JD(
    "jd-pm",
    "product",
    "产品经理（B 端）",
    ["需求分析", "数据驱动", "SaaS"],
    `职位名称：产品经理（B 端 SaaS）

岗位职责：
- 负责 B 端 SaaS 产品规划与迭代，输出 PRD、原型与验收标准
- 深入客户场景完成需求调研，梳理优先级与里程碑
- 协同研发、设计、运营推进版本发布，跟踪核心指标
- 建立数据看板，通过留存、转化、NPS 等指标驱动优化

任职要求：
- 3 年以上互联网产品经理经验，有 B 端 / SaaS 背景优先
- 熟练使用 Figma、Axure 等工具，具备结构化写作与汇报能力
- 具备数据分析意识，能使用 SQL 或 BI 工具者优先
- 逻辑清晰、推动力强，能适应快节奏多项目并行
- 有 AI 应用、效率工具、招聘 / HR Tech 领域经验者优先`,
  ),
]

export const getJdTemplateById = (id: string): JdTemplate | undefined =>
  JD_TEMPLATE_CATALOG.find((t) => t.id === id)
