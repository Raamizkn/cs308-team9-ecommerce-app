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
    checkSalesManagerRedirect()
    fetchUserData()
    fetchWishlist()
  }, [])

  const checkSalesManagerRedirect = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: salesManagerData } = await supabase
          .from("sales_managers")
          .select("uid")
          .eq("uid", authUser.id)
          .maybeSingle()

        if (salesManagerData) {
          router.push("/sales-manager/dashboard")
          return
        }
      }
    } catch (error) {
      console.error("[Group9] Error checking sales manager:", error)
    }
  }

  const fetchUserData = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        // Get profile from profiles table (not users table)
        const { data } = await supabase.from("profiles").select("*").eq("uid", authUser.id).single()
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: data?.name || authUser.user_metadata?.name || "User",
        })
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

      if (user) {
        const { data } = await supabase
          .from("wishlist")
          .select("*, products(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        setWishlist(data || [])
      }
    } catch (error) {
      console.error("[Group9] Error fetching wishlist:", error)
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
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId)

        setWishlist(wishlist.filter((item) => item.product_id !== productId))

        toast({
          title: "Removed from wishlist",
          description: "Item removed from your wishlist",
        })
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

      if (!authUser) return

      const { error } = await (supabase.from("profiles" as any) as any).upsert(
        [
          {
            uid: authUser.id,
            address,
            tax_id: taxId,
            name: user?.name || authUser.user_metadata?.name || "User",
          },
        ] as any,
        { onConflict: "uid" }
      )

      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" })
        return
      }

      setUser({ ...user, address: address || "Not provided", taxId: taxId || "" })
      toast({ title: "Profile saved", description: "Your profile information has been updated." })
    } catch (e) {
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
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#4ecdc4] border-4 border-black pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    <div className="relative aspect-square bg-[#2a9d8f] border-b-4 border-black overflow-hidden">
                      <Image
                        src={item.products.image_url || "/placeholder.svg"}
                        alt={item.products.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[#1a1a3e]">
                        {item.products.name}
                      </h3>

                      <div className="flex items-center justify-between">
                        <span className="font-[family-name:var(--font-pixel)] text-xl text-[#1a1a3e]">
                          ${item.products.price}
                        </span>
                        <Button
                          onClick={() => removeFromWishlist(item.product_id)}
                          size="icon"
                          className="bg-[#dc3545] hover:bg-[#c82333] text-white border-4 border-black"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

