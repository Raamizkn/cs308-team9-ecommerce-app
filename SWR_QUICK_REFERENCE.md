# SWR Implementation - Quick Reference & Concrete Diffs

## Summary of Changes

This file provides concrete before/after code examples and a quick reference for all SWR additions.

---

## 1. Global Setup

### Change 1.1: Add SWR to package.json

**File**: `package.json`

```diff
  "dependencies": {
    ...
    "recharts": "2.15.4",
    "shadcn": "latest",
    "sonner": "^1.7.4",
+   "swr": "^2.2.4",
    "tailwind-merge": "^2.5.5",
    ...
  }
```

**Command**: `yarn add swr`

---

### Change 1.2: Create SWR Provider Component

**File**: `components/swr-provider.tsx` (NEW)

```tsx
"use client"

import React from "react"
import { SWRConfig } from "swr"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        focusThrottleInterval: 300000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
```

---

### Change 1.3: Wrap App with SWR Provider

**File**: `app/layout.tsx`

```diff
  import type React from "react"
  import type { Metadata } from "next"
  import { Geist, Press_Start_2P } from "next/font/google"
  import { Analytics } from "@vercel/analytics/next"
  import { CartProvider } from "@/lib/cart-context"
+ import { SWRProvider } from "@/components/swr-provider"
  import { Toaster } from "@/components/ui/toaster"
  import { ChatLoader } from "@/components/chat-loader"
  import "./globals.css"

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode
  }>) {
    return (
      <html lang="en">
        <body className={`font-sans antialiased ${_pressStart.variable}`}>
+         <SWRProvider>
            <CartProvider>
              {children}
              <ChatLoader />
              <Toaster />
            </CartProvider>
+         </SWRProvider>
          <Analytics />
        </body>
      </html>
    )
  }
```

---

## 2. Wishlist Implementation

### Change 2.1: Create Wishlist Fetch Functions

**File**: `lib/wishlist/fetchWishlist.ts` (NEW)

```typescript
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export interface WishlistItem {
  uid: string
  pid: number
}

export async function fetchWishlist(userId: string): Promise<number[]> {
  if (!userId) return []

  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("wish_for")
      .select("pid")
      .eq("uid", userId)

    if (error) throw error
    return data?.map((item: WishlistItem) => item.pid) || []
  } catch (error) {
    console.error("[SWR] Error in fetchWishlist:", error)
    throw error
  }
}

export async function fetchWishlistStatus(userId: string, productId: number): Promise<boolean> {
  if (!userId || !productId) return false

  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("wish_for")
      .select("uid, pid")
      .eq("uid", userId)
      .eq("pid", productId)
      .maybeSingle()

    if (error) throw error
    return !!data
  } catch (error) {
    console.error("[SWR] Error in fetchWishlistStatus:", error)
    throw error
  }
}
```

---

### Change 2.2: Create Wishlist Hooks

**File**: `hooks/useWishlist.ts` (NEW)

```typescript
"use client"

import { useMemo } from "react"
import useSWR, { SWRConfiguration } from "swr"
import { fetchWishlist, fetchWishlistStatus } from "@/lib/wishlist/fetchWishlist"

export function useWishlist(
  userId: string | null,
  options?: SWRConfiguration
) {
  const key = useMemo(() => (userId ? ["wishlist", userId] : null), [userId])

  const { data, error, mutate } = useSWR(
    key,
    () => fetchWishlist(userId!),
    {
      revalidateOnFocus: false,
      ...options,
    }
  )

  return {
    wishlistProductIds: data || [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}

export function useWishlistStatus(
  userId: string | null,
  productId: number | null,
  options?: SWRConfiguration
) {
  const key = useMemo(
    () => (userId && productId ? ["wishlist-status", userId, productId] : null),
    [userId, productId]
  )

  const { data, error, mutate } = useSWR(
    key,
    () => fetchWishlistStatus(userId!, productId!),
    {
      revalidateOnFocus: false,
      ...options,
    }
  )

  return {
    isInWishlist: data || false,
    isLoading: !error && data === undefined,
    isError: !!error,
    mutate,
  }
}
```

---

### Change 2.3: Integrate useWishlistStatus into Component

**File**: `components/wishlist-button.tsx`

