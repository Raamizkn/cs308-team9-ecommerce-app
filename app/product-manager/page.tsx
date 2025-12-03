"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, ClipboardList, PackageCheck, PlusCircle, X, LogOut } from "lucide-react"

interface ProductRecord {
  pid: number
  name: string
  sku: string
  category: string
  stock: number
  reorderPoint: number
  price: number
  warehouse: string
}

interface DeliveryRecord {
  id: string
  customer: string
  address: string
  product: string
  quantity: number
  total: number
  status: "packing" | "in-transit" | "delivered"
  dueDate: string
}

interface InvoiceRecord {
  invoiceId: string
  orderId: string
  customer: string
  total: number
  status: "awaiting-shipment" | "shipped" | "delivered"
  createdAt: string
}

const mockProducts: ProductRecord[] = [
  {
    pid: 101,
    name: "Retro Pixel Console",
    sku: "PV-CON-101",
    category: "Consoles",
    stock: 42,
    reorderPoint: 20,
    price: 299.99,
    warehouse: "Central",
  },
  {
    pid: 205,
    name: "Arcade Fight Stick",
    sku: "PV-ACC-205",
    category: "Accessories",
    stock: 12,
    reorderPoint: 15,
    price: 149.0,
    warehouse: "Central",
  },
  {
    pid: 309,
    name: "8-bit Collector Figure",
    sku: "PV-COL-309",
    category: "Collectibles",
    stock: 5,
    reorderPoint: 12,
    price: 89.99,
    warehouse: "East Hub",
  },
  {
    pid: 411,
    name: "Limited Edition Cartridge Lamp",
    sku: "PV-HOME-411",
    category: "Home",
    stock: 27,
    reorderPoint: 10,
    price: 59.99,
    warehouse: "West Hub",
  },
]

const mockDeliveries: DeliveryRecord[] = [
  {
    id: "DLV-98231",
    customer: "John Doe",
    address: "Pixel Street 42, Istanbul",
    product: "Retro Pixel Console",
    quantity: 1,
    total: 299.99,
    status: "packing",
    dueDate: "2025-11-30",
  },
  {
    id: "DLV-98232",
    customer: "Amelia Stone",
    address: "Arcade Ave 18, Ankara",
    product: "Arcade Fight Stick",
    quantity: 2,
    total: 298.0,
    status: "in-transit",
    dueDate: "2025-12-02",
  },
  {
    id: "DLV-98233",
    customer: "Rafael Green",
    address: "Console Blvd 7, Izmir",
    product: "8-bit Collector Figure",
    quantity: 1,
    total: 89.99,
    status: "delivered",
    dueDate: "2025-11-27",
  },
]

const mockInvoices: InvoiceRecord[] = [
  {
    invoiceId: "INV-5001",
    orderId: "ORD-1881",
    customer: "Ceren K.",
    total: 428.5,
    status: "awaiting-shipment",
    createdAt: "2025-11-26",
  },
  {
    invoiceId: "INV-5002",
    orderId: "ORD-1882",
    customer: "Kemal T.",
    total: 179.99,
    status: "shipped",
    createdAt: "2025-11-25",
  },
  {
    invoiceId: "INV-5003",
    orderId: "ORD-1874",
    customer: "Sarah O.",
    total: 89.99,
    status: "delivered",
    createdAt: "2025-11-20",
  },
]

