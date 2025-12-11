"use client"

import React from "react"
import { SWRConfig } from "swr"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        focusThrottleInterval: 300000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
