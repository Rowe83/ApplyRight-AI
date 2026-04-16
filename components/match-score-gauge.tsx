"use client"

import { cn } from "@/lib/utils"

interface MatchScoreGaugeProps {
  score: number
  size?: "sm" | "md" | "lg"
}

export function MatchScoreGauge({ score, size = "md" }: MatchScoreGaugeProps) {
  const sizes = {
    sm: { container: "w-24 h-24", strokeWidth: 6, fontSize: "text-xl" },
    md: { container: "w-32 h-32", strokeWidth: 8, fontSize: "text-3xl" },
    lg: { container: "w-40 h-40", strokeWidth: 10, fontSize: "text-4xl" },
  }

  const { container, strokeWidth, fontSize } = sizes[size]
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-amber-500"
    return "text-red-500"
  }

  const getStrokeColor = (score: number) => {
    if (score >= 80) return "stroke-emerald-500"
    if (score >= 60) return "stroke-amber-500"
    return "stroke-red-500"
  }

  return (
    <div className={cn("relative", container)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-1000 ease-out",
            getStrokeColor(score)
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", fontSize, getScoreColor(score))}>
          {score}%
        </span>
        <span className="text-xs text-muted-foreground">匹配度</span>
      </div>
    </div>
  )
}
