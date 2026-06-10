export interface User {
  _id: string
  name: string
  email: string
  role: 'customer' | 'seller' | 'admin'
  avatar?: string
  phone?: string
  address?: Address
  wishlist: string[]
  createdAt: string
}

export interface Address {
  name?: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
}

export interface Product {
  _id: string
  title: string
  description: string
  price: number
  discountPrice?: number
  discountPercent?: number
  category: string | { _id: string; name: string; slug: string }
  subcategory?: string
  brand: string
  images: string[]
  stock: number
  seller: User | string
  rating: number
  reviewCount: number
  isApproved: boolean
  isFeatured: boolean
  isDealOfDay: boolean
  dealEndTime?: string
  tags: string[]
  specifications?: Record<string, string>
  salesCount?: number
  viewCount?: number
  createdAt: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  _id: string
  user: string
  items: CartItem[]
}

export interface OrderItem {
  product: Product | string
  quantity: number
  price: number
  title: string
  image: string
}

export interface Order {
  _id: string
  orderNumber?: string
  user: User | string
  items: OrderItem[]
  shippingAddress: Address
  deliveryOption?: 'standard' | 'express' | 'scheduled'
  paymentMethod: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned'
  subtotal: number
  shippingCost: number
  tax?: number
  discount: number
  storeCreditUsed?: number
  totalAmount: number
  couponCode?: string
  trackingNumber?: string
  trackingCarrier?: string
  stripePaymentIntentId?: string
  invoiceNumber?: string
  giftOptions?: { isGift: boolean; giftMessage?: string; giftWrap: boolean }
  returnRequested?: boolean
  estimatedDelivery?: string
  createdAt: string
  updatedAt: string
}

export interface Review {
  _id: string
  user: User
  product: string
  rating: number
  title: string
  comment: string
  verified: boolean
  helpful: number
  photos?: string[]
  createdAt: string
}

export interface Coupon {
  _id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxDiscount?: number
  validFrom: string
  validTo: string
  usageLimit: number
  usedCount: number
  isActive: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  totalPages: number
}

export interface SellerAnalytics {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  recentOrders: Order[]
  topProducts: Product[]
  monthlyRevenue: { month: string; revenue: number }[]
}

export interface AdminAnalytics {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalSellers: number
  totalProducts: number
  recentOrders: Order[]
  topSellers: { seller: User; revenue: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
}
