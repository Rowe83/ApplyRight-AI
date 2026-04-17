"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { UploadPanel } from "@/components/upload-panel"
import { AnalysisPanel, AnalysisResult } from "@/components/analysis-panel"
import { CheckCircle2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Mock analysis result for demo
const mockAnalysisResult: AnalysisResult = {
  matchScore: 78,
  strengths: [
    "丰富的前端开发经验",
    "熟练掌握 React 生态系统",
    "良好的项目管理能力",
  ],
  weaknesses: [
    "缺少云服务相关经验描述",
    "未突出团队协作成果",
    "技能描述过于笼统",
  ],
  missingKeywords: [
    "TypeScript",
    "CI/CD",
    "敏捷开发",
    "性能优化",
    "微前端",
    "单元测试",
    "AWS",
    "Docker",
  ],
  suggestions: [
    {
      category: "技能部分",
      items: [
        "添加 TypeScript 相关技能和项目经验",
        "补充 CI/CD 流程实践经验",
        "突出性能优化的具体案例和数据",
      ],
    },
    {
      category: "工作经历",
      items: [
        "量化项目成果，使用具体数据说明",
        "强调团队协作和领导力表现",
        "补充敏捷开发实践经验",
      ],
    },
    {
      category: "项目经验",
      items: [
        "增加技术挑战和解决方案的描述",
        "添加测试相关的实践经验",
        "描述云服务和容器化部署经验",
      ],
    },
  ],
  originalContent: `张明
高级前端工程师 | 5年经验

联系方式
邮箱：zhang.ming@example.com
电话：138-0000-0000

工作经历
ABC科技公司 | 高级前端工程师 | 2021-至今
- 负责公司核心产品的前端开发
- 参与技术选型和架构设计
- 指导初级开发人员

XYZ互联网公司 | 前端工程师 | 2019-2021
- 开发和维护公司网站
- 实现产品需求功能
- 修复线上问题

技能
- HTML/CSS/JavaScript
- React
- Vue.js
- Git`,
  optimizedContent: `张明
高级前端工程师 | 5年经验 | React & TypeScript 专家

联系方式
邮箱：zhang.ming@example.com | 电话：138-0000-0000 | GitHub：github.com/zhangming

工作经历
ABC科技公司 | 高级前端工程师 | 2021-至今
- 主导公司核心产品前端架构重构，采用 React + TypeScript + 微前端方案，提升开发效率 40%
- 建立完善的 CI/CD 流程和自动化测试体系，代码覆盖率从 20% 提升至 85%
- 实施性能优化方案，首屏加载时间从 4.5s 降低至 1.2s，用户留存率提升 25%
- 带领 5 人前端团队，采用敏捷开发模式，按时交付 15+ 个关键项目

XYZ互联网公司 | 前端工程师 | 2019-2021
- 负责电商平台前端开发，日均 PV 超 100 万
- 使用 React + Redux 重构老旧 jQuery 项目，性能提升 60%
- 编写单元测试和 E2E 测试，bug 率降低 70%

技能
- 核心技术：React, TypeScript, Next.js, Vue.js, Node.js
- 工程化：Webpack, Vite, CI/CD, Docker, AWS
- 测试：Jest, Cypress, Testing Library
- 方法论：敏捷开发, 代码审查, 性能优化`,
}

export default function DashboardPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [credits] = useState(5)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (error || !session) {
        router.push("/login")
        return
      }

      setAuthReady(true)
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleAnalyze = async (resumeFile: File | null, jobDescription: string) => {
    if (!resumeFile || !jobDescription) return

    setIsAnalyzing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setAnalysisResult(mockAnalysisResult)
    setIsAnalyzing(false)

    toast.success("简历优化成功！", {
      description: "您的简历匹配度为 78%，点击查看详细建议",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      duration: 5000,
    })
  }

  if (!authReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="正在验证登录状态"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardHeader credits={credits} />
        <main className="flex-1 overflow-hidden p-4">
          <div className="grid h-full gap-4 lg:grid-cols-2">
            {/* Left Panel - Upload & Input */}
            <div className="flex flex-col overflow-hidden">
              <UploadPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
            </div>

            {/* Right Panel - Analysis Results */}
            <div className="overflow-hidden rounded-lg border border-border bg-card/50 p-4">
              <AnalysisPanel result={analysisResult} isAnalyzing={isAnalyzing} />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
