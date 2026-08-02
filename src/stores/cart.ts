import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem } from "@/types"

type CartStore = {
  items: CartItem[]
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  hydrate: () => Promise<void>
}

function toServerItem(i: CartItem) {
  return {
    product_id: i.product_id,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      const sync = () => {
        const items = get().items
        fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: items.map(toServerItem) }),
        }).catch(() => {})
      }

      return {
        items: [],
        hasHydrated: false,
        setHasHydrated: (v) => set({ hasHydrated: v }),
        addItem: (item) => {
          const items = get().items
          const existing = items.find(
            (i) => i.product_id === item.product_id && i.size === item.size && i.color === item.color
          )
          const maxQty = item.stock ?? Infinity
          if (existing) {
            const quantity = Math.min(existing.quantity + item.quantity, maxQty)
            set({
              items: items.map((i) =>
                i.product_id === item.product_id && i.size === item.size && i.color === item.color
                  ? { ...i, quantity, stock: maxQty === Infinity ? i.stock : item.stock }
                  : i
              ),
            })
          } else {
            set({ items: [...items, { ...item, quantity: Math.min(item.quantity, maxQty) }] })
          }
          sync()
        },
        removeItem: (id) => {
          set({ items: get().items.filter((i) => i.id !== id) })
          sync()
        },
        updateQuantity: (id, quantity) => {
          if (quantity <= 0) {
            get().removeItem(id)
            return
          }
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity: Math.min(quantity, i.stock ?? Infinity) } : i
            ),
          })
          sync()
        },
        clearCart: () => set({ items: [] }),
        total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        hydrate: async () => {
          try {
            const res = await fetch("/api/cart")
            if (!res.ok) return
            const result = await res.json()
            if (result.success && Array.isArray(result.data)) {
              set({ items: result.data })
            }
          } catch {
            // offline or unauthenticated — keep local cart
          }
        },
      }
    },
    {
      name: "cart-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
