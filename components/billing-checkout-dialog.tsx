"use client"

import { Loader2, QrCode, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BillingPackageDef } from "@/lib/billing-packages"

type BillingCheckoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPack: BillingPackageDef | null
  stripeEnabled: boolean
  mockAllowed: boolean
  isPaying: boolean
  onStripeCheckout: () => void
  onMockPaySuccess: () => void
}

export const BillingCheckoutDialog = ({
  open,
  onOpenChange,
  selectedPack,
  stripeEnabled,
  mockAllowed,
  isPaying,
  onStripeCheckout,
  onMockPaySuccess,
}: BillingCheckoutDialogProps) => {
  const isStripePack =
    selectedPack != null && selectedPack.stripePurchasable !== false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 bg-slate-950/95 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stripeEnabled && isStripePack ? (
              <CreditCard className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <QrCode className="h-5 w-5 text-primary" aria-hidden />
            )}
            {stripeEnabled && isStripePack ? "收银台" : "模拟收银台"}
          </DialogTitle>
          <DialogDescription>
            {stripeEnabled && isStripePack
              ? "将跳转至 Stripe 安全支付页，支持银行卡、支付宝、微信支付（以 Stripe 账户开通的支付方式为准）。"
              : "演示环境：使用下方按钮模拟支付成功（非真实扣款）。"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {!(stripeEnabled && isStripePack) ? (
            <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5">
              <QrCode className="h-24 w-24 text-primary/40" aria-hidden />
            </div>
          ) : null}
          {selectedPack ? (
            <div className="text-center text-sm">
              <p className="font-medium text-foreground">{selectedPack.title}</p>
              <p className="text-muted-foreground">
                {selectedPack.priceLabel} · {selectedPack.credits}{" "}
                {selectedPack.kind === "subscription" ? "次/月额度" : "次额度"}
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {stripeEnabled && isStripePack ? (
            <Button
              type="button"
              className="w-full gap-2"
              disabled={isPaying}
              onClick={onStripeCheckout}
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  跳转支付页…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" aria-hidden />
                  前往 Stripe 支付
                </>
              )}
            </Button>
          ) : null}
          {mockAllowed ? (
            <Button
              type="button"
              className="w-full"
              variant={stripeEnabled && isStripePack ? "secondary" : "default"}
              disabled={isPaying}
              onClick={onMockPaySuccess}
            >
              {isPaying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  处理中…
                </>
              ) : (
                "模拟支付成功"
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={isPaying}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
