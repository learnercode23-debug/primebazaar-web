'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingCart, FiHeart, FiShare2, FiUsers, FiEye, FiZap } from 'react-icons/fi'
import { useCart } from '@/contexts/CartContext'
import toast from 'react-hot-toast'

const FEATURED_PRODUCTS = [
  { id: '1', title: 'Sony WH-1000XM5 Noise Cancelling Headphones', price: 32999, originalPrice: 41999, image: 'https://m.media-amazon.com/images/I/71o8Q5XJS5L._SX522_.jpg', stock: 7 },
  { id: '2', title: 'Apple iPad 10th Gen 64GB WiFi', price: 69999, originalPrice: 84999, image: 'https://m.media-amazon.com/images/I/81gC7frRJyL._SX522_.jpg', stock: 3 },
  { id: '3', title: 'Samsung Galaxy Watch 6 Classic', price: 42999, originalPrice: 52999, image: 'https://m.media-amazon.com/images/I/71G6cRz-lzL._SX522_.jpg', stock: 12 },
]

const UPCOMING = [
  { time: '4:00 PM', host: 'TechZone Nepal', topic: 'Laptop Mega Sale — Up to 40% off', viewers: '1.2K', tag: 'Electronics' },
  { time: '7:00 PM', host: 'Fashion Forward', topic: 'Summer Collection 2026 Launch', viewers: '850', tag: 'Fashion' },
  { time: '9:00 PM', host: 'HomeBliss', topic: 'Kitchen Essentials Flash Deals', viewers: '640', tag: 'Home' },
]

const SEED_CHAT = [
  { name: 'Suman K.', msg: 'This headphone is 🔥🔥🔥', color: 'text-violet-600' },
  { name: 'Priya M.', msg: 'Already ordered! Super fast delivery last time 👍', color: 'text-pink-500' },
  { name: 'Rohan B.', msg: 'Is this compatible with PS5?', color: 'text-blue-500' },
  { name: 'Anita S.', msg: 'Wow that price is unreal! 😍', color: 'text-emerald-600' },
  { name: 'Bikash T.', msg: 'Adding to cart NOW', color: 'text-amber-600' },
  { name: 'Dibya P.', msg: 'Can I get EMI on this?', color: 'text-red-500' },
  { name: 'Smita R.', msg: 'Just bought it! 🎉', color: 'text-indigo-600' },
  { name: 'Nabin G.', msg: 'Only 7 left hurry up guys!', color: 'text-orange-500' },
]

const COLORS = ['text-violet-600','text-pink-500','text-blue-500','text-emerald-600','text-amber-600','text-red-500','text-indigo-600','text-orange-500','text-teal-600']
const NAMES = ['Saurav','Kritika','Amar','Sneha','Pradeep','Mina','Bikram','Sunita','Arjun','Puja','Deepak','Rima']
const MSGS = [
  'Just added to cart! 🛒', 'Great deal!', 'Is this available in black?',
  '❤️❤️❤️', 'Bought one for my son', 'Best price in Nepal!',
  'Will this work in Pokhara?', 'On my way to buy!', '🔥🔥🔥',
  'Discount code please?', 'Sharing with friends!', 'YESS finally!!!',
]

