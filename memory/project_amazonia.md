---
name: project-amazonia
description: Full-stack Amazon-like e-commerce built in c:\Users\sah12\Documents\product
metadata:
  type: project
---

Full-featured e-commerce platform called "Amazonia" built at `c:\Users\sah12\Documents\product`.

**Why:** User requested a complete Amazon-like shopping site with customer, seller, and admin roles.

**How to apply:** When the user asks about this project, refer to this structure. If they ask to add features, check existing patterns before writing new code.

Stack: Next.js 14 (App Router) · Tailwind CSS · MongoDB/Mongoose · JWT auth · Stripe (test mode)

Key files:
- `app/api/seed/route.ts` — POST to seed DB with demo data
- `lib/auth.ts` — JWT sign/verify, `getAuthUser()` helper
- `lib/mongodb.ts` — singleton Mongoose connection
- `contexts/AuthContext.tsx`, `CartContext.tsx`, `WishlistContext.tsx`

Demo credentials (after seeding):
- Admin: admin@amazonia.com / admin123
- Seller: tech@seller.com / seller123
- Customer: alice@customer.com / customer123

Coupons: SAVE10, FLAT20, NEWUSER
