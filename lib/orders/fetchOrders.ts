import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export interface OrderItem {
  id: string
  order_id: string
  product_id: number
  quantity: number
  unit_price: number
  products_belong_to?: {
    id: number
    name: string
    description: string
    price: number
    image_url: string
  }
}

export interface Order {
  id: string
  user_id: string
  total_price: number
  status: string
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface RefundSummary {
  approved: number
  pending: number
  rejected: number
}

/**
 * Fetches all orders for a user from Supabase
 * @param userId - The authenticated user's ID
 * @returns Array of orders with order items
 */
export async function fetchOrders(userId: string): Promise<Order[]> {
  if (!userId) {
    return []
  }

  try {
    const supabase = getSupabaseBrowserClient()

    // Try with join first
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products_belong_to(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[SWR] Error fetching orders with join, trying without:", error)
      // Fallback: get orders without product details
      const { data: ordersOnly, error: fallbackError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (fallbackError) {
        console.error("[SWR] Error fetching orders:", fallbackError)
        throw fallbackError
      }

      return ordersOnly || []
    }

    return data || []
  } catch (error) {
    console.error("[SWR] Error in fetchOrders:", error)
    throw error
  }
}

/**
 * Fetches a single order by ID
 * @param userId - The authenticated user's ID
 * @param orderId - The order ID
 * @returns The order with order items
 */
export async function fetchOrderById(userId: string, orderId: string): Promise<Order | null> {
  if (!userId || !orderId) {
    return null
  }

  try {
    const supabase = getSupabaseBrowserClient()

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products_belong_to(*))")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[SWR] Error fetching order:", error)
      throw error
    }

    return data || null
  } catch (error) {
    console.error("[SWR] Error in fetchOrderById:", error)
    throw error
  }
}

/**
 * Fetches refund summaries for order items
 * @param itemIds - Array of order item IDs
 * @returns Record of item ID to refund summary
 */
export async function fetchRefundSummaries(
  itemIds: string[]
): Promise<Record<string, RefundSummary>> {
  if (!itemIds || itemIds.length === 0) {
    return {}
  }

  try {
    const supabase = getSupabaseBrowserClient()

    const { data: refunds, error } = await supabase
      .from("refund_requests")
      .select("order_item_id, quantity, status")
      .in("order_item_id", itemIds)

    if (error) {
      console.error("[SWR] Error fetching refunds:", error)
      throw error
    }

    const summaries: Record<string, RefundSummary> = {}
    refunds?.forEach(
      (row: { order_item_id: string; quantity: number; status: string }) => {
        const current = summaries[row.order_item_id] ?? { approved: 0, pending: 0, rejected: 0 }
        if (row.status === "approved") {
          current.approved += row.quantity
        } else if (row.status === "pending") {
          current.pending += row.quantity
        } else if (row.status === "rejected") {
          current.rejected += row.quantity
        }
        summaries[row.order_item_id] = current
      }
    )
    return summaries
  } catch (error) {
    console.error("[SWR] Error in fetchRefundSummaries:", error)
    throw error
  }
}
