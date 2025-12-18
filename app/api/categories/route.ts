import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("[Group9] Error fetching categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: data })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("cid")
      .eq("name", name.trim())
      .maybeSingle()

    if (existingCategory) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    // Insert new category
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      console.error("[Group9] Error creating category:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const cid = searchParams.get("cid")

    if (!cid) {
      return NextResponse.json({ error: "Category ID (cid) is required" }, { status: 400 })
    }

    const cidNum = parseInt(cid, 10)
    if (isNaN(cidNum)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    // Check if category is being used by any products
    const { data: productsUsingCategory, error: checkError } = await supabase
      .from("products_belong_to")
      .select("pid")
      .eq("cid", cidNum)
      .limit(1)

    if (checkError) {
      console.error("[Group9] Error checking category usage:", checkError)
      return NextResponse.json({ error: "Failed to check category usage" }, { status: 500 })
    }

    if (productsUsingCategory && productsUsingCategory.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category: It is being used by one or more products" },
        { status: 409 }
      )
    }

    // Delete category
    const { error: deleteError } = await supabase.from("categories").delete().eq("cid", cidNum)

    if (deleteError) {
      console.error("[Group9] Error deleting category:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
