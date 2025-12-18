import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    const supabase = await getSupabaseServerClient()

    let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Group9] Error fetching messages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Use admin client to bypass RLS for profile lookups (support agents need to see all user names)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminSupabase = serviceRoleKey 
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // Enrich messages with user info if user_id is a UUID
    const enrichedMessages = await Promise.all(
      (data || []).map(async (msg: any) => {
        // If user_id is a UUID (logged-in user), fetch profile info
        if (msg.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msg.user_id)) {
          try {
            const { data: profile, error: profileError } = await adminSupabase
              .from("profiles")
              .select("name, uid")
              .eq("uid", msg.user_id)
              .maybeSingle()
            
            if (profileError) {
              console.error(`[Group9] Error fetching profile for ${msg.user_id}:`, profileError)
            }
            
            if (profile && profile.name) {
              return {
                ...msg,
                users: {
                  name: profile.name,
                  email: null, // Email not needed for chat display
                },
              }
            }
          } catch (error) {
            console.error(`[Group9] Error enriching message for ${msg.user_id}:`, error)
          }
        }
        // For guest users (or if profile lookup failed), check if it's a guest ID pattern
        if (msg.user_id && msg.user_id.startsWith('guest_')) {
          return {
            ...msg,
            users: {
              name: "Guest User",
              email: null,
            },
          }
        }
        // If UUID but no profile found, still show as "User" not "Guest User"
        return {
          ...msg,
          users: {
            name: "User",
            email: null,
          },
        }
      })
    )

    return NextResponse.json({ messages: enrichedMessages })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, message, is_support, attachments, is_guest } = body

    // Allow empty message if attachments are present
    if ((!message || !message.trim()) && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Message or attachment is required" }, { status: 400 })
    }

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id,
        message: message?.trim() || "(Attachment)",
        is_support: is_support || false,
        attachments: attachments || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[Group9] Error sending message:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Use admin client to bypass RLS for profile lookups
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminSupabase = serviceRoleKey 
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase

    // Enrich the message with user info
    let enrichedMessage = data
    if (data.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.user_id)) {
      try {
        const { data: profile, error: profileError } = await adminSupabase
          .from("profiles")
          .select("name, uid")
          .eq("uid", data.user_id)
          .maybeSingle()
        
        if (profileError) {
          console.error(`[Group9] Error fetching profile for ${data.user_id}:`, profileError)
        }
        
        if (profile && profile.name) {
          enrichedMessage = {
            ...data,
            users: {
              name: profile.name,
              email: null,
            },
          }
        } else {
          // UUID but no profile found - still a logged-in user, just show "User"
          enrichedMessage = {
            ...data,
            users: {
              name: "User",
              email: null,
            },
          }
        }
      } catch (error) {
        console.error(`[Group9] Error enriching message for ${data.user_id}:`, error)
        enrichedMessage = {
          ...data,
          users: {
            name: "User",
            email: null,
          },
        }
      }
    } else if (data.user_id && data.user_id.startsWith('guest_')) {
      // Guest user
      enrichedMessage = {
        ...data,
        users: {
          name: "Guest User",
          email: null,
        },
      }
    } else {
      // Fallback
      enrichedMessage = {
        ...data,
        users: {
          name: "User",
          email: null,
        },
      }
    }

    return NextResponse.json({ success: true, message: enrichedMessage })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
