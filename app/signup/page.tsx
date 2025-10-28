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

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            name: formData.name,
          },
        },
      })

      if (error) {
        toast({
          title: "Signup failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      // Create user profile (email is in auth.users, we just store name)
      if (data.user) {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.user.id,
            name: formData.name,
          }),
        })
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account",
      })

      router.push("/login")
    } catch (error) {
      console.error("[Group9] Signup error:", error)
      toast({
        title: "Signup failed",
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
            <h1 className="font-[family-name:var(--font-pixel)] text-3xl text-[#1a1a3e] mb-2 text-center">SIGN UP</h1>
            <p className="text-center text-[#6c757d] font-semibold mb-8">Join PixelVault today</p>

            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <Label htmlFor="name" className="font-bold text-[#1a1a3e]">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-4 border-black mt-2"
                  placeholder="John Doe"
                />
              </div>

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
                  placeholder="your@email.com"
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
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="font-bold text-[#1a1a3e]">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="border-4 border-black mt-2"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ffb347] hover:bg-[#ffd93d] text-black border-4 border-black font-bold text-lg py-6 pixel-shadow"
              >
                {loading ? "CREATING ACCOUNT..." : "SIGN UP"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#6c757d] font-semibold">
                Already have an account?{" "}
                <Link href="/login" className="text-[#5b3a8f] font-bold hover:text-[#3d2660]">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
