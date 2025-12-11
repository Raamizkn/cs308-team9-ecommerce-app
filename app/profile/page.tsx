"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Heart, Package, LogOut, User } from "lucide-react"
import Link from "next/link"
import { mutate as globalMutate } from "swr"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [wishlist, setWishlist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState("")
  const [taxId, setTaxId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUserData()
    fetchWishlist()
  }, [])

  const fetchUserData = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        // Get profile from profiles table (not users table)
        const { data: profileData } = await supabase.from("profiles").select("*").eq("uid", authUser.id).single()

        // Get customer data if user is already a customer
        const { data: customerData } = await supabase
          .from("customers")
          .select("home_address, tax_id")
          .eq("uid", authUser.id)
          .maybeSingle()

        setUser({
          id: authUser.id,
          email: authUser.email,
          name: (profileData as { name?: string | null } | null)?.name || authUser.user_metadata?.name || "User",
        })

        // Set address and tax_id if customer data exists
        if (customerData) {
          const customer = customerData as { home_address?: string; tax_id?: string } | null
          if (customer) {
            setAddress(customer.home_address || "")
            setTaxId(customer.tax_id || "")
          }
        }
      }
    } catch (error) {
      console.error("[Group9] Error fetching user:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWishlist = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setWishlist([])
        return
      }

      // Fetch wishlist items
      let query = supabase.from("wish_for").select("*").eq("uid", user.id)
      
      // Try to order by created_at if it exists, otherwise just fetch
      const { data: wishlistItems, error: wishlistError } = await query

      if (wishlistError) {
        console.error("[Group9] Error fetching wishlist:", wishlistError)
        console.error("[Group9] Wishlist error details:", JSON.stringify(wishlistError, null, 2))
        setWishlist([])
        return
      }

      console.log("[Group9] Fetched wishlist items:", wishlistItems)

      if (!wishlistItems || wishlistItems.length === 0) {
        console.log("[Group9] No wishlist items found for user:", user.id)
        setWishlist([])
        return
      }

      // Fetch products for each wishlist item
      const productIds = wishlistItems
        .map((item: any) => {
          const pid = item.pid
          // Ensure pid is a number
          return typeof pid === "string" ? parseInt(pid) : pid
        })
        .filter((id: any) => id != null && !isNaN(id))

      console.log("[Group9] Product IDs to fetch:", productIds)

      if (productIds.length === 0) {
        console.log("[Group9] No valid product IDs found")
        setWishlist([])
        return
      }

      const { data: products, error: productsError } = await supabase
        .from("products_belong_to")
        .select("*")
        .in("pid", productIds)

      if (productsError) {
        console.error("[Group9] Error fetching products:", productsError)
        setWishlist([])
        return
      }

      console.log("[Group9] Fetched products:", products)

      // Combine wishlist items with their products and apply image mapping
      const wishlistWithProducts = wishlistItems.map((item: any) => {
        const pid = typeof item.pid === "string" ? parseInt(item.pid) : item.pid
        const product = products?.find((p: any) => p.pid === pid)
        
        // Apply the same image mapping logic as in products API
        let imageUrl = product?.image_url || "/placeholder.svg"
        if (product) {
          if (product.name === 'Time Turner Necklace') {
            imageUrl = '/time-turner-necklace.png'
          } else if (product.name === 'Drago Nova Transforming Bakugan') {
            imageUrl = '/drago-nova-bakugan.png'
          } else if (product.name === 'Elder Wand Replica') {
            imageUrl = '/elder-wand-replica.png'
          }
        }
        
        return {
          ...item,
          pid: pid,
          products_belong_to: product ? {
            ...product,
            image_url: imageUrl
          } : null,
        }
      })

      console.log("[Group9] Combined wishlist with products:", wishlistWithProducts)
      setWishlist(wishlistWithProducts)
    } catch (error) {
      console.error("[Group9] Error fetching wishlist:", error)
      setWishlist([])
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[Group9] Logout error:", error)
    }
  }

  const removeFromWishlist = async (productId: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const pidValue = parseInt(productId) || productId

        // Delete from database
        await supabase.from("wish_for").delete().eq("uid", user.id).eq("pid", pidValue)

        // Update local state
        setWishlist(wishlist.filter((item) => (item.pid?.toString() || item.product_id) !== productId))

        toast({
          title: "Removed from wishlist",
          description: "Item removed from your wishlist",
        })

        // Update the SWR cache for the full wishlist - remove the product from cached array
        const cacheKey = ["wishlist", user.id]
        globalMutate(
          cacheKey,
          (cachedWishlistIds: number[] | undefined) => {
            if (!cachedWishlistIds) return cachedWishlistIds
            // Remove the product ID from the cached wishlist array
            return cachedWishlistIds.filter((id: number) => id !== pidValue)
          },
          false // Don't revalidate, use the updated data immediately
        )

        // Also invalidate individual product status caches
        globalMutate(
          (key) => {
            if (!Array.isArray(key)) return false
            // Clear individual product wishlist status caches for this user
            return key[0] === "wishlist-status" && key[1] === user.id && key[2] === pidValue
          },
          undefined,
          { revalidate: false }
        )
      }
    } catch (error) {
      console.error("[Group9] Error removing from wishlist:", error)
    }
  }

  const saveAddress = async () => {
    try {
      setSaving(true)
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        toast({ title: "Save failed", description: "You must be logged in to save your profile.", variant: "destructive" })
        return
      }

      // Validate required fields
      if (!address.trim()) {
        toast({ title: "Save failed", description: "Please enter your home address.", variant: "destructive" })
        return
      }

      if (!taxId.trim()) {
        toast({ title: "Save failed", description: "Please enter your tax ID.", variant: "destructive" })
        return
      }

      // Insert or update customer record
      const { error: customerError } = await (supabase.from("customers" as any) as any).upsert(
        [
          {
            uid: authUser.id,
            home_address: address.trim(),
            tax_id: taxId.trim(),
          },
        ] as any,
        { onConflict: "uid" }
      )

      if (customerError) {
        console.error("[Group9] Error saving customer:", customerError)
        toast({ 
          title: "Save failed", 
          description: customerError.message || "Failed to save customer information.", 
          variant: "destructive" 
        })
        return
      }

      toast({ 
        title: "Profile saved", 
        description: "Your customer information has been saved. You are now registered as a customer." 
      })
    } catch (e) {
      console.error("[Group9] Error in saveAddress:", e)
      toast({ title: "Save failed", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-[#4ecdc4] border-4 border-black flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-[#1a1a3e]" />
                </div>
                <h2 className="font-bold text-xl text-[#1a1a3e] text-center">{user?.name || "User"}</h2>
                <p className="text-sm text-[#6c757d] text-center">{user?.email}</p>
              </div>

              <div className="space-y-2">
                <Link href="/profile">
                  <Button className="w-full bg-[#5b3a8f] text-white border-4 border-black font-bold justify-start">
                    <User className="h-4 w-4 mr-2" />
                    PROFILE
                  </Button>
                </Link>
                <Link href="/orders">
                  <Button className="w-full bg-white text-black border-4 border-black font-bold justify-start hover:bg-[#e9ecef]">
                    <Package className="h-4 w-4 mr-2" />
                    MY ORDERS
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  className="w-full bg-white text-[#dc3545] border-4 border-black font-bold justify-start hover:bg-[#dc3545] hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  LOGOUT
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">MY PROFILE</h1>
              <p className="text-[#6c757d] font-semibold">Your account details</p>
            </div>

            {/* Profile details */}
            <div className="bg-white border-4 border-black p-6 pixel-shadow-sm mb-8">
              <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4">PROFILE DETAILS</h2>
              <div className="space-y-3 text-[#1a1a3e]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#6c757d]">Name</span>
                  <span className="font-bold">{user?.name || "User"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#6c757d]">Email</span>
                  <span className="font-bold break-all">{user?.email}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#6c757d]">Home address</span>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your home address"
                      className="border-4 border-black"
                    />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-[#6c757d]">Tax ID</span>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="Enter your tax ID"
                      className="border-4 border-black"
                    />
                    <Button onClick={saveAddress} disabled={saving} className="w-full bg-[#ffb347] border-4 border-black text-black font-bold">
                      {saving ? "SAVING..." : "SAVE PROFILE"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e] mb-4">MY WISHLIST</h2>
            <p className="text-[#6c757d] font-semibold mb-6">{wishlist.length} items saved</p>

            {wishlist.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
                <Heart className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
                <p className="text-2xl font-bold text-[#6c757d] mb-4">Your wishlist is empty</p>
                <Link href="/">
                  <Button className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg px-8 py-6">
                    START SHOPPING
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => {
                  const productId = item.pid?.toString() || item.product_id?.toString() || ""
                  return (
                    <div
                      key={item.id}
                      className="bg-[#4ecdc4] border-4 border-black pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      <Link href={`/products/${productId}`} className="block">
                        <div className="relative aspect-square bg-[#2a9d8f] border-b-4 border-black overflow-hidden cursor-pointer">
                          <Image
                            src={item.products_belong_to?.image_url || "/placeholder.svg"}
                            alt={item.products_belong_to?.name || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>

                      <div className="p-4 space-y-3">
                        <Link href={`/products/${productId}`}>
                          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[#1a1a3e] cursor-pointer hover:text-[#5b3a8f] transition-colors">
                            {item.products_belong_to?.name || "Product"}
                          </h3>
                        </Link>

                        <div className="flex items-center justify-between">
                          <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">
                            ${item.products_belong_to?.price || 0}
                          </span>
                          <Button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeFromWishlist(productId)
                            }}
                            size="icon"
                            className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

