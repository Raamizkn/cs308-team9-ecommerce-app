import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, email, name } = body

    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("users").insert({
      id,
      email,
      name,
      role: "customer",
    })

    if (error) {
      console.error("[Group9] Error creating user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
