"use client"

import { Badge } from "@/components/ui/badge"
import {
  OPTIMIZE_CREDIT_COST,
  PAYGO_PACKAGES,
  SUBSCRIPTION_PACKAGES,
} from "@/lib/billing-packages"

export const BillingPlanComparison = () => {
  const paygoHighlight = PAYGO_PACKAGES.find((p) => p.highlight) ?? PAYGO_PACKAGES[0]
  const monthly = SUBSCRIPTION_PACKAGES.find((p) => p.id === "monthly")

  return (
    <section
      className="rounded-lg border border-border bg-muted/20 p-4"
      aria-label="计费方式对比"
    >
      <h2 className="text-sm font-semibold text-foreground">如何选择套餐？</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              按次付费
            </Badge>
            <span className="text-xs text-muted-foreground">灵活、随用随充</span>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>每次分析消耗 {OPTIMIZE_CREDIT_COST} 积分</li>
            <li>
              {paygoHighlight
                ? `${paygoHighlight.title} ${paygoHighlight.priceLabel} · ${paygoHighlight.credits} 次`
                : "体验包 / 求职包"}
            </li>
            <li>{paygoHighlight?.unitPriceHint ?? "适合偶尔优化 1～2 个岗位"}</li>
          </ul>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-primary/90 text-[10px] text-primary-foreground">月付会员</Badge>
            <span className="text-xs text-muted-foreground">高频求职更划算</span>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              {monthly
                ? `${monthly.title} ${monthly.priceLabel} · 含 ${monthly.credits} 次/月（演示）`
                : "高级月付含月度额度"}
            </li>
            <li>{monthly?.unitPriceHint ?? "约更低单次成本"}</li>
            <li>演示环境：购买即入账当月额度，非真实订阅扣款</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
