"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingCart, User, Search, Package, BarChart3, Settings, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { DiscountNotificationBadge } from "@/components/discount-notification-badge"

export function PixelHeader() {
  const { totalItems } = useCart()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSalesManager, setIsSalesManager] = useState(false)
  const [isProductManager, setIsProductManager] = useState(false)
  const [isSupportAgent, setIsSupportAgent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      
      if (authError) {
        console.error("[Group9] Auth error:", authError)
        setIsAuthenticated(false)
        setIsSalesManager(false)
        setIsProductManager(false)
        return
      }
      
      if (user) {
        setIsAuthenticated(true)
        // Check if user is a sales manager
        try {
          const { data: salesManagerData, error: salesManagerError } = await supabase
            .from("sales_managers")
            .select("uid")
            .eq("uid", user.id)
            .maybeSingle()
          
          if (salesManagerError) {
            console.error("[Group9] Sales manager check error:", salesManagerError)
          }
          setIsSalesManager(!!salesManagerData)
        } catch (error) {
          console.error("[Group9] Error checking sales manager:", error)
          setIsSalesManager(false)
        }

        // Check if user is a product manager
        try {
          const { data: productManagerData, error: productManagerError } = await supabase
            .from("product_managers")
            .select("uid")
            .eq("uid", user.id)
            .maybeSingle()
          
          if (productManagerError) {
            console.error("[Group9] Product manager check error:", productManagerError)
          }
          setIsProductManager(!!productManagerData)
        } catch (error) {
          console.error("[Group9] Error checking product manager:", error)
          setIsProductManager(false)
        }

        // Check if user is a support agent
        try {
          const { data: supportAgentData, error: supportAgentError } = await supabase
            .from("support_agents")
            .select("uid")
            .eq("uid", user.id)
            .maybeSingle()
          
          if (supportAgentError) {
            console.error("[Group9] Support agent check error:", supportAgentError)
          }
          setIsSupportAgent(!!supportAgentData)
        } catch (error) {
          console.error("[Group9] Error checking support agent:", error)
          setIsSupportAgent(false)
        }
      } else {
        setIsAuthenticated(false)
        setIsSalesManager(false)
        setIsProductManager(false)
        setIsSupportAgent(false)
      }
    } catch (error) {
      console.error("[Group9] Error checking auth:", error)
      setIsAuthenticated(false)
      setIsSalesManager(false)
      setIsProductManager(false)
    } finally {
      setIsLoading(false)
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
            <Link href="/about" className="text-white hover:text-[#ffb347] transition-colors font-semibold">
              ABOUT
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            {/* User/Profile or Dashboard */}
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
            ) : isProductManager ? (
              <Link href="/product-manager">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                  title="Product Manager Dashboard"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            ) : isSupportAgent ? (
              <Link href="/admin/chat">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                  title="Support Agent Chat"
                >
                  <MessageSquare className="h-5 w-5" />
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
            
            {/* Notifications - Only for authenticated customers */}
            {isAuthenticated && !isSalesManager && !isProductManager && !isSupportAgent && (
              <DiscountNotificationBadge />
            )}
            
            {/* Orders - Hidden for sales managers, product managers, and support agents */}
            {!isSalesManager && !isProductManager && !isSupportAgent && (
              <Link href={isAuthenticated ? "/orders" : "/login"}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#3d2660] hover:text-[#ffb347] border-2 border-transparent hover:border-black"
                  title={isAuthenticated ? "View orders" : "Login to view orders"}
                >
                  <Package className="h-5 w-5" />
                </Button>
              </Link>
            )}
            
            {/* Cart - Hidden for sales managers, product managers, and support agents */}
            {!isSalesManager && !isProductManager && !isSupportAgent && (
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
