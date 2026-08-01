export type Locale = "en" | "ar"

export type UserRole = "user" | "admin"

export type UserProfile = {
  id: string
  email: string
  full_name?: string
  phone?: string
  avatar_url?: string
  address?: string
  city?: string
  role: UserRole
  blocked?: boolean
  created_at: string
  updated_at?: string
  is_me?: boolean
  is_main_admin?: boolean
}

export type ProductCategory = {
  id: string
  name_en: string
  name_ar: string
  slug: string
  image_url?: string
  active: boolean
  sort_order: number
  created_at: string
}

export type Product = {
  id: string
  name_en: string
  name_ar: string
  description_en?: string
  description_ar?: string
  price: number
  compare_price?: number
  category_id?: string
  category?: ProductCategory
  images: string[]
  sizes: string[]
  colors: string[]
  stock: number
  size_stock?: Record<string, number>
  slug: string
  featured: boolean
  active: boolean
  video_url?: string
  created_at: string
  updated_at?: string
}

export type ProductVariant = {
  id: string
  product_id: string
  size: string
  color: string
  stock: number
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
  stock?: number
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "fake"

export type Order = {
  id: string
  user_id: string
  status: OrderStatus
  subtotal: number
  shipping_fee: number
  discount: number
  coupon_code?: string
  total: number
  full_name: string
  phone: string
  address: string
  city: string
  shipping_country?: string
  shipping_zone?: string
  country_id?: string
  zone_id?: string
  notes?: string
  items: OrderItem[]
  user_email?: string
  cancelled_by?: "admin" | "customer" | null
  cancel_reason?: string | null
  created_at: string
  updated_at?: string
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
  image?: string
}

export type OrderStatusHistory = {
  id: string
  order_id: string
  status: OrderStatus
  note?: string
  created_by?: string
  created_at: string
}

export type Address = {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string
  address: string
  city: string
  is_default: boolean
  created_at: string
}

export type Review = {
  id: string
  user_id: string
  product_id: string
  rating: number
  comment?: string
  user?: Pick<UserProfile, "full_name" | "avatar_url">
  created_at: string
}

export type Coupon = {
  id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order: number
  max_uses: number
  used_count: number
  expires_at?: string
  active: boolean
  created_at: string
}

export type AdminStats = {
  total_orders: number
  total_revenue: number
  total_products: number
  total_users: number
  total_categories: number
  total_coupons: number
  pending_orders: number
  low_stock_products: number
  recent_orders: Order[]
  revenue_by_month: { month: string; revenue: number }[]
  orders_by_status: { status: string; count: number }[]
}

export type StoreSettings = {
  store_name: string
  store_description: string
  currency: string
  shipping_fee: number
  free_shipping_min: number
  delivery_days: string
  contact_email: string
  contact_phone: string
  social_instagram: string
  hero_title_en: string
  hero_title_ar: string
  hero_subtitle_en: string
  hero_subtitle_ar: string
  hero_image_url?: string
  [key: string]: any
}

export type Media = {
  id: string
  url: string
  alt?: string
  created_at: string
}

export type ShippingZone = {
  id: string
  country_id: string
  name_en: string
  name_ar: string
  price: number
  active: boolean
  created_at: string
}

export type ShippingCountry = {
  id: string
  name_en: string
  name_ar: string
  price: number
  active: boolean
  created_at: string
  zones?: ShippingZone[]
}

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  code?: string
}
