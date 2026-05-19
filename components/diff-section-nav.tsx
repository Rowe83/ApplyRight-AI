"use client"

import type { DiffSectionNavItem } from "@/components/resume-diff-view"
import { scrollToDiffSection } from "@/lib/diff-navigation"
import { cn } from "@/lib/utils"

type DiffSectionNavProps = {
  items: DiffSectionNavItem[]
  scrollRootSelector?: string
  className?: string
}

export const DiffSectionNav = ({
  items,
  scrollRootSelector = '[data-diff-panel-root="true"]',
  className,
}: DiffSectionNavProps) => {
  if (items.length === 0) {
    return null
  }

  const handleJump = (title: string) => {
    scrollToDiffSection(title, scrollRootSelector)
  }

  return (
    <>
      <nav
        className={cn(
          "hidden w-36 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/20 py-2 pr-2 md:flex",
          className,
        )}
        aria-label="章节导航"
      >
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => handleJump(item.title)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label={`跳转到章节：${item.title}${item.changed ? "（有变更）" : ""}`}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                item.changed ? "bg-amber-500" : "bg-transparent",
              )}
              aria-hidden
            />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </nav>

      <div
        className="flex gap-1.5 overflow-x-auto border-b border-border pb-2 md:hidden"
        role="navigation"
        aria-label="章节快速跳转"
      >
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => handleJump(item.title)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              item.changed
                ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
    </>
  )
}
