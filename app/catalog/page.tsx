"use client"

import { useState, useEffect } from "react"
import { PixelHeader } from "@/components/pixel-header"
import { CategoryFilter } from "@/components/category-filter"
import { ProductCard } from "@/components/product-card"
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

export default function CatalogPage() {
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

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
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
    <div className="min-h-screen bg-[#e8f4f8]">
      <PixelHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-5xl text-[#2c3e50] mb-4 pixel-shadow">
            PIXEL CATALOG
          </h1>
          <p className="text-lg text-[#5b3a8f] font-semibold">Browse our collection of limited-edition digital art</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-[#1a1a3e]">CATEGORIES</h2>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Sort and Count */}
        <div className="flex items-center justify-between mb-6">
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
    </div>
  )
}
