import type React from "react"
import type { Metadata } from "next"
import { Geist, Press_Start_2P } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/lib/cart-context"
import { SWRProvider } from "@/components/swr-provider"
import { Toaster } from "@/components/ui/toaster"
import { ChatLoader } from "@/components/chat-loader"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
})

export const metadata: Metadata = {
  title: "PixelVault - Digital Marketplace",
  description: "Buy and collect limited-edition pixelated digital products",
  generator: "Group9.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${_pressStart.variable}`}>
        <SWRProvider>
          <CartProvider>
            {children}
            <ChatLoader />
            <Toaster />
          </CartProvider>
        </SWRProvider>
        <Analytics />
      </body>
    </html>
  )
}
