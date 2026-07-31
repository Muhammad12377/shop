"use client"

import { useState } from "react"
import { useRouter } from "@/lib/i18n/navigation"
import { XCircle } from "lucide-react"
import toast from "react-hot-toast"

export default function CancelOrderButton({
  orderId,
  status,
  isRtl,
}: {
  orderId: string
  status: string
  isRtl: boolean
}) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  if (status !== "pending") return null

  const handleCancel = async () => {
    const ok = confirm(
      isRtl
        ? "هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
        : "Are you sure you want to cancel this order? This action cannot be undone."
    )
    if (!ok) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "PATCH" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Error")
      toast.success(isRtl ? "تم إلغاء الطلب" : "Order cancelled")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "خطأ" : "Error"))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={cancelling}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
    >
      <XCircle className="w-3.5 h-3.5" />
      {cancelling
        ? isRtl ? "جارٍ الإلغاء..." : "Cancelling..."
        : isRtl ? "إلغاء الطلب" : "Cancel Order"}
    </button>
  )
}
