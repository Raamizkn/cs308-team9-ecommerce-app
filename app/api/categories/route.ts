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
