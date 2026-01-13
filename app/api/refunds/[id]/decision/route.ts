import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { sendRefundApprovalEmail } from "@/lib/refunds/sendRefundApprovalEmail"
import { createClient } from "@supabase/supabase-js"

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

        // 3. Fetch refund request details before processing (for email notification)
        const { data: refundRequest, error: refundFetchError } = await supabase
            .from("refund_requests")
            .select(`
                id,
                order_item_id,
                quantity,
                order_items!inner (
                    id,
                    order_id,
                    product_id,
                    price,
                    orders!inner (
                        id,
                        user_id,
                        created_at
                    ),
                    products_belong_to!inner (
                        pid,
                        name
                    )
                )
            `)
            .eq("id", id)
            .single()

        if (refundFetchError || !refundRequest) {
            console.error("[Group9] Error fetching refund request:", refundFetchError)
            return NextResponse.json({ error: "Refund request not found" }, { status: 404 })
        }

        // 4. Call RPC function based on decision
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

        // 5. Send email notification if approved
        if (decision === 'approve' && refundRequest) {
            const orderItem = refundRequest.order_items
            const order = orderItem?.orders
            const product = orderItem?.products_belong_to
            const customerId = order?.user_id

            if (customerId && order && product) {
                // Fetch customer email - MUST always find it since email is required for account creation
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                let customerEmail: string | null = null
                let customerName: string = "Customer"

                if (!serviceRoleKey) {
                    console.error("[Group9] ❌ SUPABASE_SERVICE_ROLE_KEY is not set - cannot fetch customer email")
                } else {
                    try {
                        const adminClient = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            serviceRoleKey,
                            {
                                auth: {
                                    autoRefreshToken: false,
                                    persistSession: false,
                                },
                            }
                        )

                        // Get customer name from profiles
                        const { data: profileData } = await adminClient
                            .from("profiles")
                            .select("name")
                            .eq("uid", customerId)
                            .maybeSingle()

                        if (profileData?.name) {
                            customerName = profileData.name
                            console.log(`[Group9] Found customer name: ${customerName}`)
                        }

                        // Get customer email from auth.users (REQUIRED - all accounts have email)
                        const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(customerId)
                        if (!authUserError && authUserData?.user?.email) {
                            customerEmail = authUserData.user.email
                            console.log(`[Group9] ✅ Found customer email from auth.users: ${customerEmail}`)
                        } else {
                            console.error(`[Group9] ❌ Error fetching customer email from auth.users: ${authUserError?.message || 'Email not found'}`)
                            
                            // Fallback: Try using the admin API endpoint
                            try {
                                const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/user-email?user_id=${customerId}`)
                                if (emailResponse.ok) {
                                    const emailData = await emailResponse.json()
                                    if (emailData.email) {
                                        customerEmail = emailData.email
                                        console.log(`[Group9] ✅ Found customer email via admin API: ${customerEmail}`)
                                    }
                                }
                            } catch (apiError) {
                                console.error("[Group9] ❌ Error fetching email via admin API:", apiError)
                            }
                        }
                    } catch (emailError) {
                        console.error("[Group9] ❌ Error fetching customer email for refund approval:", emailError)
                        
                        // Last resort: Try admin API endpoint
                        if (!customerEmail) {
                            try {
                                const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/user-email?user_id=${customerId}`)
                                if (emailResponse.ok) {
                                    const emailData = await emailResponse.json()
                                    if (emailData.email) {
                                        customerEmail = emailData.email
                                        console.log(`[Group9] ✅ Found customer email via admin API (fallback): ${customerEmail}`)
                                    }
                                }
                            } catch (apiError) {
                                console.error("[Group9] ❌ Error fetching email via admin API (fallback):", apiError)
                            }
                        }
                    }
                }

                // Calculate refund amount including 20% tax
                // Tax is 20%, so multiply by 1.2 to include tax in refund
                const refundAmount = parseFloat(orderItem.price || 0) * (refundRequest.quantity || 0) * 1.2
                console.log(`[Group9] Calculated refund amount: $${refundAmount.toFixed(2)} (price: $${orderItem.price}, qty: ${refundRequest.quantity})`)

                // ALWAYS send email - customer email MUST exist (required for account creation)
                if (customerEmail) {
                    console.log(`[Group9] 📧 Attempting to send refund approval email to ${customerEmail} for refund ${id}`)
                    sendRefundApprovalEmail({
                        userEmail: customerEmail,
                        userName: customerName,
                        refundId: id,
                        orderId: order.id,
                        productName: product.name || "Product",
                        refundAmount: refundAmount,
                        quantity: refundRequest.quantity || 0,
                        orderDate: order.created_at,
                    })
                        .then((sent) => {
                            if (sent) {
                                console.log(`[Group9] ✅ Refund approval email sent successfully to ${customerEmail} for refund ${id}`)
                            } else {
                                console.error(`[Group9] ❌ Refund approval email failed to send to ${customerEmail} for refund ${id}`)
                            }
                        })
                        .catch((error) => {
                            console.error("[Group9] ❌ Error sending refund approval email:", error)
                        })
                } else {
                    // This should NEVER happen - all accounts require email
                    console.error(`[Group9] ❌ CRITICAL: Customer email not found for refund ${id} (customerId: ${customerId})`)
                    console.error(`[Group9] This should not happen - all accounts require email. Check auth.users table.`)
                    // Still log the refund approval succeeded, but email failed
                }
            }
        }

        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error("[Group9] Unexpected error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
