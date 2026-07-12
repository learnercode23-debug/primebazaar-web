import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Escape user input before using it as a MongoDB $regex pattern.
// Prevents ReDoS (catastrophic backtracking) and unintended regex behavior.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// True only for a well-formed 24-hex Mongo ObjectId. Guard route params with this
// so a malformed id returns a clean 404 instead of a 500 (Mongoose CastError).
export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)
}

// Escape a value before interpolating it into raw HTML (prevents XSS).
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatPrice(price: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-NP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function calculateDiscount(price: number, discountPrice: number): number {
  return Math.round(((price - discountPrice) / price) * 100)
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function generateTrackingNumber(): string {
  const year  = new Date().getFullYear().toString().slice(-2)
  const ts    = Date.now().toString(36).toUpperCase().slice(-5)
  const rand  = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PPS${year}${ts}${rand}`  // e.g. PPS26MPYG1ZZC
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
