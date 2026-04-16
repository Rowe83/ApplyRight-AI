"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { MatchScoreGauge } from "@/components/match-score-gauge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Lightbulb, 
  FileText,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface AnalysisResult {
  matchScore: number
  strengths: string[]
  weaknesses: string[]
  missingKeywords: string[]
  suggestions: {
    category: string
    items: string[]
  }[]
  originalContent: string
  optimizedContent: string
}

interface AnalysisPanelProps {
  result: AnalysisResult | null
  isAnalyzing: boolean
}

export function AnalysisPanel({ result, isAnalyzing }: AnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium">AI 正在分析您的简历...</p>
          <p className="text-sm text-muted-foreground">这可能需要几秒钟</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">暂无分析结果</p>
          <p className="text-sm text-muted-foreground">
            上传简历并粘贴职位描述后开始分析
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 pr-4">
        {/* Score and Summary Section */}
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center p-6">
              <MatchScoreGauge score={result.matchScore} />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">快速摘要</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>优势亮点</span>
                </div>
                <ul className="space-y-1">
                  {result.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
                  <TrendingDown className="h-4 w-4" />
                  <span>待改进项</span>
                </div>
                <ul className="space-y-1">
                  {result.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Missing Keywords and Suggestions */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">关键词分析与优化建议</CardTitle>
            <CardDescription>根据职位描述提取的核心关键词和改进建议</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full" defaultValue={["keywords", "suggestions"]}>
              <AccordionItem value="keywords" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>缺失的关键词</span>
                    <Badge variant="secondary" className="ml-2">
                      {result.missingKeywords.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {result.missingKeywords.map((keyword, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="border-amber-500/30 bg-amber-500/10 text-amber-500"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="suggestions" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span>优化建议</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {result.suggestions.map((suggestion, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="text-sm font-medium">{suggestion.category}</h4>
                        <ul className="space-y-1 pl-4">
                          {suggestion.items.map((item, itemIndex) => (
                            <li 
                              key={itemIndex} 
                              className="text-sm text-muted-foreground list-disc"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Resume Preview */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">简历预览</CardTitle>
            <CardDescription>查看原始简历与优化后的对比</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="optimized" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="original">原始版本</TabsTrigger>
                <TabsTrigger value="optimized">优化版本</TabsTrigger>
              </TabsList>
              <TabsContent value="original" className="mt-4">
                <div className="min-h-[200px] rounded-lg border border-border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                    {result.originalContent}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="optimized" className="mt-4">
                <div className="min-h-[200px] rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {result.optimizedContent}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
