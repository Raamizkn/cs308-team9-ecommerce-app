"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Category {
  cid: number
  name: string
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (slug: string | null) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const getDisplayValue = () => {
    if (!selectedCategory) return "ALL CATEGORIES"
    const category = categories.find(
      (cat) => cat.name.toLowerCase().replace(/ /g, '-') === selectedCategory
    )
    return category ? category.name.toUpperCase() : "ALL CATEGORIES"
  }

  const handleValueChange = (value: string) => {
    if (value === "all") {
      onSelectCategory(null)
    } else {
      onSelectCategory(value)
    }
  }

  return (
    <Select
      value={selectedCategory || "all"}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full sm:w-[300px] bg-white border-4 border-black font-bold text-black hover:bg-[#e9ecef] transition-colors">
        <SelectValue placeholder="Select category">
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border-4 border-black">
        <SelectItem value="all" className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]">
          ALL CATEGORIES
        </SelectItem>
        {categories.map((category) => {
          const slug = category.name.toLowerCase().replace(/ /g, '-')
          return (
            <SelectItem
              key={category.cid}
              value={slug}
              className="font-bold cursor-pointer hover:bg-[#ffb347] focus:bg-[#ffb347]"
            >
              {category.name.toUpperCase()}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}