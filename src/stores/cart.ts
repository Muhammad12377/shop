import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem } from "@/types"

type CartStore = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
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
      },
      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
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
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "cart-storage" }
  )
)
