import type { Metadata, Viewport } from 'next'
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
import { LanguageProvider } from '@/contexts/LanguageContext'
import CompareBar from '@/components/ui/CompareBar'
import LiveChatWidget from '@/components/ui/LiveChatWidget'
import RealtimeSync from '@/components/RealtimeSync'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  // Canonical host is www — apex redirects there. Relative canonical './'
  // resolves to each route's own path against metadataBase.
  metadataBase: new URL('https://www.primepasal.com'),
  alternates: { canonical: './' },
  title: 'PrimePasal — Shop Everything',
  description: 'PrimePasal — Your one-stop shop for electronics, fashion, home goods, and more. Best deals every day.',
  verification: {
    google: 'KC4bI1RQ7DfW4PZ1gYNztEmBdP1GdsglFWGkVnk9lYQ',
  },
  manifest: '/manifest.json',
  icons: {
    icon:      [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut:  '/icon.svg',
    apple:     '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PrimePasal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'PrimePasal',
    'msapplication-TileColor': '#1E1B4B',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E1B4B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Manifest, icons, theme-color, and PWA metas all come from the metadata/viewport exports above — do not duplicate here */}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
        }} />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-violet-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm focus:shadow-lg">
          Skip to main content
        </a>
        <LanguageProvider>
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
        </LanguageProvider>
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
