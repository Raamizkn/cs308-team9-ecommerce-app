import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Create user profile after signup
export async function POST(request: Request) {
  try {
    const { id, name } = await request.json()
    
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("profiles")
      .insert([{ uid: id, name }])
      .select()

    if (error) {
      console.error("[Group9] Error creating profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data[0] }, { status: 201 })
  } catch (error) {
    console.error("[Group9] Error in POST /api/users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
