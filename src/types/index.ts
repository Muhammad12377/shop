export type Locale = "en" | "ar"

export type ProductCategory = {
  id: string
  name_en: string
  name_ar: string
  slug: string
  image_url?: string
  created_at: string
}

export type Product = {
  id: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  price: number
  compare_price?: number
  category_id: string
  category?: ProductCategory
  images: string[]
  sizes: string[]
  colors: string[]
  stock: number
  slug: string
  featured: boolean
  active: boolean
  created_at: string
}

export type CartItem = {
  id: string
  product_id: string
  name_en: string
  name_ar: string
  price: number
  image: string
  size: string
  color: string
  quantity: number
  slug: string
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

export type Order = {
  id: string
  user_id: string
  status: OrderStatus
  total: number
  full_name: string
  phone: string
  address: string
  city: string
  notes?: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  size: string
  color: string
}

export type UserProfile = {
  id: string
  email: string
  full_name?: string
  phone?: string
  role: "user" | "admin"
  created_at: string
}

export type AdminStats = {
  total_orders: number
  total_revenue: number
  total_products: number
  total_users: number
}
