import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a support agent
    const { data: supportAgent, error: roleError } = await supabase
      .from("support_agents")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (roleError || !supportAgent) {
      return NextResponse.json({ error: "Forbidden: Support Agent access required" }, { status: 403 })
    }

    // Use admin client to bypass RLS for checking and updating
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminSupabase = serviceRoleKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // Check if conversation exists and is already claimed
    const { data: existingConversation, error: fetchError } = await adminSupabase
      .from("chat_conversations")
      .select("claimed_by, claimed_at")
      .eq("user_id", user_id)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      console.error("[Group9] Error fetching conversation:", fetchError)
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
    }

    // If conversation exists and is already claimed by someone else
    if (existingConversation?.claimed_by && existingConversation.claimed_by !== user.id) {
      return NextResponse.json(
        { error: "Conversation is already claimed by another agent" },
        { status: 409 }
      )
    }

    // Claim the conversation (insert or update)
    const { data: claimedConversation, error: claimError } = await adminSupabase
      .from("chat_conversations")
      .upsert(
        {
          user_id,
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single()

    if (claimError) {
      console.error("[Group9] Error claiming conversation:", claimError)
      return NextResponse.json({ error: "Failed to claim conversation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversation: claimedConversation,
    })
  } catch (error) {
    console.error("[Group9] Unexpected error in claim conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

