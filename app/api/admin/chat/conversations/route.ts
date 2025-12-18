import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // "all", "unclaimed", "claimed", "my_claims"

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

    // First, get all unique user_ids from chat_messages to ensure we show all active conversations
    const { data: messages, error: messagesError } = await adminSupabase
      .from("chat_messages")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })

    if (messagesError) {
      console.error("[Group9] Error fetching messages:", messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    const uniqueUserIds = Array.from(new Set(messages?.map((m: any) => m.user_id) || []))

    // If no messages, return empty array
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({
        conversations: [],
      })
    }

    // Get claim status for each conversation (if table exists)
    let conversationsMap = new Map()
    try {
      const { data: conversationsData, error: conversationsError } = await adminSupabase
        .from("chat_conversations")
        .select("user_id, claimed_by, claimed_at, created_at, updated_at")
        .in("user_id", uniqueUserIds)

      // If table doesn't exist (PGRST116) or query fails, just continue without claim data
      if (!conversationsError) {
        conversationsMap = new Map(
          (conversationsData || []).map((conv: any) => [conv.user_id, conv])
        )
      } else if (conversationsError.code === '42P01') {
        // Table doesn't exist - this is OK, we'll show conversations without claim status
        console.log("[Group9] chat_conversations table doesn't exist yet. Showing conversations without claim status.")
      } else {
        console.error("[Group9] Error fetching conversations:", conversationsError)
        // Continue anyway - show conversations without claim status
      }
    } catch (error: any) {
      // Table might not exist - continue without claim data
      console.log("[Group9] Could not fetch claim status (table may not exist):", error.message)
    }

    // Build conversations list, including those without chat_conversations entries
    let conversations = uniqueUserIds.map((userId: string) => {
      const convData = conversationsMap.get(userId)
      return {
        user_id: userId,
        claimed_by: convData?.claimed_by || null,
        claimed_at: convData?.claimed_at || null,
        created_at: convData?.created_at || null,
        updated_at: convData?.updated_at || null,
      }
    })

    // Apply filter
    if (filter === "unclaimed") {
      conversations = conversations.filter((c: any) => !c.claimed_by)
    } else if (filter === "claimed") {
      conversations = conversations.filter((c: any) => c.claimed_by)
    } else if (filter === "my_claims") {
      conversations = conversations.filter((c: any) => c.claimed_by === user.id)
    }
    // "all" or no filter = show all

    // Sort by updated_at (most recent first), or created_at if updated_at is null
    conversations.sort((a: any, b: any) => {
      const aTime = a.updated_at || a.created_at || new Date(0).toISOString()
      const bTime = b.updated_at || b.created_at || new Date(0).toISOString()
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    // Enrich conversations with user info
    const enrichedConversations = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const userId = conv.user_id

        // Check if it's a UUID (logged-in user) or guest
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          const { data: profile } = await adminSupabase
            .from("profiles")
            .select("name, uid")
            .eq("uid", userId)
            .maybeSingle()

          let userEmail = null
          try {
            const { data: authUserData, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId)
            if (!authUserError && authUserData?.user?.email) {
              userEmail = authUserData.user.email
            }
          } catch (error) {
            console.error(`[Group9] Error fetching email for ${userId}:`, error)
          }

          // Get agent name if claimed
          let agentName = null
          if (conv.claimed_by) {
            const { data: agentProfile } = await adminSupabase
              .from("profiles")
              .select("name")
              .eq("uid", conv.claimed_by)
              .maybeSingle()
            agentName = agentProfile?.name || null
          }

          return {
            ...conv,
            users: {
              name: profile?.name || "User",
              email: userEmail,
            },
            agent: agentName ? { name: agentName } : null,
          }
        } else {
          // Guest user
          return {
            ...conv,
            users: {
              name: "Guest User",
              email: null,
            },
            agent: conv.claimed_by ? { name: "Agent" } : null, // Could fetch agent name if needed
          }
        }
      })
    )

    return NextResponse.json({
      conversations: enrichedConversations,
    })
  } catch (error) {
    console.error("[Group9] Unexpected error in GET conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

