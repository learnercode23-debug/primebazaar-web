'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiSearch, FiShoppingCart, FiPackage, FiUser } from 'react-icons/fi'
import { useCart } from '@/contexts/CartContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',        icon: FiHome,         label: 'Home'    },
  { href: '/products',icon: FiSearch,       label: 'Browse'  },
  { href: '/cart',    icon: FiShoppingCart, label: 'Cart'    },
  { href: '/orders',  icon: FiPackage,      label: 'Orders'  },
  { href: '/profile', icon: FiUser,         label: 'Account' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { itemCount } = useCart()

  // Hide on auth pages, seller, admin
  if (pathname.startsWith('/login') || pathname.startsWith('/register') ||
      pathname.startsWith('/seller') || pathname.startsWith('/admin') ||
      pathname.startsWith('/payment')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-amazon-dark border-t border-amazon-blue safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isCart = href === '/cart'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors relative',
                isActive ? 'text-amazon-yellow' : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <div className="relative">
                <Icon className="text-xl" />
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amazon-orange text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
