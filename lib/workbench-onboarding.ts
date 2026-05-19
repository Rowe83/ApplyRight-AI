const FIRST_ANALYSIS_KEY = "applyright_has_completed_first_analysis"
const CHECKLIST_COLLAPSED_KEY = "applyright_onboarding_checklist_collapsed"

export const JD_MIN_LENGTH = 20

export type WorkbenchStepId = "resume" | "jd" | "analyze"

export type WorkbenchStep = {
  id: WorkbenchStepId
  label: string
  description: string
}

export const WORKBENCH_STEPS: WorkbenchStep[] = [
  {
    id: "resume",
    label: "准备简历",
    description: "上传 PDF 或从简历库选择",
  },
  {
    id: "jd",
    label: "粘贴 JD",
    description: "目标岗位的职位描述",
  },
  {
    id: "analyze",
    label: "分析并优化",
    description: "生成匹配分与 Diff",
  },
]

export type WorkbenchStepStatus = {
  resumeReady: boolean
  jdReady: boolean
  analyzeReady: boolean
}

export const deriveWorkbenchStepStatus = (input: {
  hasResume: boolean
  jdText: string
  hasCompletedFirstAnalysis: boolean
}): WorkbenchStepStatus => ({
  resumeReady: input.hasResume,
  jdReady: input.jdText.trim().length >= JD_MIN_LENGTH,
  analyzeReady: input.hasCompletedFirstAnalysis,
})

export const isStepComplete = (
  stepId: WorkbenchStepId,
  status: WorkbenchStepStatus,
): boolean => {
  if (stepId === "resume") {
    return status.resumeReady
  }
  if (stepId === "jd") {
    return status.jdReady
  }
  return status.analyzeReady
}

export const readHasCompletedFirstAnalysis = (): boolean => {
  if (typeof window === "undefined") {
    return false
  }
  try {
    return window.localStorage.getItem(FIRST_ANALYSIS_KEY) === "1"
  } catch {
    return false
  }
}

export const markFirstAnalysisComplete = (): void => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(FIRST_ANALYSIS_KEY, "1")
    window.localStorage.setItem(CHECKLIST_COLLAPSED_KEY, "1")
  } catch {
    /* ignore quota / private mode */
  }
}

export const readChecklistCollapsed = (): boolean => {
  if (typeof window === "undefined") {
    return false
  }
  try {
    return window.localStorage.getItem(CHECKLIST_COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

export const setChecklistCollapsed = (collapsed: boolean): void => {
  if (typeof window === "undefined") {
    return
  }
  try {
    if (collapsed) {
      window.localStorage.setItem(CHECKLIST_COLLAPSED_KEY, "1")
    } else {
      window.localStorage.removeItem(CHECKLIST_COLLAPSED_KEY)
    }
  } catch {
    /* ignore */
  }
}

export type AnalyzeBlocker = "resume" | "jd" | null

export const getAnalyzeBlocker = (input: {
  hasResume: boolean
  jdText: string
}): AnalyzeBlocker => {
  if (!input.hasResume) {
    return "resume"
  }
  if (input.jdText.trim().length < JD_MIN_LENGTH) {
    return "jd"
  }
  return null
}

export const ANALYZE_BLOCKER_MESSAGES: Record<Exclude<AnalyzeBlocker, null>, string> = {
  resume: "请上传 PDF，或从「我的简历」选择已有简历",
  jd: `请粘贴职位描述（至少 ${JD_MIN_LENGTH} 个字符）`,
}
