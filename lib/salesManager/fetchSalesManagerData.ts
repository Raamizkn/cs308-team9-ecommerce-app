import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export interface SalesManagerOrder {
  order_id: number
  customer_name: string
  customer_email: string
  order_date: string
  total_amount: number
  order_status: string
  items: SalesManagerOrderItem[]
}

export interface SalesManagerOrderItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface RevenueStats {
  total_revenue: number
  total_profit: number
  total_costs: number
  gross_margin: number
  average_order_value: number
  total_orders: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  total_sold: number
  total_revenue: number
}

/**
 * Fetches all orders for sales manager dashboard
 * @returns Array of orders with full details
 */
export async function fetchSalesManagerOrders(): Promise<SalesManagerOrder[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      throw new Error("User not authenticated")
    }

    // Verify user is a sales manager
    const { data: salesManagerData, error: roleError } = await supabase
      .from("sales_managers")
      .select("uid")
      .eq("uid", authUser.id)
      .maybeSingle()

    if (roleError || !salesManagerData) {
      throw new Error("User is not a sales manager")
    }

    // Load all orders
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
          order_id,
          order_date,
          total_amount,
          order_status,
          profiles!orders_customer_id_fkey (
            name,
            customers (email)
          )
        `
      )
      .order("order_date", { ascending: false })

    if (ordersError) throw ordersError

    // For each order, fetch order items
    const ordersWithItems = await Promise.all(
      (ordersData || []).map(async (order: any) => {
        const { data: itemsData } = await supabase
          .from("order_items")
          .select(
            `
              quantity,
              unit_price,
              products (name)
            `
          )
          .eq("order_id", order.order_id)

        const items: SalesManagerOrderItem[] = (itemsData || []).map((item: any) => ({
          product_name: item.products?.name || "Unknown Product",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        }))

        return {
          order_id: order.order_id,
          customer_name: order.profiles?.name || "Unknown Customer",
          customer_email: order.profiles?.customers?.email || "No Email",
          order_date: order.order_date,
          total_amount: order.total_amount,
          order_status: order.order_status,
          items,
        }
      })
    )

    return ordersWithItems
  } catch (error) {
    console.error("[SWR] Error fetching sales manager orders:", error)
    throw error
  }
}

/**
 * Fetches revenue statistics for sales manager dashboard
 * @returns Revenue statistics object
 */
export async function fetchRevenueStats(): Promise<RevenueStats> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      throw new Error("User not authenticated")
    }

    // Verify user is a sales manager
    const { data: salesManagerData, error: roleError } = await supabase
      .from("sales_managers")
      .select("uid")
      .eq("uid", authUser.id)
      .maybeSingle()

    if (roleError || !salesManagerData) {
      throw new Error("User is not a sales manager")
    }

    // Fetch all orders and items
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("total_amount")

    if (ordersError) throw ordersError

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("unit_price, quantity, products(cost)")

    if (itemsError) throw itemsError

    // Calculate statistics
    const total_revenue =
      ordersData?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0

    let total_costs = 0
    if (itemsData) {
      itemsData.forEach((item: any) => {
        const cost = item.products?.cost || 0
        total_costs += cost * item.quantity
      })
    }

    const total_profit = total_revenue - total_costs
    const total_orders = ordersData?.length || 0
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0
    const gross_margin = total_revenue > 0 ? (total_profit / total_revenue) * 100 : 0

    return {
      total_revenue,
      total_profit,
      total_costs,
      gross_margin,
      average_order_value,
      total_orders,
    }
  } catch (error) {
    console.error("[SWR] Error fetching revenue stats:", error)
    throw error
  }
}

/**
 * Fetches top selling products for sales manager dashboard
 * @param limit - Number of top products to return (default: 5)
 * @returns Array of top products
 */
export async function fetchTopProducts(limit: number = 5): Promise<TopProduct[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      throw new Error("User not authenticated")
    }

    // Verify user is a sales manager
    const { data: salesManagerData, error: roleError } = await supabase
      .from("sales_managers")
      .select("uid")
      .eq("uid", authUser.id)
      .maybeSingle()

    if (roleError || !salesManagerData) {
      throw new Error("User is not a sales manager")
    }

    // Fetch order items with product details
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, products(name)")

    if (itemsError) throw itemsError

    // Aggregate by product
    const productMap: Record<
      number,
      {
        product_id: number
        product_name: string
        total_sold: number
        total_revenue: number
      }
    > = {}

    itemsData?.forEach((item: any) => {
      const productId = item.product_id
      if (!productMap[productId]) {
        productMap[productId] = {
          product_id: productId,
          product_name: item.products?.name || "Unknown Product",
          total_sold: 0,
          total_revenue: 0,
        }
      }
      productMap[productId].total_sold += item.quantity
      productMap[productId].total_revenue += item.quantity * item.unit_price
    })

    // Convert to array and sort by revenue (descending)
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)

    return topProducts
  } catch (error) {
    console.error("[SWR] Error fetching top products:", error)
    throw error
  }
}
