"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const ResumeGridSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
        aria-hidden
      >
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-muted/50" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-[75%] bg-muted/50" />
            <Skeleton className="h-4 w-1/2 bg-muted/40" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full bg-muted/40" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full bg-muted/30" />
          <Skeleton className="h-4 w-5/6 bg-muted/30" />
        </div>
      </div>
    ))}
  </div>
)

export const HistoryTableSkeleton = () => (
  <div className="flex flex-col gap-0" aria-hidden>
    <div className="flex gap-4 border-b border-slate-800/80 px-4 py-3">
      <Skeleton className="h-4 w-28 bg-muted/40" />
      <Skeleton className="h-4 flex-1 bg-muted/30" />
      <Skeleton className="h-4 flex-1 bg-muted/30" />
      <Skeleton className="h-4 w-20 bg-muted/40" />
      <Skeleton className="h-4 w-24 bg-muted/40" />
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex gap-4 border-b border-slate-800/40 px-4 py-3">
        <Skeleton className="h-4 w-36 bg-muted/25" />
        <Skeleton className="h-4 flex-1 bg-muted/20" />
        <Skeleton className="h-4 flex-1 bg-muted/20" />
        <Skeleton className="h-4 w-16 rounded-full bg-muted/30" />
        <Skeleton className="h-4 w-24 bg-muted/25" />
      </div>
    ))}
  </div>
)

export const BillingPageSkeleton = () => (
  <div className="flex flex-col gap-6" aria-hidden>
    <Skeleton className="h-40 w-full rounded-xl bg-muted/30" />
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl bg-muted/25" />
      ))}
    </div>
    <Skeleton className="h-64 w-full rounded-xl bg-muted/20" />
  </div>
)
