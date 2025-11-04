"use client"

import { Button } from "@/components/ui/button"

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
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => onSelectCategory(null)}
        className={`border-4 border-black font-bold transition-all ${
          selectedCategory === null
            ? "bg-[#ffb347] text-black hover:bg-[#ffd93d]"
            : "bg-white text-black hover:bg-[#e9ecef]"
        }`}
      >
        ALL
      </Button>
      {categories.map((category) => {
        const slug = category.name.toLowerCase().replace(/ /g, '-');
        return (
          <Button
            key={category.cid}
            onClick={() => onSelectCategory(slug)}
            className={`border-4 border-black font-bold transition-all ${
              selectedCategory === slug
                ? "bg-[#ffb347] text-black hover:bg-[#ffd9d]"
                : "bg-white text-black hover:bg-[#e9ecef]"
            }`}
          >
            {category.name.toUpperCase()}
          </Button>
        )
      })}
    </div>
  )
}