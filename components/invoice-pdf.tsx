import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 4,
    borderBottomColor: '#1a1a3e',
    paddingBottom: 20,
  },
  logo: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 10,
    color: '#5b3a8f',
    fontFamily: 'Helvetica-Bold',
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#5b3a8f',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 10,
    color: '#1a1a3e',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  textBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5b3a8f',
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    padding: 10,
    minHeight: 40,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f8f9fa',
  },
  col1: {
    width: '10%',
  },
  col2: {
    width: '40%',
  },
  col3: {
    width: '15%',
    textAlign: 'center',
  },
  col4: {
    width: '15%',
    textAlign: 'right',
  },
  col5: {
    width: '20%',
    textAlign: 'right',
  },
  summaryBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#4ecdc4',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
  },
  summaryValue: {
    fontSize: 11,
    color: '#1a1a3e',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1a1a3e',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: 2,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 9,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 3,
  },
  thankYou: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#ffb347',
    borderRadius: 4,
    textAlign: 'center',
  },
  thankYouText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
  },
  statusBadge: {
    backgroundColor: '#6bcf7f',
    padding: 5,
    borderRadius: 3,
    marginTop: 5,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a3e',
    textAlign: 'center',
  },
})

interface InvoiceItem {
  id: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

interface InvoiceData {
  orderId: string
  orderDate: string
  customerName: string
  customerEmail: string
  shippingAddress: string
  items: InvoiceItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: string
  paymentMethod: string
}

export const InvoicePDF = ({ data }: { data: InvoiceData }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.logo}>◾ PIXELVAULT</Text>
              <Text style={styles.tagline}>Retro Gaming Store</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.textBold}>Invoice #{data.orderId.substring(0, 8).toUpperCase()}</Text>
              <Text style={styles.text}>{formatDate(data.orderDate)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{data.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bill To & Ship To */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={styles.textBold}>{data.customerName}</Text>
            <Text style={styles.text}>{data.customerEmail}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Ship To:</Text>
            <Text style={styles.text}>{data.shippingAddress}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Payment:</Text>
            <Text style={styles.text}>{data.paymentMethod}</Text>
            <Text style={styles.text}>Order Date: {formatDate(data.orderDate)}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>ITEM</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>QTY</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>PRICE</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>TOTAL</Text>
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => (
            <View 
              key={item.id} 
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.tableRowAlt : null
              ]}
            >
              <Text style={[styles.text, styles.col1]}>{index + 1}</Text>
              <Text style={[styles.text, styles.col2]}>{item.product_name}</Text>
              <Text style={[styles.text, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.text, styles.col4]}>${item.price.toFixed(2)}</Text>
              <Text style={[styles.textBold, styles.col5]}>${item.subtotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ alignItems: 'flex-end', marginTop: 10 }}>
          <View style={{ width: '50%' }}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>${data.subtotal.toFixed(2)}</Text>
              </View>
              {data.tax > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax ({((data.tax / data.subtotal) * 100).toFixed(0)}%):</Text>
                  <Text style={styles.summaryValue}>${data.tax.toFixed(2)}</Text>
                </View>
              )}
              {data.shipping > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                  <Text style={styles.summaryValue}>${data.shipping.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL:</Text>
                <Text style={styles.totalValue}>${data.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Thank You Message */}
        <View style={styles.thankYou}>
          <Text style={styles.thankYouText}>THANK YOU FOR YOUR PURCHASE!</Text>
          <Text style={[styles.text, { textAlign: 'center', marginTop: 5 }]}>
            Questions? Contact us at support@pixelvault.com
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PixelVault - Retro Gaming Store</Text>
          <Text style={styles.footerText}>Email: support@pixelvault.com | Web: www.pixelvault.com</Text>
          <Text style={styles.footerText}>
            This is a computer-generated invoice. No signature required.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

