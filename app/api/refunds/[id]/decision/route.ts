import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const body = await request.json()
        const { decision } = body

        if (!id || !decision || !['approve', 'reject'].includes(decision)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // 1. Auth Check - User must be logged in
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 2. Role Check - User must be a sales_manager
        const { data: salesManager, error: roleError } = await supabase
            .from("sales_managers")
            .select("uid")
            .eq("uid", user.id)
            .maybeSingle()

        if (roleError || !salesManager) {
            return NextResponse.json({ error: "Forbidden: Sales Manager access required" }, { status: 403 })
        }

        // 3. Call RPC function based on decision
        // decision is either 'approve' or 'reject'
        const rpcFunction = decision === 'approve' ? 'approve_refund_request' : 'reject_refund_request'

        // The ID param from the URL is the refund_request_id.
        const { data, error } = await supabase.rpc(rpcFunction, {
            request_id: id
        })

        if (error) {
            console.error(`[Group9] Error processing refund decision (${decision}):`, error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error("[Group9] Unexpected error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
