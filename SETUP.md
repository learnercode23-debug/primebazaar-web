# Amazonia E-Commerce — Setup Guide

## Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account (test mode)

## Quick Start

### 1. Configure environment
Copy `.env.local.example` to `.env.local` and fill in:

```env
MONGODB_URI=mongodb://localhost:27017/amazonia   # or your Atlas URI
JWT_SECRET=your-random-secret-string
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the dev server
```bash
npm run dev
```

### 4. Seed the database
Visit `http://localhost:3000` then POST to the seed endpoint:
```bash
curl -X POST http://localhost:3000/api/seed
```
Or open `http://localhost:3000/api/seed` in a REST client (POST request).

This creates:
- **Admin**: admin@amazonia.com / admin123
- **Sellers**: tech@seller.com / seller123, fashion@seller.com / seller123
- **Customers**: alice@customer.com / customer123, bob@customer.com / customer123
- **12 products** across all categories with images, reviews, deals
- **Coupons**: SAVE10 (10% off), FLAT20 ($20 off $100+), NEWUSER (15% off)

### 5. Use the login quick-links
The login page (`/login`) has one-click demo login buttons for each role.

---

## Project Structure

```
app/
├── page.tsx                    # Homepage
├── login/ register/            # Auth pages
├── products/[id]/              # Product listing + detail
├── cart/ checkout/             # Shopping flow
├── orders/[id]/                # Order history + tracking
├── wishlist/ profile/          # User account
├── seller/                     # Seller dashboard
│   ├── page.tsx                # Analytics overview
│   ├── products/               # Product management
│   └── orders/                 # Seller orders
├── admin/                      # Admin panel
│   ├── page.tsx                # Platform analytics
│   ├── products/               # Approve/remove products
│   ├── users/                  # Manage users/sellers
│   └── orders/                 # Update order status
└── api/                        # All backend API routes

components/
├── layout/     Navbar, Footer
├── home/       HeroBanner, DealOfTheDay, FeaturedProducts, CategorySection
├── product/    ProductCard, FilterSidebar, ReviewCard
└── ui/         StarRating, CountdownTimer, LoadingSpinner, Breadcrumb

models/         User, Product, Order, Cart, Review, Coupon
contexts/       AuthContext, CartContext, WishlistContext
lib/            mongodb.ts, auth.ts (JWT), stripe.ts, utils.ts
types/          Shared TypeScript interfaces
```

## Features

| Feature | Details |
|---------|---------|
| Auth | JWT via httpOnly cookie, roles: customer/seller/admin |
| Products | Browse, filter, sort, search, paginate |
| Deals | Deal of the Day with countdown timer, % discounts |
| Cart | Persistent per-user, quantity controls |
| Wishlist | Save items, toggle from any product card |
| Checkout | 3-step: address → payment → review, coupon codes |
| Orders | Full history, per-order tracking with progress bar |
| Reviews | Star ratings, verified purchase badge, helpful votes |
| Seller | Dashboard with revenue chart, product & order management |
| Admin | Platform analytics, approve products, manage users/orders |
| Stripe | Test-mode payment intent (use card 4242 4242 4242 4242) |
