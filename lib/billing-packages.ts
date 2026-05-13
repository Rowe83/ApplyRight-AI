export type MockPurchasePackageId = "starter" | "job" | "unlimited"

export type BillingPackageDef = {
  id: MockPurchasePackageId
  title: string
  priceLabel: string
  credits: number
  blurb: string
  highlight?: boolean
}

export const BILLING_PACKAGES: BillingPackageDef[] = [
  {
    id: "starter",
    title: "体验包",
    priceLabel: "¥9.9",
    credits: 5,
    blurb: "适合初次体验智能优化",
  },
  {
    id: "job",
    title: "求职包",
    priceLabel: "¥29.9",
    credits: 20,
    blurb: "多岗位投递与迭代",
    highlight: true,
  },
  {
    id: "unlimited",
    title: "无限通关包",
    priceLabel: "¥99",
    credits: 9999,
    blurb: "模拟「无限」额度（演示环境）",
  },
]

export const PACKAGE_CREDITS_BY_ID = BILLING_PACKAGES.reduce(
  (acc, p) => {
    acc[p.id] = { credits: p.credits, label: p.title }
    return acc
  },
  {} as Record<MockPurchasePackageId, { credits: number; label: string }>,
)
