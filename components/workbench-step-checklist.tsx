"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import {
  isStepComplete,
  readChecklistCollapsed,
  setChecklistCollapsed,
  WORKBENCH_STEPS,
  type WorkbenchStepStatus,
} from "@/lib/workbench-onboarding"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type WorkbenchStepChecklistProps = {
  status: WorkbenchStepStatus
  className?: string
}

export const WorkbenchStepChecklist = ({ status, className }: WorkbenchStepChecklistProps) => {
  const allDone = status.analyzeReady
  const [collapsed, setCollapsed] = useState(() => readChecklistCollapsed() && allDone)

  useEffect(() => {
    if (allDone && readChecklistCollapsed()) {
      setCollapsed(true)
    }
  }, [allDone])

  const handleToggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    setChecklistCollapsed(next)
  }

  if (allDone && collapsed) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm",
          className,
        )}
        role="status"
      >
        <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          已完成首次匹配
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleToggleCollapsed}
          aria-expanded={false}
        >
          展开步骤
          <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card/80 px-4 py-3",
        className,
      )}
      aria-label="开始第一次匹配"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">开始第一次匹配</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">按顺序完成以下三步</p>
        </div>
        {allDone ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
            onClick={handleToggleCollapsed}
            aria-expanded
          >
            收起
            <ChevronUp className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>

      <ol className="space-y-2">
        {WORKBENCH_STEPS.map((step, index) => {
          const done = isStepComplete(step.id, status)
          const prevDone = index === 0 || isStepComplete(WORKBENCH_STEPS[index - 1]!.id, status)
          const active = !done && prevDone

          return (
            <li key={step.id} className="flex gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  done
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

