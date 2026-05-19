export type BillingPlanKind = "paygo" | "subscription"

export type MockPurchasePackageId = "starter" | "job" | "monthly" | "unlimited"

export const OPTIMIZE_CREDIT_COST = 1

export const LOW_CREDITS_THRESHOLD = 2

export type BillingPackageDef = {
  id: MockPurchasePackageId
  kind: BillingPlanKind
  title: string
  priceLabel: string
  credits: number
  blurb: string
  highlight?: boolean
  unitPriceHint?: string
  billingPeriodLabel?: string
}

export const BILLING_PACKAGES: BillingPackageDef[] = [
  {
    id: "starter",
    kind: "paygo",
    title: "体验包",
    priceLabel: "¥9.9",
    credits: 5,
    unitPriceHint: "约 ¥2.0/次",
    billingPeriodLabel: "按次充值",
    blurb: "适合初次体验，用完可再购",
  },
  {
    id: "job",
    kind: "paygo",
    title: "求职包",
    priceLabel: "¥29.9",
    credits: 20,
    unitPriceHint: "约 ¥1.5/次",
    billingPeriodLabel: "按次充值",
    blurb: "多岗位投递与迭代优化",
    highlight: true,
  },
  {
    id: "monthly",
    kind: "subscription",
    title: "高级月付",
    priceLabel: "¥39.9/月",
    credits: 30,
    unitPriceHint: "约 ¥1.3/次",
    billingPeriodLabel: "每月续费",
    blurb: "高频求职：含 30 次分析额度（演示按月入账）",
  },
  {
    id: "unlimited",
    kind: "subscription",
    title: "无限通关（演示）",
    priceLabel: "¥99/月",
    credits: 9999,
    billingPeriodLabel: "演示环境",
    blurb: "模拟无限额度，仅用于本地/测试演示",
  },
]

export const PAYGO_PACKAGES = BILLING_PACKAGES.filter((p) => p.kind === "paygo")
export const SUBSCRIPTION_PACKAGES = BILLING_PACKAGES.filter(
  (p) => p.kind === "subscription",
)

export const PACKAGE_CREDITS_BY_ID = BILLING_PACKAGES.reduce(
  (acc, p) => {
    acc[p.id] = {
      credits: p.credits,
      label: p.title,
      kind: p.kind,
    }
    return acc
  },
  {} as Record<
    MockPurchasePackageId,
    { credits: number; label: string; kind: BillingPlanKind }
  >,
)

export const getCreditsStatus = (
  credits: number,
): "empty" | "low" | "ok" => {
  if (credits < OPTIMIZE_CREDIT_COST) {
    return "empty"
  }
  if (credits < LOW_CREDITS_THRESHOLD) {
    return "low"
  }
  return "ok"
}
