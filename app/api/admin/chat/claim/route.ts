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
    // Handle case where table might not exist yet (graceful degradation)
    let existingConversation = null
    try {
      const { data, error: fetchError } = await adminSupabase
        .from("chat_conversations")
        .select("claimed_by, claimed_at")
        .eq("user_id", user_id)
        .maybeSingle()

      // PGRST116 = not found (OK), 42P01 = relation does not exist (table missing)
      if (fetchError) {
        const errorCode = fetchError.code || (fetchError as any).hint || ''
        const errorMessage = fetchError.message || ''
        
        // Check if table doesn't exist
        if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorCode === 'PGRST116') {
          console.log("[Group9] chat_conversations table does not exist or conversation not found, will create")
          existingConversation = null
        } else {
          console.error("[Group9] Error fetching conversation:", fetchError)
          console.error("[Group9] Error code:", errorCode, "Message:", errorMessage)
          return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
        }
      } else {
        existingConversation = data
      }
    } catch (tableError: any) {
      // Table might not exist - that's OK, we'll create it
      const errorMsg = tableError?.message || String(tableError)
      console.log("[Group9] chat_conversations table may not exist, will create:", errorMsg)
      existingConversation = null
    }

    // If conversation exists and is already claimed by someone else
    if (existingConversation?.claimed_by && existingConversation.claimed_by !== user.id) {
      return NextResponse.json(
        { error: "Conversation is already claimed by another agent" },
        { status: 409 }
      )
    }

    // Claim the conversation (insert or update)
    // Handle case where table might not exist (graceful degradation)
    let claimedConversation = null
    try {
      const { data, error: claimError } = await adminSupabase
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
        const errorCode = claimError.code || (claimError as any).hint || ''
        const errorMessage = claimError.message || ''
        
        // If table doesn't exist (42P01), return success but note that claim system isn't active
        if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
          console.log("[Group9] chat_conversations table does not exist, claim system not active")
          return NextResponse.json({
            success: true,
            conversation: null,
            message: "Claim system not available (table not created yet)",
          })
        }
        console.error("[Group9] Error claiming conversation:", claimError)
        console.error("[Group9] Error code:", errorCode, "Message:", errorMessage)
        return NextResponse.json({ error: "Failed to claim conversation" }, { status: 500 })
      }

      claimedConversation = data
    } catch (tableError: any) {
      // Table doesn't exist - that's OK for now
      console.log("[Group9] chat_conversations table does not exist:", tableError?.message)
      return NextResponse.json({
        success: true,
        conversation: null,
        message: "Claim system not available (table not created yet)",
      })
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

