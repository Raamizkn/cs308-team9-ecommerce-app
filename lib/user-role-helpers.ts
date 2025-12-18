import { getSupabaseBrowserClient } from "@/lib/supabase/client"

/**
 * Check if the current authenticated user is a sales manager
 */
export async function isSalesManager(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from("sales_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    return !error && !!data
  } catch (error) {
    console.error("[Group9] Error checking sales manager:", error)
    return false
  }
}

/**
 * Check if the current authenticated user is a product manager
 */
export async function isProductManager(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    return !error && !!data
  } catch (error) {
    console.error("[Group9] Error checking product manager:", error)
    return false
  }
}

/**
 * Check if the current authenticated user is a support agent
 */
export async function isSupportAgent(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from("support_agents")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    return !error && !!data
  } catch (error) {
    console.error("[Group9] Error checking support agent:", error)
    return false
  }
}

/**
 * Get the role of the current authenticated user
 */
export async function getUserRole(): Promise<"sales_manager" | "product_manager" | "support_agent" | "customer" | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Check each role table
    const [salesManager, productManager, supportAgent, customer] = await Promise.all([
      supabase.from("sales_managers").select("uid").eq("uid", user.id).maybeSingle(),
      supabase.from("product_managers").select("uid").eq("uid", user.id).maybeSingle(),
      supabase.from("support_agents").select("uid").eq("uid", user.id).maybeSingle(),
      supabase.from("customers").select("uid").eq("uid", user.id).maybeSingle(),
    ])

    if (!salesManager.error && salesManager.data) return "sales_manager"
    if (!productManager.error && productManager.data) return "product_manager"
    if (!supportAgent.error && supportAgent.data) return "support_agent"
    if (!customer.error && customer.data) return "customer"

    return null
  } catch (error) {
    console.error("[Group9] Error getting user role:", error)
    return null
  }
}
