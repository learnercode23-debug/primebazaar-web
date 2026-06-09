import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { CompareProvider } from '@/contexts/CompareContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import CompareBar from '@/components/ui/CompareBar'
import LiveChatWidget from '@/components/ui/LiveChatWidget'
import RealtimeSync from '@/components/RealtimeSync'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Primepasal — Shop Everything',
  description: 'Primepasal — Your one-stop shop for electronics, fashion, home goods, and more. Best deals every day.',
  verification: {
    google: 'KC4bI1RQ7DfW4PZ1gYNztEmBdP1GdsglFWGkVnk9lYQ',
  },
  manifest: '/manifest.json',
  icons: {
    icon:      [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut:  '/icon.svg',
    apple:     '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Primepasal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Primepasal',
    'msapplication-TileColor': '#1E1B4B',
    'theme-color': '#1E1B4B',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#1E1B4B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
        }} />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-violet-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm focus:shadow-lg">
          Skip to main content
        </a>
        <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
              <RealtimeSync />
              <Navbar />
              <main id="main-content" className="flex-1 pb-14 lg:pb-0">
                {children}
              </main>
              <div className="hidden lg:block">
                <Footer />
              </div>
              <MobileBottomNav />
              <CompareBar />
              <LiveChatWidget />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: { background: '#131921', color: '#fff' },
                  success: { style: { background: '#067D62' } },
                  error: { style: { background: '#B12704' } },
                }}
              />
            </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{page_path:window.location.pathname});
            `}</Script>
          </>
        )}
      </body>
    </html>
  )
}
