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

// Get user information by user_id (for invoice generation)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    
    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }
    
    const supabase = await getSupabaseServerClient()
    
    // Get profile name from profiles table
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name")
      .eq("uid", userId)
      .maybeSingle()
    
    // Try to get user email from auth (only works if we have admin access)
    // For now, return name and let client handle email from current user
    let email = null
    try {
      // Check if current request user matches (for security)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser && currentUser.id === userId) {
        email = currentUser.email || null
      }
    } catch (error) {
      // If we can't get current user, that's okay - email will be null
      console.log("[Group9] Could not get current user email")
    }
    
    return NextResponse.json({
      name: profileData?.name || "Customer",
      email: email,
    })
  } catch (error) {
    console.error("[Group9] Error in GET /api/users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
