"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, FileText, Download, Printer, Search, Calendar } from "lucide-react"

interface Invoice {
  order_id: number
  customer_name: string
  customer_email: string
  order_date: string
  total_amount: number
  order_status: string
  items: InvoiceItem[]
}

interface InvoiceItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
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
    } catch (error) {
      console.error("[Group9] Error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setFetching(true)
    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch orders within date range
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          status,
          user_id
        `)
        .gte("created_at", new Date(startDate).toISOString())
        .lte("created_at", new Date(endDate + "T23:59:59").toISOString())
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("[Group9] Error fetching orders:", ordersError)
        throw ordersError
      }

      // Fetch customer profiles for all orders with user_id
      const userIds = [...new Set((ordersData || [])
        .filter((o: any) => o.user_id)
        .map((o: any) => o.user_id))]
      
      let profilesMap: Record<string, { name: string; email: string }> = {}
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", userIds)
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.uid] = { name: profile.name || "Unknown Customer", email: "No Email" }
          })
        }
      }

      // For each order, fetch order items
      const invoicesWithItems = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { data: itemsData } = await supabase
            .from("order_items")
            .select(`
              quantity,
              price,
              products_belong_to (
                name
              )
            `)
            .eq("order_id", order.id)

          const items: InvoiceItem[] = (itemsData || []).map((item: any) => ({
            product_name: item.products_belong_to?.name || "Unknown Product",
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price,
          }))

          // Get customer data from profiles map
          const customerName = profilesMap[order.user_id]?.name || "Unknown Customer"
          const customerEmail = profilesMap[order.user_id]?.email || "No Email"

          return {
            order_id: order.id,
            customer_name: customerName,
            customer_email: customerEmail,
            order_date: order.created_at,
            total_amount: order.total,
            order_status: order.status,
            items,
          }
        })
      )

      setInvoices(invoicesWithItems)

      if (invoicesWithItems.length === 0) {
        toast({
          title: "No invoices found",
          description: "No orders found in the selected date range",
        })
      }
    } catch (error) {
      console.error("[Group9] Error fetching invoices:", error)
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to print invoices",
        variant: "destructive",
      })
      return
    }

    const html = generateInvoiceHTML(invoice)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const downloadAsPDF = (invoice: Invoice) => {
    // Create a hidden iframe for printing to PDF
    const iframe = document.createElement("iframe")
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(generateInvoiceHTML(invoice))
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)

    toast({
      title: "Opening print dialog",
      description: "Select 'Save as PDF' in the print dialog",
    })
  }

  const generateInvoiceHTML = (invoice: Invoice) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.order_id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
            }
            .invoice-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-section {
              padding: 15px;
              border: 2px solid #000;
            }
            .info-label {
              font-weight: bold;
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 14px;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #4ecdc4;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 2px solid #000;
            }
            td {
              padding: 10px;
              border: 1px solid #000;
            }
            .total-row {
              background: #f8f9fa;
              font-weight: bold;
              font-size: 16px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #000;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 36px;">PIXEL VAULT</h1>
            <p style="margin: 5px 0; font-size: 18px;">INVOICE</p>
          </div>
          
          <div class="invoice-info">
            <div class="info-section">
              <div class="info-label">INVOICE NUMBER</div>
              <div class="info-value">#${invoice.order_id.toString().padStart(6, "0")}</div>
            </div>
            <div class="info-section">
              <div class="info-label">DATE</div>
              <div class="info-value">${new Date(invoice.order_date).toLocaleDateString()}</div>
            </div>
            <div class="info-section">
              <div class="info-label">CUSTOMER NAME</div>
              <div class="info-value">${invoice.customer_name}</div>
            </div>
            <div class="info-section">
              <div class="info-label">EMAIL</div>
              <div class="info-value">${invoice.customer_email}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>QUANTITY</th>
                <th>UNIT PRICE</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unit_price.toFixed(2)}</td>
                  <td>$${item.total_price.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTAL AMOUNT:</td>
                <td>$${invoice.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Pixel Vault - Your Digital Marketplace</p>
          </div>
        </body>
      </html>
    `
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-[#6bcf7f] text-[#1a1a3e]"
      case "in-transit":
        return "bg-[#ffb347] text-[#1a1a3e]"
      case "processing":
        return "bg-[#4ecdc4] text-[#1a1a3e]"
      default:
        return "bg-[#e9ecef] text-[#6c757d]"
    }
  }

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
            INVOICES
          </h1>
          <p className="text-[#6c757d] font-semibold">View, print, and export invoices by date range</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white border-4 border-black p-6 pixel-shadow-sm mb-8">
          <h2 className="font-bold text-2xl text-[#1a1a3e] mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            SELECT DATE RANGE
          </h2>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-4 border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1a1a3e] mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-4 border-black"
              />
            </div>
            <Button
              onClick={fetchInvoices}
              disabled={fetching}
              className="bg-[#4ecdc4] hover:bg-[#3dbcb4] text-black border-4 border-black font-bold"
            >
              <Search className="h-4 w-4 mr-2" />
              {fetching ? "SEARCHING..." : "SEARCH INVOICES"}
            </Button>
          </div>
        </div>

        {/* Invoices List */}
        {invoices.length > 0 ? (
          <div className="space-y-6">
            {invoices.map((invoice) => (
              <div key={invoice.order_id} className="bg-white border-4 border-black pixel-shadow-sm">
                <div className="bg-[#5b3a8f] border-b-4 border-black p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-[family-name:var(--font-pixel)] text-2xl text-white">
                      INVOICE #{invoice.order_id.toString().padStart(6, "0")}
                    </h3>
                    <span
                      className={`px-3 py-1 text-xs font-bold border-2 border-black ${getStatusColor(
                        invoice.order_status
                      )}`}
                    >
                      {invoice.order_status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => printInvoice(invoice)}
                      className="bg-[#ffb347] hover:bg-[#ffd93d] text-black border-2 border-black font-bold"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      PRINT
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadAsPDF(invoice)}
                      className="bg-[#6bcf7f] hover:bg-[#5bb86f] text-black border-2 border-black font-bold"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">CUSTOMER</div>
                      <div className="font-bold text-[#1a1a3e]">{invoice.customer_name}</div>
                      <div className="text-sm text-[#6c757d]">{invoice.customer_email}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">ORDER DATE</div>
                      <div className="font-bold text-[#1a1a3e]">{formatDate(invoice.order_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#6c757d] mb-1">TOTAL AMOUNT</div>
                      <div className="font-[family-name:var(--font-pixel)] text-2xl text-[#1a1a3e]">
                        ${invoice.total_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-4">
                    <div className="text-sm font-bold text-[#1a1a3e] mb-2">ITEMS</div>
                    <div className="space-y-2">
                      {invoice.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-[#f8f9fa] border-2 border-black"
                        >
                          <div className="flex-grow">
                            <span className="font-bold">{item.product_name}</span>
                            <span className="text-sm text-[#6c757d] ml-2">
                              x{item.quantity} @ ${item.unit_price.toFixed(2)}
                            </span>
                          </div>
                          <div className="font-bold">${item.total_price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border-4 border-black p-12 text-center pixel-shadow-sm">
            <FileText className="h-16 w-16 text-[#6c757d] mx-auto mb-4" />
            <p className="text-2xl font-bold text-[#6c757d] mb-4">
              {startDate && endDate ? "No invoices found" : "Select a date range"}
            </p>
            <p className="text-[#6c757d]">
              {startDate && endDate
                ? "No orders found in the selected date range"
                : "Choose your start and end dates to view invoices"}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

