"use client"

import { useEffect, useState } from "react"
import { CategoryFilter } from "@/components/category-filter"
import { ProductCard } from "@/components/product-card"
import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  rating: number
  review_count: number
  is_limited_edition: boolean
  stock: number
}

interface Category {
  cid: string
  name: string
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, searchQuery, sortBy])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append("category", selectedCategory)
      if (searchQuery) params.append("search", searchQuery)
      if (sortBy) params.append("sort", sortBy)

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const cycleSortBy = () => {
    const sortOptions = ["created_at", "price_asc", "price_desc", "rating"]
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length
    setSortBy(sortOptions[nextIndex])
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case "price_asc":
        return "PRICE: LOW TO HIGH"
      case "price_desc":
        return "PRICE: HIGH TO LOW"
      case "rating":
        return "HIGHEST RATED"
      default:
        return "NEWEST FIRST"
    }
  }

  return (
    <main className="min-h-screen bg-[#e8f4f8]">
      <div className="container mx-auto px-4 py-8">
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
          <Button
            onClick={cycleSortBy}
            className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {getSortLabel()}
          </Button>
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
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
