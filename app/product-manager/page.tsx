"use client"

import { useState } from "react"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ClipboardList, PackageCheck, PlusCircle, X } from "lucide-react"

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

const mockCategories = ["Consoles", "Accessories", "Collectibles", "Home"]

export default function ProductManagerDashboardPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductRecord[]>(mockProducts)
  const [categories, setCategories] = useState<string[]>(mockCategories)
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(mockDeliveries)
  const [invoices] = useState<InvoiceRecord[]>(mockInvoices)

  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})
  const [newCategory, setNewCategory] = useState("")
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: mockCategories[0],
    price: "",
    stock: "",
    reorderPoint: "",
    warehouse: "Central",
    description: "",
  })

  const handleStockUpdate = (pid: number) => {
    const amount = Number(stockEdits[pid])

    if (isNaN(amount)) {
      toast({
        title: "Invalid adjustment",
        description: "Enter a numeric value to increase or decrease stock",
        variant: "destructive",
      })
      return
    }

    setProducts((prev) =>
      prev.map((product) =>
        product.pid === pid ? { ...product, stock: Math.max(0, product.stock + amount) } : product,
      ),
    )

    setStockEdits((prev) => ({ ...prev, [pid]: "" }))

    toast({
      title: "Stock updated",
      description: "Stock change queued for backend sync",
    })
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

  const handleRemoveProduct = (pid: number) => {
    setProducts((prev) => prev.filter((product) => product.pid !== pid))
    toast({
      title: "Product removed",
      description: "Remember to sync this deletion with the backend",
      variant: "destructive",
    })
  }

  const handleDeliveryStatus = (id: string, status: DeliveryRecord["status"]) => {
    setDeliveries((prev) => prev.map((delivery) => (delivery.id === id ? { ...delivery, status } : delivery)))
    toast({
      title: "Delivery updated",
      description: `Delivery ${id} marked as ${status}`,
    })
  }

  const handleCreateProduct = () => {
    const { name, sku, category, price, stock, reorderPoint, warehouse } = newProduct

    if (!name || !sku || !price || !stock || !reorderPoint) {
      toast({
        title: "Missing information",
        description: "Name, SKU, price, stock, and reorder point are required",
        variant: "destructive",
      })
      return
    }

    const parsedStock = Number(stock)
    const parsedPrice = Number(price)
    const parsedReorder = Number(reorderPoint)

    if ([parsedStock, parsedPrice, parsedReorder].some((num) => isNaN(num) || num < 0)) {
      toast({
        title: "Invalid values",
        description: "Use positive numbers for price, stock, and reorder point",
        variant: "destructive",
      })
      return
    }

    const nextProduct: ProductRecord = {
      pid: Date.now(),
      name,
      sku,
      category,
      stock: parsedStock,
      reorderPoint: parsedReorder,
      price: parsedPrice,
      warehouse,
    }

    setProducts((prev) => [nextProduct, ...prev])
    setNewProduct({
      name: "",
      sku: "",
      category,
      price: "",
      stock: "",
      reorderPoint: "",
      warehouse,
      description: "",
    })

    toast({
      title: "Product drafted",
      description: "Hook this action to `/api/product-manager/products`",
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/admin">
            <Button className="bg-white border-4 border-black text-black hover:bg-[#e9ecef] font-bold mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO ADMIN
            </Button>
          </Link>
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-2">
            PRODUCT MANAGER CONTROL ROOM
          </h1>
          <p className="text-[#6c757d] font-semibold">Manage catalog, categories, deliveries, and review approvals</p>
        </div>

        <div className="bg-[#fff3cd] border-4 border-black p-4 pixel-shadow-sm mb-10">
          <p className="text-sm font-bold text-[#856404]">
            Frontend-Only Notice: Each widget maps to requirement #12. Replace mock state with Supabase queries and secure
            RPC calls when backend endpoints are ready.
          </p>
        </div>

        {/* Inventory Management */}
        <section className="border-4 border-black bg-white pixel-shadow-sm mb-10">
          <div className="border-b-4 border-black p-6">
            <h2 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e]">Inventory & Stock Control</h2>
            <p className="text-[#6c757d]">Adjust stock counts or remove products entirely.</p>
          </div>
          <div className="divide-y-2 divide-black">
            {products.map((product) => {
              const isLow = product.stock <= product.reorderPoint
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
                    <p className="text-sm text-[#6c757d]">Warehouse: {product.warehouse}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-[#1a1a3e]">
                      <span>Stock: {product.stock} units</span>
                      <span>Reorder at: {product.reorderPoint}</span>
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
                >
                  <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                    <SelectValue placeholder="Category" />
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
                  value={newProduct.warehouse}
                  onValueChange={(value) => setNewProduct({ ...newProduct, warehouse: value })}
                >
                  <SelectTrigger className="border-2 border-black bg-[#f8f9fa]">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Central", "East Hub", "West Hub"].map((warehouse) => (
                      <SelectItem key={warehouse} value={warehouse}>
                        {warehouse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Input
                  type="number"
                  placeholder="Reorder point"
                  value={newProduct.reorderPoint}
                  onChange={(event) => setNewProduct({ ...newProduct, reorderPoint: event.target.value })}
                  className="border-2 border-black bg-[#f8f9fa]"
                />
              </div>
              <Textarea
                placeholder="Internal notes / launch plan"
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

