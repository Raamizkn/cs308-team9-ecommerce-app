"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d]" />
      <Input
        type="text"
        placeholder="Search for pixel art..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 h-14 border-4 border-black bg-white text-lg font-semibold placeholder:text-[#6c757d] focus-visible:ring-4 focus-visible:ring-[#ffb347]"
      />
    </div>
  )
}
