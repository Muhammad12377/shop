import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase()
  const { id } = await params

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories!products_category_id_fkey(*)")
    .eq("id", id)
    .eq("active", true)
    .single()

  if (error) return NextResponse.json({ success: false, error: "Product not found" } satisfies ApiResponse, { status: 404 })

  const { data: reviewData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", id)

  const reviewCount = reviewData?.length || 0
  const avgRating = reviewCount > 0
    ? reviewData!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0

  return NextResponse.json({
    success: true,
    data: { ...data, review_avg: Math.round(avgRating * 10) / 10, review_count: reviewCount },
  } satisfies ApiResponse)
}