export default function LivePage() {
  const { addItem } = useCart()
  const [featured, setFeatured] = useState(0)
  const [viewers, setViewers] = useState(1847)
  const [likes, setLikes] = useState(342)
  const [liked, setLiked] = useState(false)
  const [chat, setChat] = useState(SEED_CHAT)
  const [dealTime, setDealTime] = useState(847)
  const [boughtCount, setBoughtCount] = useState(23)
  const chatRef = useRef<HTMLDivElement>(null)

  const product = FEATURED_PRODUCTS[featured]
  const discount = Math.round((1 - product.price / product.originalPrice) * 100)

  // Simulate live chat
  useEffect(() => {
    const interval = setInterval(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)]
      const msg = MSGS[Math.floor(Math.random() * MSGS.length)]
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      setChat(prev => [...prev.slice(-30), { name, msg, color }])
      setViewers(v => v + Math.floor(Math.random() * 5 - 1))
      if (Math.random() > 0.7) setBoughtCount(c => c + 1)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  // Scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat])

  // Deal countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setDealTime(t => {
        if (t <= 0) { setFeatured(f => (f + 1) % FEATURED_PRODUCTS.length); return 600 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function handleAddToCart() {
    addItem({
      _id: product.id,
      title: product.title,
      price: product.price,
      images: [product.image],
      stock: product.stock,
    } as any)
    toast.success('Added to cart from Live!')
  }

  const mm = String(Math.floor(dealTime / 60)).padStart(2, '0')
  const ss = String(dealTime % 60).padStart(2, '0')

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            PrimePasal Live
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Shop in real-time with exclusive live-only deals</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FiEye className="text-red-500" />
          <span className="font-bold text-gray-900">{viewers.toLocaleString()}</span>
          watching
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Stream + product */}
        <div className="lg:col-span-2 space-y-4">

          {/* Stream window */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
            {/* Simulated stream background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-violet-950 to-indigo-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-white/20">
                    <Image src={product.image} alt={product.title} width={128} height={128} className="object-contain bg-white p-2" />
                  </div>
                  <p className="text-white/50 text-sm">Live stream preview</p>
                  <p className="text-white font-bold mt-1">{product.title}</p>
                </div>
              </div>
            </div>

            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-2.5 py-1.5 rounded-full shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
              <span className="bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                <FiUsers className="text-[10px]" />
                {viewers.toLocaleString()}
              </span>
            </div>

            {/* Host info */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white text-sm font-black">T</div>
              <div>
                <p className="text-white text-xs font-bold">TechZone Nepal</p>
                <p className="text-white/60 text-[10px]">Official store</p>
              </div>
            </div>

            {/* Like / share */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button onClick={() => { setLiked(l => !l); setLikes(n => liked ? n - 1 : n + 1) }}
                className={`flex flex-col items-center gap-0.5 ${liked ? 'text-red-400' : 'text-white/70'} transition-colors`}>
                <span className="text-xl">{liked ? '❤️' : '🤍'}</span>
                <span className="text-[10px] font-bold">{likes}</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 text-white/70">
                <FiShare2 className="text-lg" />
                <span className="text-[10px]">Share</span>
              </button>
            </div>

            {/* Floating hearts animation */}
            <div className="absolute bottom-0 right-8 flex flex-col items-center pointer-events-none select-none">
              {[1,2,3].map(i => (
                <span key={i} className="text-lg opacity-0 animate-bounce" style={{ animationDelay: `${i * 0.4}s`, animationDuration: '2s' }}>❤️</span>
              ))}
            </div>
          </div>

          {/* Current deal */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100">
                <Image src={product.image} alt={product.title} width={80} height={80} className="object-contain w-full h-full p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Live Deal</span>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">-{discount}% OFF</span>
                  <span className="bg-orange-50 text-orange-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">Only {product.stock} left!</span>
                </div>
                <p className="font-bold text-gray-900 text-sm line-clamp-2">{product.title}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-gray-900">Rs.{product.price.toLocaleString()}</span>
                  <span className="text-sm text-gray-400 line-through">Rs.{product.originalPrice.toLocaleString()}</span>
                </div>
                <p className="text-xs text-green-600 font-semibold mt-0.5">You save Rs.{(product.originalPrice - product.price).toLocaleString()}</p>
              </div>
            </div>

            {/* Deal timer + buy */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 bg-gray-900 text-white rounded-xl px-4 py-2.5">
                <FiZap className="text-amber-400 text-sm" />
                <span className="text-xs text-gray-400 mr-1">Ends in</span>
                <span className="font-black text-lg tabular-nums">{mm}:{ss}</span>
              </div>
              <button onClick={handleAddToCart}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                <FiShoppingCart /> Add to Cart
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
              <span className="text-green-600 font-bold">🔥 {boughtCount} people bought this in the last hour</span>
            </div>
          </div>

          {/* Product switcher */}
          <div className="grid grid-cols-3 gap-3">
            {FEATURED_PRODUCTS.map((p, i) => (
              <button key={p.id} onClick={() => { setFeatured(i); setDealTime(600) }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${featured === i ? 'border-violet-600 bg-violet-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                  <Image src={p.image} alt={p.title} width={80} height={80} className="object-contain w-full h-full p-1" />
                </div>
                <p className="text-[11px] font-semibold text-gray-700 line-clamp-2">{p.title}</p>
                <p className="text-xs font-black text-gray-900 mt-0.5">Rs.{p.price.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden" style={{ height: 520 }}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="font-black text-sm text-gray-900">Live Chat</p>
              <span className="text-xs text-gray-400">{viewers.toLocaleString()} watching</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className={`font-bold ${m.color}`}>{m.name}: </span>
                  <span className="text-gray-700">{m.msg}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <input
                  placeholder="Say something…"
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) {
                        setChat(c => [...c, { name: 'You', msg: val, color: 'text-violet-700' }])
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <button className="text-lg px-2">❤️</button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">Sign in to participate in chat</p>
            </div>
          </div>

          {/* Upcoming streams */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="font-black text-sm text-gray-900 mb-3">Upcoming Streams</h2>
            <div className="space-y-3">
              {UPCOMING.map((u, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-violet-700">{u.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{u.host}</p>
                    <p className="text-[11px] text-gray-600 line-clamp-1">{u.topic}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{u.tag}</span>
                      <span className="text-[10px] text-gray-400">{u.viewers} interested</span>
                    </div>
                  </div>
                  <button className="text-[11px] text-violet-600 font-bold hover:underline whitespace-nowrap">Remind me</button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
