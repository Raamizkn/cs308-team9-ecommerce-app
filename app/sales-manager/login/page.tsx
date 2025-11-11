"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PixelHeader } from "@/components/pixel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function SalesManagerLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        toast({
          title: "Login failed",
          description: authError.message,
          variant: "destructive",
        })
        return
      }

      if (!authData.user) {
        toast({
          title: "Login failed",
          description: "Invalid credentials",
          variant: "destructive",
        })
        return
      }

      // Check if user is a sales manager
      // Using .maybeSingle() to avoid errors when user doesn't have that role
      const { data: salesManagerData, error: roleError } = await supabase
        .from("sales_managers")
        .select("uid")
        .eq("uid", authData.user.id)
        .maybeSingle()

      if (roleError || !salesManagerData) {
        toast({
          title: "Access denied",
          description: "This account is not authorized as a sales manager",
          variant: "destructive",
        })
        // Sign out the user since they're not a sales manager
        await supabase.auth.signOut()
        return
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in as Sales Manager",
      })

      router.push("/sales-manager/dashboard")
      router.refresh()
    } catch (error) {
      console.error("[Group9] Sales Manager Login error:", error)
      toast({
        title: "Login failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PixelHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white border-4 border-black p-8 pixel-shadow">
            <h1 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e] mb-2 text-center">
              SALES MANAGER LOGIN
            </h1>
            <p className="text-center text-[#6c757d] font-semibold mb-8">Access your sales dashboard</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="font-bold text-[#1a1a3e]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-4 border-black mt-2"
                  placeholder="sales@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="font-bold text-[#1a1a3e]">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="border-4 border-black mt-2"
                  placeholder="????????"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4ecdc4] hover:bg-[#3db8b0] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow"
              >
                {loading ? "LOGGING IN..." : "LOGIN"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#6c757d] font-semibold">
                <Link href="/" className="text-[#5b3a8f] font-bold hover:text-[#3d2660]">
                  Back to Store
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
