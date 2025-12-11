import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export interface WishlistItem {
  uid: string
  pid: number
}

/**
 * Fetches the user's wishlist from Supabase
 * @param userId - The authenticated user's ID
 * @returns Array of wishlist items (product IDs)
 */
export async function fetchWishlist(userId: string): Promise<number[]> {
  if (!userId) {
    return []
  }

  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("wish_for")
      .select("pid")
      .eq("uid", userId)

    if (error) {
      console.error("[SWR] Error fetching wishlist:", error)
      throw error
    }

    return data?.map((item: WishlistItem) => item.pid) || []
  } catch (error) {
    console.error("[SWR] Error in fetchWishlist:", error)
    throw error
  }
}

/**
 * Checks if a specific product is in the user's wishlist
 * @param userId - The authenticated user's ID
 * @param productId - The product ID to check
 * @returns Boolean indicating if product is in wishlist
 */
export async function fetchWishlistStatus(userId: string, productId: number): Promise<boolean> {
  if (!userId || !productId) {
    return false
  }

  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("wish_for")
      .select("uid, pid")
      .eq("uid", userId)
      .eq("pid", productId)
      .maybeSingle()

    if (error) {
      console.error("[SWR] Error checking wishlist status:", error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error("[SWR] Error in fetchWishlistStatus:", error)
    throw error
  }
}
