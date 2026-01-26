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

    // Use admin client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminSupabase = serviceRoleKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // Check if conversation exists and is claimed by this agent
    const { data: existingConversation, error: fetchError } = await adminSupabase
      .from("chat_conversations")
      .select("claimed_by")
      .eq("user_id", user_id)
      .maybeSingle()

    if (fetchError) {
      console.error("[Group9] Error fetching conversation:", fetchError)
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
    }

    if (!existingConversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Only allow unclaiming if claimed by this agent
    if (existingConversation.claimed_by !== user.id) {
      return NextResponse.json(
        { error: "You can only unclaim conversations you have claimed" },
        { status: 403 }
      )
    }

    // Unclaim the conversation
    const { data: unclaimedConversation, error: unclaimError } = await adminSupabase
      .from("chat_conversations")
      .update({
        claimed_by: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select()
      .single()

    if (unclaimError) {
      console.error("[Group9] Error unclaiming conversation:", unclaimError)
      return NextResponse.json({ error: "Failed to unclaim conversation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversation: unclaimedConversation,
    })
  } catch (error) {
    console.error("[Group9] Unexpected error in unclaim conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

