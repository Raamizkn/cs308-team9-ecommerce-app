"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const ChatWidget = dynamic(
  () => import("@/components/chat-widget").then((mod) => mod.ChatWidget),
  {
    ssr: false,
  }
)

export function ChatLoader() {
  const [loaded, setLoaded] = useState(false)
  const [isSupportAgent, setIsSupportAgent] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkIfSupportAgent()
  }, [])

  const checkIfSupportAgent = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (user?.id) {
        const { data } = await supabase
          .from("support_agents")
          .select("uid")
          .eq("uid", user.id)
          .maybeSingle()
        setIsSupportAgent(!!data)
      }
    } catch (error) {
      console.error("[Group9] Error checking support agent:", error)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!isSupportAgent && !checking) {
      const t = setTimeout(() => {
        // Attempt to prefetch the chat bundle in the background after idle.
        ;(ChatWidget as any).preload?.()
      }, 5000)

      return () => clearTimeout(t)
    }
  }, [isSupportAgent, checking])

  // Don't show chat widget for support agents only
  if (!checking && isSupportAgent) {
    return null
  }

  // Show loading state while checking, then show widget
  if (loaded) return <ChatWidget initialOpen />

  return (
    <button
      onClick={() => setLoaded(true)}
      className="fixed bottom-6 right-6 w-16 h-16 bg-[#5b3a8f] hover:bg-[#3d2660] border-4 border-black text-white flex items-center justify-center pixel-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all z-50"
      aria-label="Open chat"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
