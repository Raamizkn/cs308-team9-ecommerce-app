"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react"

interface Product {
  pid: number
  name: string
  sku: string
  category: string
  stock: number
  price: number
  warehouse: string
  description?: string
}

export default function ProductManagementPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    distributor: "Spin Master",
    description: "",
    model: "",
    warranty: "",
  })
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/product-manager/products")
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch products")
      }
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("[Group9] Error fetching products:", error)
      toast({
        title: "Error loading products",
        description: error instanceof Error ? error.message : "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch("/api/categories")
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch categories")
      }
      const data = await response.json()
      const categoryNames = (data.categories || []).map((cat: { name: string }) => cat.name)
      setCategories(categoryNames)
      if (categoryNames.length > 0 && !newProduct.category) {
        setNewProduct((prev) => ({ ...prev, category: categoryNames[0] }))
      }
    } catch (error) {
      console.error("[Group9] Error fetching categories:", error)
      toast({
        title: "Error loading categories",
        description: error instanceof Error ? error.message : "Failed to fetch categories",
        variant: "destructive",
      })
    } finally {
      setLoadingCategories(false)
    }
  }

  const updateStock = async (pid: number, adjustment: number) => {
    try {
      const response = await fetch(`/api/product-manager/products/${pid}/stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adjustment }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update stock")
      }

      const data = await response.json()

      setProducts((prev) =>
        prev.map((product) =>
          product.pid === pid ? { ...product, stock: data.stock } : product,
        ),
      )

      setStockEdits((prev) => ({ ...prev, [pid]: "" }))

      toast({
        title: "Stock updated",
        description: "Product stock has been updated successfully",
      })
    } catch (error) {
      console.error("[Group9] Error updating stock:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      })
    }
  }

  const handleRemoveProduct = async (pid: number) => {
    if (!confirm("Are you sure you want to remove this product? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/product-manager/products/${pid}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove product")
      }

      setProducts((prev) => prev.filter((product) => product.pid !== pid))

      toast({
        title: "Product removed",
        description: "Product has been successfully removed from the database",
        variant: "destructive",
      })
    } catch (error) {
      console.error("[Group9] Error removing product:", error)
      toast({
        title: "Error removing product",
        description: error instanceof Error ? error.message : "Failed to remove product",
        variant: "destructive",
      })
    }
  }

  const handleCreateProduct = async () => {
    const { name, sku, category, price, stock, distributor, description, model, warranty } = newProduct

    if (!name || !price || stock === undefined || !category) {
      toast({
        title: "Missing information",
        description: "Name, price, stock, and category are required",
        variant: "destructive",
      })
      return
    }

    const parsedStock = Number(stock)
    const parsedPrice = Number(price)

    if (isNaN(parsedStock) || isNaN(parsedPrice) || parsedStock < 0 || parsedPrice < 0) {
      toast({
        title: "Invalid values",
        description: "Price and stock must be non-negative numbers",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/product-manager/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sku: sku || null,
          category,
          price: parsedPrice,
          stock: parsedStock,
          distributor_info: distributor,
          description: description || null,
          model: model || null,
          warranty_status: warranty || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create product")
      }

      const data = await response.json()

      setProducts((prev) => [data.product, ...prev])

      setNewProduct({
        name: "",
        sku: "",
        category: categories[0] || "",
        price: "",
        stock: "",
        distributor: "Spin Master",
        description: "",
        model: "",
        warranty: "",
      })

      setIsAddDialogOpen(false)

      toast({
        title: "Product created",
        description: `${name} has been successfully added to the database`,
      })
    } catch (error) {
      console.error("[Group9] Error creating product:", error)
      toast({
        title: "Error creating product",
        description: error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      })
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admin">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">PRODUCT MANAGEMENT</h1>
              <p className="text-[#6c757d] font-semibold">{products.length} products in inventory</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#6bcf7f] hover:bg-[#5ab86f] text-black border-4 border-black font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  ADD PRODUCT
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-black">
                <DialogHeader>
                  <DialogTitle className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">
                    Add New Product
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Product name *"
                    value={newProduct.name}
                    onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })}
                    className="border-2 border-black bg-[#f8f9fa]"
                  />
                  <Input
                    placeholder="SKU (unique identifier)"
                    value={newProduct.sku}
                    onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value })}
                    className="border-2 border-black bg-[#f8f9fa]"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={newProduct.category}
                      onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                        <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Category *"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newProduct.distributor}
                      onValueChange={(value) => setNewProduct({ ...newProduct, distributor: value })}
                    >
                      <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                        <SelectValue placeholder="Distributor" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Spin Master", "CD Projekt Red", "The Pokemon Company", "Wizarding World Inc."].map((distributor) => (
                          <SelectItem key={distributor} value={distributor}>
                            {distributor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Price *"
                      value={newProduct.price}
                      onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })}
                      className="border-2 border-black bg-[#f8f9fa]"
                    />
                    <Input
                      type="number"
                      placeholder="Starting stock *"
                      value={newProduct.stock}
                      onChange={(event) => setNewProduct({ ...newProduct, stock: event.target.value })}
                      className="border-2 border-black bg-[#f8f9fa]"
                    />
                  </div>
                  <Input
                    placeholder="Model"
                    value={newProduct.model}
                    onChange={(event) => setNewProduct({ ...newProduct, model: event.target.value })}
                    className="border-2 border-black bg-[#f8f9fa]"
                  />
                  <Input
                    placeholder="Warranty Status"
                    value={newProduct.warranty}
                    onChange={(event) => setNewProduct({ ...newProduct, warranty: event.target.value })}
                    className="border-2 border-black bg-[#f8f9fa]"
                  />
                  <Textarea
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })}
                    className="border-2 border-black bg-[#f8f9fa]"
                    rows={3}
                  />
                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={() => setIsAddDialogOpen(false)}
                      variant="outline"
                      className="border-2 border-black"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProduct}
                      className="bg-[#4ecdc4] text-[#1a1a3e] border-4 border-black font-bold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      CREATE PRODUCT
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-4 border-black max-w-md"
          />
        </div>

        <div className="bg-white border-4 border-black pixel-shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-16 h-16 border-4 border-black border-t-[#ffb347] rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-[#6c757d]">
              <p className="text-lg font-bold mb-2">No products found</p>
              <p className="text-sm">Click "ADD PRODUCT" to create your first product</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#5b3a8f] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold border-r-4 border-black">PRODUCT</th>
                    <th className="px-6 py-4 text-left font-bold border-r-4 border-black">CATEGORY</th>
                    <th className="px-6 py-4 text-left font-bold border-r-4 border-black">PRICE</th>
                    <th className="px-6 py-4 text-left font-bold border-r-4 border-black">STOCK</th>
                    <th className="px-6 py-4 text-left font-bold border-r-4 border-black">DISTRIBUTOR</th>
                    <th className="px-6 py-4 text-left font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]"}>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-[#4ecdc4] border-2 border-black flex-shrink-0">
                          <Image
                            src="/placeholder.svg"
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1a3e]">{product.name}</p>
                          {product.sku && (
                            <span className="text-xs text-[#6c757d] font-mono">SKU: {product.sku}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="text-sm text-[#6c757d] font-semibold">{product.category || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="font-bold text-[#5b3a8f]">${product.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="+/- units"
                          value={stockEdits[product.pid] ?? ""}
                          onChange={(e) =>
                            setStockEdits((prev) => ({
                              ...prev,
                              [product.pid]: e.target.value,
                            }))
                          }
                          className="w-24 border-2 border-black text-center font-bold"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const adjustment = Number(stockEdits[product.pid])
                            if (!isNaN(adjustment) && adjustment !== 0) {
                              updateStock(product.pid, adjustment)
                            }
                          }}
                          className="bg-[#5b3a8f] text-white border-2 border-black font-bold text-xs"
                        >
                          Update
                        </Button>
                        <span className="text-sm font-bold text-[#1a1a3e] min-w-[3rem]">
                          {product.stock} units
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r-4 border-t-4 border-black">
                      <span className="text-sm text-[#6c757d]">{product.warehouse || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 border-t-4 border-black">
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          onClick={() => handleRemoveProduct(product.pid)}
                          className="bg-[#dc3545] hover:bg-[#c82333] text-white border-2 border-black"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