```diff
  "use client"

- import { useState, useEffect, useCallback } from "react"
+ import { useState, useEffect } from "react"
  import { Heart } from "lucide-react"
  import { getSupabaseBrowserClient } from "@/lib/supabase/client"
+ import { useWishlistStatus } from "@/hooks/useWishlist"
  import { useToast } from "@/hooks/use-toast"
- import { useRouter, usePathname } from "next/navigation"
+ import { useRouter } from "next/navigation"

  interface WishlistButtonProps {
    productId: string
    className?: string
  }

  export function WishlistButton({ productId, className }: WishlistButtonProps) {
-   const [isInWishlist, setIsInWishlist] = useState(false)
-   const [loading, setLoading] = useState(false)
-   const [isAuthenticated, setIsAuthenticated] = useState(false)
-   const [hasChecked, setHasChecked] = useState(false)
+   const [userId, setUserId] = useState<string | null>(null)
+   const [isLoadingUser, setIsLoadingUser] = useState(true)
    const { toast } = useToast()
    const router = useRouter()
-   const pathname = usePathname()

+   const pidValue = productId ? parseInt(productId, 10) : null
+   const { isInWishlist, isLoading: isSWRLoading, mutate: mutateWishlist } = useWishlistStatus(userId, pidValue)
+   const isLoading = isLoadingUser || isSWRLoading

    useEffect(() => {
-     checkWishlistStatus()
+     checkAuth()
    }, [])

-   const checkWishlistStatus = useCallback(async (silent = false) => {
+   const checkAuth = async () => {
      try {
-       if (!hasChecked && !silent) {
-         setLoading(true)
-       }
        const supabase = getSupabaseBrowserClient()
        const {
-         data: { user },
-         error: userError,
-       } = await supabase.auth.getUser()
+         data: { user },
+       } = await supabase.auth.getUser()

-       if (userError) {
-         setIsAuthenticated(false)
-         setIsInWishlist(false)
-         setLoading(false)
-         setHasChecked(true)
-         return
-       }
+       setUserId(user?.id || null)
+     } catch (error) {
+       console.error("[Group9] Error checking auth:", error)
+       setUserId(null)
+     } finally {
+       setIsLoadingUser(false)
+     }
+   }

-       if (!user) {
-         setIsAuthenticated(false)
-         setIsInWishlist(false)
-         setLoading(false)
-         setHasChecked(true)
-         return
-       }
-
-       setIsAuthenticated(true)
-
-       const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
-       if (isNaN(pidValue)) {
-         setIsInWishlist(false)
-         setLoading(false)
-         setHasChecked(true)
-         return
-       }
-
-       const { data, error } = await supabase
-         .from("wish_for")
-         .select("uid, pid")
-         .eq("uid", user.id)
-         .eq("pid", pidValue)
-         .maybeSingle()
-
-       if (error) {
-         setIsInWishlist(false)
-       } else {
-         setIsInWishlist(!!data)
-       }
-     } catch (error) {
-       setIsInWishlist(false)
-     } finally {
-       setLoading(false)
-       setHasChecked(true)
-     }
-   }, [productId, hasChecked])
-
-   // ... [Remove Re-check effects and focus listeners] ...

    const handleToggleWishlist = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
-       const {
-         data: { user },
-       } = await supabase.auth.getUser()

-       if (!user) {
+       if (!userId) {
          toast({
            title: "Login required",
            description: "Please log in to add items to your wishlist",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

+       if (!pidValue || isNaN(pidValue)) {
+         toast({
+           title: "Error",
+           description: "Invalid product ID",
+           variant: "destructive",
+         })
+         return
+       }

        if (isInWishlist) {
-         const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
-         if (isNaN(pidValue)) {
-           toast({
-             title: "Error",
-             description: "Invalid product ID",
-             variant: "destructive",
-           })
-           return
-         }

          const { error } = await supabase
            .from("wish_for")
            .delete()
-           .eq("uid", user.id)
+           .eq("uid", userId)
            .eq("pid", pidValue)

          if (error) throw error

          toast({
            title: "Removed from wishlist",
            description: "Item removed from your wishlist",
          })
-         checkWishlistStatus()
+         mutateWishlist()
        } else {
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("uid")
-           .eq("uid", user.id)
+           .eq("uid", userId)
            .maybeSingle()

          if (!existingCustomer) {
            const { data: profile }: any = await supabase
              .from("profiles")
              .select("*")
-             .eq("uid", user.id)
+             .eq("uid", userId)
              .maybeSingle()

            const { error: customerError } = await supabase.from("customers").insert({
-             uid: user.id,
-             home_address: profile?.address || profile?.home_address || "Not provided",
-             tax_id: `TAX-${user.id.slice(0, 8).toUpperCase()}`,
+             uid: userId,
+             home_address: profile?.address || profile?.home_address || "Not provided",
+             tax_id: `TAX-${userId.slice(0, 8).toUpperCase()}`,
            })

            if (customerError) {
              console.error("[Group9] Error creating customer:", customerError)
            }
          }

-         const pidValue = typeof productId === "string" ? parseInt(productId, 10) : productId
-         if (isNaN(pidValue)) {
-           toast({
-             title: "Error",
-             description: "Invalid product ID",
-             variant: "destructive",
-           })
-           return
-         }

          const { data: existingWish } = await supabase
            .from("wish_for")
            .select("uid, pid")
-           .eq("uid", user.id)
+           .eq("uid", userId)
            .eq("pid", pidValue)
            .maybeSingle()

          if (existingWish) {
-           setIsInWishlist(true)
+           mutateWishlist()
            return
          }

          const { error } = await supabase.from("wish_for").insert({
-           uid: user.id,
+           uid: userId,
            pid: pidValue,
          })

          if (error) {
            if (error.code === "23505" || error.message?.includes("duplicate")) {
-             setIsInWishlist(true)
+             mutateWishlist()
              return
            }
            throw error
          }

          toast({
            title: "Added to wishlist",
            description: "Item added to your wishlist",
          })
-         checkWishlistStatus()
+         mutateWishlist()
        }
      } catch (error: any) {
        console.error("[Group9] Error toggling wishlist:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to update wishlist",
          variant: "destructive",
        })
      }
    }

    return (
      <button
        onClick={handleToggleWishlist}
        className={`cursor-pointer transition-all hover:scale-110 ${className || ""}`}
        title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
-       disabled={loading}
+       disabled={isLoading || !userId}
      >
        <Heart
          className={`h-5 w-5 ${
-           loading && !hasChecked
+           isLoading && !userId
              ? "text-[#6c757d] fill-none"
              : isInWishlist
              ? "fill-[#dc3545] text-[#dc3545]"
              : "fill-none text-[#1a1a3e] hover:text-[#dc3545]"
          } transition-colors`}
        />
      </button>
    )
  }
```

