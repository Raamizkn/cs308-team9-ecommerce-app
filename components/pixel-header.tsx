"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingCart, User, Search, Package, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function PixelHeader() {
  const { totalItems } = useCart()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSalesManager, setIsSalesManager] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)

    // Check if user is a sales manager
    if (user) {
      const { data: salesManagerData } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", user.id)
        .maybeSingle()
      setIsSalesManager(!!salesManagerData)
    }
  }

  return (
    <header className="bg-[#5b3a8f] border-b-4 border-black sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#4ecdc4] border-4 border-black flex items-center justify-center">
              <span className="text-2xl">P</span>
            </div>
            <h1 className="font-[family-name:var(--font-pixel)] text-xl text-white tracking-wider hidden sm:block">
              PIXELVAULT
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white hover:text-[#ffb347] transition-colors font-semibold">
              HOME
            </Link>
            <Link href="/catalog" className="text-white hover:text-[#ffb347] transition-colors font-semibold">
              CATALOG
            </Link>
            <Link href="/about" className="text-white hover:text-[#ffb347] transition-colors font-semibold">
              ABOUT
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
            >
              <Search className="h-5 w-5" />
            </Button>
            {isSalesManager ? (
              <Link href="/sales-manager/dashboard">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                  title="Sales Manager Dashboard"
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href={isAuthenticated ? "/profile" : "/login"}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                >
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            {isAuthenticated && !isSalesManager && (
              <Link href="/orders">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                >
                  <Package className="h-5 w-5" />
                </Button>
              </Link>
            )}
            {!isSalesManager && (
              <Link href="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black relative"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ffb347] text-black text-xs w-5 h-5 flex items-center justify-center border-2 border-black font-bold">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
