"use client"

import { useState, useEffect } from "react"
import { PixelHeader } from "@/components/pixel-header"
import { ProductCard } from "@/components/product-card"
import { CategoryFilter } from "@/components/category-filter"
import { SearchBar } from "@/components/search-bar"
import { useProducts } from "@/hooks/useProducts"
import { useWishlist } from "@/hooks/useWishlist"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Category {
  cid: number
  name: string
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Fetch products using SWR hook
  const { products, isLoading: loadingProducts } = useProducts({
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
    sort: sortBy,
  })

  // Preload all wishlist IDs at once for instant heart rendering
  const { wishlistProductIds, mutate: mutateWishlist } = useWishlist(userId)

  const loading = loadingProducts || loadingCategories

  // Check user authentication on mount - use cached session for speed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase/client")
        const supabase = getSupabaseBrowserClient()
        
        // Try to get cached session first (fast)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          setUserId(session.user.id)
          setIsLoadingUser(false)
          return
        }

        // Fallback to getUser if no session cached
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id || null)
      } catch (error) {
        console.error("[Group9] Error checking auth:", error)
        setUserId(null)
      } finally {
        setIsLoadingUser(false)
      }
    }

    checkAuth()
  }, [])

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error("[Group9] Error fetching categories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const getSortLabel = (value: string) => {
    switch (value) {
      case "price_asc":
        return "PRICE: LOW TO HIGH"
      case "price_desc":
        return "PRICE: HIGH TO LOW"
      case "popularity":
        return "MOST POPULAR"
      case "rating":
        return "HIGHEST RATED"
      default:
        return "NEWEST FIRST"
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#5b3a8f] via-[#4ecdc4] to-[#ffb347] border-b-4 border-black">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-6xl text-white mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] leading-tight">
            PIXELVAULT
          </h1>
          <p className="text-xl md:text-2xl text-white font-bold mb-8 drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
            Collect Limited-Edition Digital Art
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4 text-[#1a1a3e]">CATEGORIES</h2>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6c757d] font-semibold">
              {loading ? "Loading..." : `${products.length} products found`}
            </p>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[250px] bg-white border-4 border-black font-bold text-black hover:bg-[#e9ecef] transition-colors">
                <SelectValue>
                  {getSortLabel(sortBy)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-4 border-black">
                <SelectItem value="created_at" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                  NEWEST FIRST
                </SelectItem>
                <SelectItem value="price_asc" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                  PRICE: LOW TO HIGH
                </SelectItem>
                <SelectItem value="price_desc" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                  PRICE: HIGH TO LOW
                </SelectItem>
                <SelectItem value="popularity" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                  MOST POPULAR
                </SelectItem>
                <SelectItem value="rating" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
                  HIGHEST RATED
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-[#6c757d]">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                description={product.description || ""}
                image_url={product.image_url || "/placeholder.svg"}
                preloadedWishlistIds={wishlistProductIds}
                onWishlistMutate={mutateWishlist}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a3e] border-t-4 border-black mt-20">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white font-semibold">© 2025 PixelVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