---

## 3. Orders Implementation

### Change 3.1: Create Orders Fetch Functions

**File**: `lib/orders/fetchOrders.ts` (NEW)

Contains:
- `fetchOrders(userId)` - All orders with items
- `fetchOrderById(userId, orderId)` - Single order
- `fetchRefundSummaries(itemIds)` - Refund status

[See SWR_IMPLEMENTATION_GUIDE.md for full details]

---

### Change 3.2: Create Orders Hooks

**File**: `hooks/useOrders.ts` (NEW)

Exports:
- `useOrders(userId, options?)` - All orders
- `useOrderById(userId, orderId, options?)` - Single order
- `useRefundSummaries(itemIds, options?)` - Refund data

---

### Change 3.3: Integrate into Orders Page

**File**: `app/orders/page.tsx`

```diff
  "use client"

- import { useEffect, useState } from "react"
+ import { useEffect, useState, useMemo } from "react"
  import Link from "next/link"
  import { PixelHeader } from "@/components/pixel-header"
  import { Button } from "@/components/ui/button"
  import { getSupabaseBrowserClient } from "@/lib/supabase/client"
+ import { useOrders, useRefundSummaries } from "@/hooks/useOrders"
  import { Package, User, LogOut, Eye, Star } from "lucide-react"
  import { useRouter } from "next/navigation"
  import { useToast } from "@/hooks/use-toast"
+ import { type RefundSummary } from "@/lib/orders/fetchOrders"

- type RefundSummary = { approved: number; pending: number; rejected: number }

  export default function OrdersPage() {
    const router = useRouter()
    const { toast } = useToast()
-   const [user, setUser] = useState<any>(null)
-   const [orders, setOrders] = useState<any[]>([])
-   const [loading, setLoading] = useState(true)
-   const [refundSummaryByItem, setRefundSummaryByItem] = useState<Record<string, RefundSummary>>({})
+   const [userId, setUserId] = useState<string | null>(null)
+   const [user, setUser] = useState<any>(null)
    const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
    const [submittingItem, setSubmittingItem] = useState<string | null>(null)

    useEffect(() => {
-     fetchUserData()
-     fetchOrders()
+     checkAuth()
    }, [])

-   const fetchUserData = async () => {
-     try {
-       const supabase = getSupabaseBrowserClient()
-       const {
-         data: { user },
-       } = await supabase.auth.getUser()
-
-       if (user) {
-         const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
-         setUser(data || { email: user.email, name: user.user_metadata?.name })
-       }
-     } catch (error) {
-       console.error("[Group9] Error fetching user:", error)
-     }
-   }
+   const checkAuth = async () => {
+     try {
+       const supabase = getSupabaseBrowserClient()
+       const {
+         data: { user: authUser },
+       } = await supabase.auth.getUser()
+
+       if (authUser) {
+         setUserId(authUser.id)
+         const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single()
+         setUser(data || { email: authUser.email, name: authUser.user_metadata?.name })
+       }
+     } catch (error) {
+       console.error("[Group9] Error checking auth:", error)
+     }
+   }
+
+   const { orders, isLoading: ordersLoading, mutate: mutateOrders } = useOrders(userId)
+
+   const itemIds = useMemo(
+     () => orders.flatMap((order: any) => order.order_items?.map((item: any) => item.id) ?? []),
+     [orders]
+   )
+
+   const { summaries: refundSummaryByItem } = useRefundSummaries(itemIds.length > 0 ? itemIds : null)
+
+   const loading = !userId || ordersLoading
```

