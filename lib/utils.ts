import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function calculateDiscount(price: number, discountPrice: number): number {
  return Math.round(((price - discountPrice) / price) * 100)
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function generateTrackingNumber(): string {
  return 'AMZ' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export const CATEGORIES = [
  { name: 'Electronics', icon: '💻', subcategories: ['Laptops', 'Smartphones', 'Headphones', 'Cameras', 'TVs', 'Gaming'] },
  { name: 'Fashion', icon: '👗', subcategories: ["Men's Clothing", "Women's Clothing", 'Shoes', 'Accessories', 'Jewelry'] },
  { name: 'Home & Garden', icon: '🏠', subcategories: ['Furniture', 'Kitchen', 'Bedding', 'Tools', 'Garden'] },
  { name: 'Books', icon: '📚', subcategories: ['Fiction', 'Non-Fiction', 'Educational', 'Children', 'Comics'] },
  { name: 'Sports', icon: '⚽', subcategories: ['Fitness', 'Outdoor', 'Team Sports', 'Water Sports', 'Cycling'] },
  { name: 'Beauty', icon: '💄', subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', "Men's Grooming"] },
  { name: 'Toys', icon: '🧸', subcategories: ['Action Figures', 'Board Games', 'Educational', 'Dolls', 'Remote Control'] },
  { name: 'Automotive', icon: '🚗', subcategories: ['Car Parts', 'Accessories', 'Tools', 'Car Care', 'Electronics'] },
]

export const ORDER_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '📦' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '🏠' },
]
