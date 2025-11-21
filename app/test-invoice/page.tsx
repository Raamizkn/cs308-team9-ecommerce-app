"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { pdf } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/invoice-pdf"
import { Download } from "lucide-react"

export default function TestInvoicePage() {
  const [downloading, setDownloading] = useState(false)

  // Hardcoded sample data
  const sampleInvoiceData = {
    orderId: "abc123def456ghi789jkl012",
    orderDate: new Date().toISOString(),
    customerName: "John Pixel Gamer",
    customerEmail: "john.gamer@pixelvault.com",
    shippingAddress: "123 Retro Street, Pixel City, PC 12345, United States",
    items: [
      {
        id: "1",
        product_name: "Retro Gaming Console - Classic Edition",
        quantity: 1,
        price: 299.99,
        subtotal: 299.99,
      },
      {
        id: "2",
        product_name: "Pixel Art Controller - Wireless",
        quantity: 2,
        price: 49.99,
        subtotal: 99.98,
      },
      {
        id: "3",
        product_name: "8-Bit Adventure Game Collection",
        quantity: 1,
        price: 79.99,
        subtotal: 79.99,
      },
      {
        id: "4",
        product_name: "RGB Gaming Headset",
        quantity: 1,
        price: 89.99,
        subtotal: 89.99,
      },
    ],
    subtotal: 569.95,
    shipping: 10.00,
    tax: 45.60, // 8% of subtotal
    total: 625.55,
    status: "delivered",
    paymentMethod: "Credit Card (****1234)",
  }

  const downloadSampleInvoice = async () => {
    setDownloading(true)
    try {
      // Generate PDF
      const blob = await pdf(<InvoicePDF data={sampleInvoiceData} />).toBlob()

      // Download PDF
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `pixelvault-sample-invoice.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating sample invoice:", error)
      alert("Failed to generate invoice. Check console for details.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border-4 border-black p-8 pixel-shadow">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl text-[#1a1a3e] mb-6">
            INVOICE PDF PREVIEW
          </h1>
          
          <div className="bg-[#4ecdc4] border-4 border-black p-6 mb-8">
            <p className="text-[#1a1a3e] font-semibold mb-4">
              Click the button below to download a sample invoice with hardcoded data.
            </p>
            <p className="text-sm text-[#1a1a3e]">
              This is a test page - you can delete it after viewing the invoice.
            </p>
          </div>

          <div className="bg-[#f8f9fa] border-2 border-black p-6 mb-6">
            <h2 className="font-bold text-lg text-[#1a1a3e] mb-4">Sample Data:</h2>
            <div className="space-y-2 text-sm text-[#6c757d] font-mono">
              <p><strong>Customer:</strong> {sampleInvoiceData.customerName}</p>
              <p><strong>Email:</strong> {sampleInvoiceData.customerEmail}</p>
              <p><strong>Order ID:</strong> {sampleInvoiceData.orderId.substring(0, 8).toUpperCase()}</p>
              <p><strong>Items:</strong> {sampleInvoiceData.items.length} products</p>
              <p><strong>Total:</strong> ${sampleInvoiceData.total.toFixed(2)}</p>
              <p><strong>Status:</strong> {sampleInvoiceData.status.toUpperCase()}</p>
            </div>
          </div>

          <Button
            onClick={downloadSampleInvoice}
            disabled={downloading}
            className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6"
          >
            {downloading ? (
              <>
                <div className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                GENERATING SAMPLE PDF...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                DOWNLOAD SAMPLE INVOICE
              </>
            )}
          </Button>

          <div className="mt-6 p-4 bg-[#fff3cd] border-2 border-black">
            <p className="text-xs text-[#856404] font-semibold">
              💡 TIP: After viewing the sample, delete this test page at <code>app/test-invoice/page.tsx</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