And update `handleRequestRefund`:

```diff
  const handleRequestRefund = async (orderId: string, itemId: string) => {
    try {
      setSubmittingItem(itemId)
      const supabase = getSupabaseBrowserClient()
-     const {
-       data: { user },
-     } = await supabase.auth.getUser()

-     if (!user) {
+     if (!userId) {
        toast({
          title: "Please log in",
          description: "You must be signed in to request a refund.",
          variant: "destructive",
        })
        return
      }

      const qty = selectedQty[itemId] ?? 1
      const { error } = await supabase.rpc("create_refund_request", {
-       p_user_id: user.id,
+       p_user_id: userId,
        p_order_item_id: itemId,
        p_quantity: qty,
      })

      if (error) {
        toast({
          title: "Refund failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Refund requested",
        description: "We'll review your request shortly.",
      })

-     await fetchOrders()
+     mutateOrders()
    } catch (error) {
      console.error("[Group9] Refund request error:", error)
      toast({
        title: "Refund failed",
        description: "Unexpected error requesting refund.",
        variant: "destructive",
      })
    } finally {
      setSubmittingItem(null)
    }
  }
```

---

## 4. Sales Manager Dashboard Implementation

### Change 4.1: Create Sales Manager Fetch Functions

**File**: `lib/salesManager/fetchSalesManagerData.ts` (NEW)

Contains:
- `fetchSalesManagerOrders()` - All orders (admin view)
- `fetchRevenueStats()` - Revenue calculations
- `fetchTopProducts(limit)` - Top products by revenue

---

### Change 4.2: Create Sales Manager Hooks

**File**: `hooks/useSalesManagerData.ts` (NEW)

Exports:
- `useSalesManagerOrders(isSalesManager, options?)`
- `useRevenueStats(isSalesManager, options?)`
- `useTopProducts(isSalesManager, limit, options?)`

All require `isSalesManager: true` to fetch.

---

## 5. Summary Table

| Feature | Fetch Function | Hook | Components | Status |
|---------|---|---|---|---|
| Wishlist | `fetchWishlist.ts` | `useWishlist.ts` | `wishlist-button.tsx` | ✅ |
| Orders | `fetchOrders.ts` | `useOrders.ts` | `app/orders/page.tsx` | ✅ |
| Sales Manager | `fetchSalesManagerData.ts` | `useSalesManagerData.ts` | `sales-manager/*` | ✅ |

---

## 6. Testing Commands

```bash
# Install dependencies
yarn install

# Start dev server
yarn dev

# Test in browser
# 1. Add product to wishlist → see heart fill without delay
# 2. Navigate away and back → heart stays filled (cached)
# 3. Remove from wishlist → updates immediately
# 4. View orders → no loading spinner on second visit (cached)
# 5. Request refund → refund summary updates via mutate()
```

---

## Next Steps

If you want to extend SWR to other areas:

1. **Cart (localStorage-based)**:
   - Currently uses Context + localStorage
   - Could add SWR layer for server sync in future

2. **Product Listing**:
   - Create `useProducts(filters)` hook
   - Use `fallbackData` for SSR initial data
   - Cache filtered results by filter key

3. **User Profile**:
   - Create `useProfile(userId)` hook
   - Cache user profile data
   - Invalidate on update

See `SWR_IMPLEMENTATION_GUIDE.md` for full details and best practices.