export default function ProductManagerDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(mockDeliveries)
  const [invoices] = useState<InvoiceRecord[]>(mockInvoices)
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)

  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})
  const [newCategory, setNewCategory] = useState("")
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    reorderPoint: "",
    distributor: "Spin Master",
    description: "",
    model: "",
    warranty: "",
  })

  // Check product manager access on mount
  useEffect(() => {
    checkProductManagerAccess()
  }, [])

  const checkProductManagerAccess = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      // Check if user is a product manager
      const { data: productManagerData, error: roleError } = await supabase
        .from("product_managers")
        .select("uid")
        .eq("uid", authUser.id)
        .maybeSingle()

      if (roleError || !productManagerData) {
        router.push("/login")
        return
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", authUser.id)
        .single()

      setUser({
        ...authUser,
        name: profileData?.name || authUser.email?.split("@")[0] || "Product Manager",
      })

      // Fetch products after access is confirmed
      fetchProducts()
    } catch (error) {
      console.error("[Group9] Error checking product manager access:", error)
      router.push("/login")
    } finally {
      setCheckingAccess(false)
    }
  }

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

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("[Group9] Logout error:", error)
      toast({
        title: "Logout failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Fetch categories on mount
  useEffect(() => {
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
        // Set default category if available
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

    fetchCategories()
  }, [toast])

  const handleStockUpdate = async (pid: number) => {
    const amount = Number(stockEdits[pid])

    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Invalid adjustment",
        description: "Enter a non-zero numeric value to increase or decrease stock",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/product-manager/products/${pid}/stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adjustment: amount }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update stock")
      }

      const data = await response.json()

      // Update local state
      setProducts((prev) =>
        prev.map((product) =>
          product.pid === pid ? { ...product, stock: data.stock } : product,
        ),
      )

      setStockEdits((prev) => ({ ...prev, [pid]: "" }))

      toast({
        title: "Stock updated",
        description: `Stock successfully ${amount > 0 ? "increased" : "decreased"} by ${Math.abs(amount)} units`,
      })
    } catch (error) {
      console.error("[Group9] Error updating stock:", error)
      toast({
        title: "Error updating stock",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      return
    }
    if (categories.includes(newCategory.trim())) {
      toast({
        title: "Category exists",
        description: "This category is already tracked",
      })
      return
    }

    setCategories((prev) => [...prev, newCategory.trim()])
    setNewCategory("")
    toast({
      title: "Category added",
      description: "Remember to persist this in Supabase",
    })
  }

  const handleRemoveCategory = (name: string) => {
    setCategories((prev) => prev.filter((category) => category !== name))
    toast({
      title: "Category removed",
      description: `Removed ${name} from catalog tracking`,
      variant: "destructive",
    })
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

      // Update local state
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

  const handleDeliveryStatus = (id: string, status: DeliveryRecord["status"]) => {
    setDeliveries((prev) => prev.map((delivery) => (delivery.id === id ? { ...delivery, status } : delivery)))
    toast({
      title: "Delivery updated",
      description: `Delivery ${id} marked as ${status}`,
    })
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

      // Add new product to local state
      setProducts((prev) => [data.product, ...prev])

      // Reset form
      setNewProduct({
        name: "",
        sku: "",
        category,
        price: "",
        stock: "",
        reorderPoint: "",
        distributor: "Spin Master",
        description: "",
        model: "",
        warranty: "",
      })

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

  if (checkingAccess) {
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
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
                PRODUCT MANAGER CONTROL ROOM
              </h1>
              <p className="text-[#6c757d] font-semibold">
                Welcome back, {user?.name || "Product Manager"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogout}
                className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold"
              >
                <LogOut className="h-4 w-4 mr-2" />
                LOGOUT
              </Button>
              <Link href="/">
                <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Store
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Inventory Management */}
        <section className="border-4 border-black bg-white pixel-shadow-sm mb-10">
          <div className="border-b-4 border-black p-6">
            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Inventory & Stock Control</h2>
            <p className="text-[#6c757d]">Adjust stock counts or remove products entirely.</p>
          </div>
          {loading ? (
            <div className="p-6 text-center text-[#6c757d]">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-[#6c757d]">
              No products found. Add your first product below.
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {products.map((product) => {
              const isLow = product.stock <= 10 // Low stock threshold
              return (
                <div key={product.pid} className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-[#1a1a3e]">{product.name}</h3>
                      {isLow ? (
                        <span className="px-3 py-1 bg-[#dc3545] text-white text-xs font-bold border-2 border-black">
                          REORDER NOW
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#6bcf7f] text-[#1a1a3e] text-xs font-bold border-2 border-black">
                          OK
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6c757d] font-mono">SKU: {product.sku} • {product.category}</p>
                    <p className="text-sm text-[#6c757d]">Distributor: {product.warehouse}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-[#1a1a3e]">
                      <span>Stock: {product.stock} units</span>
                      <span>Price: ${product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Input
                      placeholder="+/- units"
                      value={stockEdits[product.pid] ?? ""}
                      onChange={(event) =>
                        setStockEdits((prev) => ({
                          ...prev,
                          [product.pid]: event.target.value,
                        }))
                      }
                      className="border-2 border-black bg-[#f8f9fa]"
                    />
                    <Button
                      onClick={() => handleStockUpdate(product.pid)}
                      className="bg-[#5b3a8f] text-white border-4 border-black font-bold"
                    >
                      UPDATE STOCK
                    </Button>
                    <Button
                      onClick={() => handleRemoveProduct(product.pid)}
                      className="bg-[#dc3545] text-white border-4 border-black font-bold"
                    >
                      REMOVE PRODUCT
                    </Button>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </section>

        {/* New Product */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Draft New Product</h2>
              <p className="text-[#6c757d]">Fill in core details and queue for approval</p>
            </div>
            <div className="p-6 space-y-4">
              <Input
                placeholder="Product name"
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
                    <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Category"} />
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
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
                <Input
                  type="number"
                  placeholder="Starting stock"
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
              <Button onClick={handleCreateProduct} className="w-full bg-[#4ecdc4] text-[#1a1a3e] border-4 border-black font-bold">
                <PlusCircle className="h-4 w-4 mr-2" />
                SAVE PRODUCT DRAFT
              </Button>
            </div>
          </div>

          {/* Category Management */}
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Category & Catalog Rules</h2>
              <p className="text-[#6c757d]">Create curated groupings for storefront navigation</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="flex items-center gap-2 px-3 py-2 bg-[#e9ecef] border-2 border-black text-sm font-bold text-[#1a1a3e]"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="text-[#dc3545] hover:text-black"
                      aria-label={`Remove ${category}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
                <Button onClick={handleAddCategory} className="bg-[#1a1a3e] text-white border-4 border-black font-bold">
                  ADD
                </Button>
              </div>
              <div className="bg-[#f8f9fa] border-2 border-dashed border-black p-4 text-sm text-[#6c757d]">
                TODO: Wire this section into `/api/product-manager/categories` (Supabase `categories` table). The product manager
                should be the only role allowed to mutate categories.
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Queue */}
        <section className="border-4 border-black bg-white pixel-shadow-sm mb-10">
          <div className="border-b-4 border-black p-6">
            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Delivery & Fulfillment Board</h2>
            <p className="text-[#6c757d]">View every delivery record and update its status.</p>
          </div>
          <div className="divide-y-2 divide-black">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-[#1a1a3e]">{delivery.product}</h3>
                    <span className="text-xs font-bold border-2 border-black px-3 py-1 bg-white">
                      {delivery.quantity} pcs
                    </span>
                  </div>
                  <p className="text-sm text-[#6c757d] font-mono">
                    Delivery #{delivery.id} • Due {new Date(delivery.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-[#6c757d]">Customer: {delivery.customer}</p>
                  <p className="text-sm text-[#6c757d]">Address: {delivery.address}</p>
                  <p className="text-sm font-bold text-[#1a1a3e] mt-1">Total: ${delivery.total.toFixed(2)}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <Select value={delivery.status} onValueChange={(value: DeliveryRecord["status"]) => handleDeliveryStatus(delivery.id, value)}>
                    <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="packing">Packing</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleDeliveryStatus(delivery.id, "delivered")}
                    className="bg-[#6bcf7f] text-[#1a1a3e] border-4 border-black font-bold"
                  >
                    <PackageCheck className="h-4 w-4 mr-2" />
                    MARK DELIVERED
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invoices and Review */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Invoice Log</h2>
              <p className="text-[#6c757d]">Read-only list of invoices tied to deliveries.</p>
            </div>
            <div className="p-6 space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.invoiceId} className="border-2 border-black p-4 bg-[#f8f9fa]">
                  <div>
                    <p className="text-sm font-mono text-[#6c757d]">Invoice #{invoice.invoiceId}</p>
                    <p className="text-lg font-bold text-[#1a1a3e]">Order {invoice.orderId}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="font-bold text-[#1a1a3e]">Customer: {invoice.customer}</span>
                    <span>Total: ${invoice.total.toFixed(2)}</span>
                    <span>Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                    <span>Status: {invoice.status.replace("-", " ")}</span>
                  </div>
                </div>
              ))}
              <div className="text-xs text-[#6c757d]">
                TODO: connect to `/orders` and `/invoices` tables. Product managers can only update fulfillment-related fields.
              </div>
            </div>
          </div>

          <div className="border-4 border-black bg-white pixel-shadow-sm">
            <div className="border-b-4 border-black p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Review Moderation</h2>
                <p className="text-[#6c757d]">Stay on top of approvals before comments go live</p>
              </div>
              <Link href="/admin/reviews">
                <Button className="bg-[#1a1a3e] text-white border-4 border-black font-bold">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  OPEN REVIEW PANEL
                </Button>
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#f8f9fa] border-2 border-black p-4">
                <p className="text-sm text-[#6c757d] mb-2">Pending approvals</p>
                <p className="text-3xl font-bold text-[#1a1a3e]">3 reviews</p>
                <p className="text-sm text-[#6c757d]">
                  Pull data from `/api/reviews/pending` and show quick insights in this card.
                </p>
              </div>
              <div className="bg-[#fff3cd] border-2 border-dashed border-black p-4 text-sm text-[#856404]">
                Reminder: Only product managers can approve/disapprove reviews (requirement #12). The standalone moderation UI
                already exists at `/admin/reviews`; this dashboard surfaces its metrics for quick navigation.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

