'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'en' | 'ne'

const T: Record<string, Record<Lang, string>> = {
  search:      { en: 'Search for products…', ne: 'उत्पादन खोज्नुहोस्…' },
  cart:        { en: 'Cart', ne: 'कार्ट' },
  orders:      { en: 'Orders', ne: 'अर्डर' },
  account:     { en: 'Account', ne: 'खाता' },
  signIn:      { en: 'Sign In', ne: 'साइन इन' },
  deals:       { en: "Today's Deals", ne: 'आजका डिल' },
  addToCart:   { en: 'Add to Cart', ne: 'कार्टमा थप्नुस्' },
  buyNow:      { en: 'Buy Now', ne: 'अहिले किन्नुस्' },
  inStock:     { en: 'In Stock', ne: 'स्टकमा छ' },
  outOfStock:  { en: 'Out of Stock', ne: 'स्टकमा छैन' },
  freeDelivery:{ en: 'FREE delivery', ne: 'निःशुल्क डेलिभरी' },
}

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextType>({ lang: 'en', setLang: () => {}, t: (k) => k })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = (localStorage.getItem('pp-lang') as Lang | null) || 'en'
    setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('pp-lang', l)
  }

  function t(key: string) {
    return T[key]?.[lang] ?? key
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
