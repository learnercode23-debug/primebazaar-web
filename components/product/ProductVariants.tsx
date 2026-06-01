'use client'

import { cn } from '@/lib/utils'

interface Variant {
  _id?: string
  attributes: Record<string, string>
  price: number
  discountPrice?: number
  stock: number
  images: string[]
}

interface ProductVariantsProps {
  variants: Variant[]
  selected: Variant | null
  onSelect: (variant: Variant) => void
}

export default function ProductVariants({ variants, selected, onSelect }: ProductVariantsProps) {
  if (!variants || variants.length === 0) return null

  // Group attributes by key
  const attributeKeys = Array.from(new Set(variants.flatMap((v) => Object.keys(v.attributes))))

  const isSelected = (key: string, value: string) =>
    selected?.attributes[key] === value

  const getVariantForAttribute = (key: string, value: string): Variant | null => {
    const currentAttrs = { ...(selected?.attributes || {}) }
    currentAttrs[key] = value
    return variants.find((v) =>
      Object.entries(currentAttrs).every(([k, val]) => v.attributes[k] === val)
    ) || variants.find((v) => v.attributes[key] === value) || null
  }

  function selectAttribute(key: string, value: string) {
    const variant = getVariantForAttribute(key, value)
    if (variant) onSelect(variant)
  }

  // Get all unique values per attribute key
  const attrValues: Record<string, string[]> = {}
  for (const key of attributeKeys) {
    attrValues[key] = Array.from(new Set(variants.map((v) => v.attributes[key]).filter(Boolean)))
  }

  const COLOR_MAP: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', black: '#111827',
    white: '#f9fafb', yellow: '#eab308', pink: '#ec4899', purple: '#a855f7',
    orange: '#f97316', gray: '#6b7280', brown: '#92400e', navy: '#1e3a5f',
  }

  return (
    <div className="space-y-4">
      {attributeKeys.map((key) => (
        <div key={key}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900 capitalize">{key}:</span>
            {selected && <span className="text-sm text-gray-600">{selected.attributes[key]}</span>}
          </div>

          {key.toLowerCase() === 'color' ? (
            <div className="flex flex-wrap gap-2">
              {attrValues[key].map((value) => {
                const variant = getVariantForAttribute(key, value)
                const outOfStock = variant?.stock === 0
                const colorHex = COLOR_MAP[value.toLowerCase()]
                return (
                  <button
                    key={value}
                    onClick={() => !outOfStock && selectAttribute(key, value)}
                    title={value}
                    disabled={outOfStock}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      isSelected(key, value) ? 'border-amazon-orange ring-2 ring-amazon-orange ring-offset-1' : 'border-gray-300 hover:border-gray-500',
                      outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    )}
                    style={{ backgroundColor: colorHex || value.toLowerCase() }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attrValues[key].map((value) => {
                const variant = getVariantForAttribute(key, value)
                const outOfStock = variant?.stock === 0
                return (
                  <button
                    key={value}
                    onClick={() => !outOfStock && selectAttribute(key, value)}
                    disabled={outOfStock}
                    className={cn(
                      'px-3 py-1.5 border-2 rounded-lg text-sm font-medium transition-all',
                      isSelected(key, value)
                        ? 'border-amazon-orange bg-orange-50 text-amazon-orange'
                        : outOfStock
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                        : 'border-gray-300 text-gray-700 hover:border-amazon-orange cursor-pointer'
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
