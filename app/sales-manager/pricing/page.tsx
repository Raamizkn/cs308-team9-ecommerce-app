"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, DollarSign, Search, Edit2, Save, X } from "lucide-react"

interface Product {
  product_id: number
  name: string
  description: string
  price: number
  quantity_in_stocks: number
  category_name: string
}

export default function PricingManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    checkAccessAndLoadProducts()
  }, [])

  const checkAccessAndLoadProducts = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: salesManagerData, error: roleError } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !salesManagerData) {
        router.push("/login")
        return
      }

      // Load products with category info
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          product_id,
          name,
          description,
          price,
          quantity_in_stocks,
          categories (name)
        `)
        .order("name")

      if (productsError) {
        console.error("[Group9] Error loading products:", productsError)
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
        return
      }

      const formattedProducts = (productsData || []).map((p: any) => ({
        product_id: p.product_id,
        name: p.name,
        description: p.description,
        price: p.price,
        quantity_in_stocks: p.quantity_in_stocks,
        category_name: p.categories?.name || "Uncategorized",
      }))

      setProducts(formattedProducts)
    } catch (error) {
      console.error("[Group9] Error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.product_id)
    setEditPrice(product.price.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice("")
  }

  const savePrice = async (productId: number) => {
    const newPrice = parseFloat(editPrice)
    
    if (isNaN(newPrice) || newPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid positive number",
        variant: "destructive",
      })
      return
    }

    setUpdating(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase
        .from("products")
        .update({ price: newPrice })
        .eq("product_id", productId)

      if (error) {
        throw error
      }

      // Update local state
      setProducts(products.map(p => 
        p.product_id === productId ? { ...p, price: newPrice } : p
      ))

      toast({
        title: "Success",
        description: "Price updated successfully",
      })

      setEditingId(null)
      setEditPrice("")
    } catch (error) {
      console.error("[Group9] Error updating price:", error)
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PixelHeader />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-16 h-16 border-4 border-black border-t-[#4ecdc4] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/sales-manager/dashboard">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
            PRICING MANAGEMENT
          </h1>
          <p className="text-[#6c757d] font-semibold">Set and update product prices</p>
        </div>

        {/* Search */}
        <div className="bg-white border-4 border-black p-4 pixel-shadow-sm mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6c757d]" />
            <Input
              type="text"
              placeholder="Search products by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-4 border-black"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white border-4 border-black pixel-shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#4ecdc4] border-b-4 border-black">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-[#1a1a3e]">PRODUCT ID</th>
                  <th className="px-6 py-4 text-left font-bold text-[#1a1a3e]">NAME</th>
                  <th className="px-6 py-4 text-left font-bold text-[#1a1a3e]">CATEGORY</th>
                  <th className="px-6 py-4 text-left font-bold text-[#1a1a3e]">CURRENT PRICE</th>
                  <th className="px-6 py-4 text-left font-bold text-[#1a1a3e]">STOCK</th>
                  <th className="px-6 py-4 text-right font-bold text-[#1a1a3e]">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#6c757d]">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 text-[#6c757d]" />
                      <p className="font-bold">No products found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <tr
                      key={product.product_id}
                      className={`border-b-2 border-black ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold">#{product.product_id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1a1a3e]">{product.name}</div>
                        <div className="text-sm text-[#6c757d] line-clamp-1">
                          {product.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-[#e9ecef] border-2 border-black px-3 py-1 text-xs font-bold">
                          {product.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === product.product_id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 border-4 border-black"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="font-[family-name:var(--font-pixel)] text-lg text-[#1a1a3e]">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${
                            product.quantity_in_stocks === 0
                              ? "text-red-600"
                              : product.quantity_in_stocks < 10
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {product.quantity_in_stocks} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === product.product_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => savePrice(product.product_id)}
                              disabled={updating}
                              className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-2 border-black font-bold"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={cancelEdit}
                              disabled={updating}
                              className="bg-[#ff6b9d] hover:bg-[#e55a8c] text-white border-2 border-black font-bold"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => startEdit(product)}
                            className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-2 border-black font-bold"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            EDIT PRICE
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-[#fff3cd] border-4 border-black p-4 pixel-shadow-sm">
          <p className="text-sm font-bold text-[#856404]">
            <span className="font-[family-name:var(--font-pixel)]">⚠ NOTE:</span> Price changes take
            effect immediately. Customers will see the updated prices on the store.
          </p>
        </div>
      </main>
    </div>
  )
}

