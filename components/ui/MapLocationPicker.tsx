'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi'
import { MdMyLocation } from 'react-icons/md'

interface Location {
  lat: number; lng: number
  address: string; city: string; state: string
  zipCode: string; country: string; displayName: string
}

interface MapLocationPickerProps {
  onConfirm: (location: Location) => void
  onClose: () => void
  defaultLat?: number
  defaultLng?: number
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<Location>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const a = data.address || {}
    return {
      address: [a.road, a.house_number].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      zipCode: a.postcode || '',
      country: a.country_code?.toUpperCase() || 'NP',
      displayName: data.display_name || '',
    }
  } catch { return {} }
}

export default function MapLocationPicker({
  onConfirm, onClose,
  defaultLat = 27.7172, defaultLng = 85.3240,
}: MapLocationPickerProps) {
  const mapRef        = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<unknown>(null)

  const [center, setCenter]               = useState({ lat: defaultLat, lng: defaultLng })
  const [locationInfo, setLocationInfo]   = useState<Partial<Location>>({ displayName: '' })
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [geocoding, setGeocoding]         = useState(false)
  const [locating, setLocating]           = useState(false)
  const [mapLoaded, setMapLoaded]         = useState(false)

  const geocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true)
    const info = await reverseGeocode(lat, lng)
    setLocationInfo(info)
    setGeocoding(false)
  }, [])

  useEffect(() => {
    async function initMap() {
      const L = (await import('leaflet')).default

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        document.head.appendChild(link)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (!mapRef.current || leafletMapRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = L.map(mapRef.current as any, { center: [center.lat, center.lng], zoom: 16, zoomControl: false })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map as any)

      // Google Maps-style blue pin
      const pinIcon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center">
            <svg width="36" height="48" viewBox="0 0 36 48" fill="none">
              <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.059 27.941 0 18 0z" fill="#1A73E8"/>
              <circle cx="18" cy="18" r="9" fill="white"/>
              <circle cx="18" cy="18" r="5" fill="#1A73E8"/>
            </svg>
            <div style="width:3px;height:10px;background:rgba(26,115,232,0.5);border-radius:2px;margin-top:-3px"></div>
          </div>`,
        iconSize: [36, 58],
        iconAnchor: [18, 58],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = L.marker([center.lat, center.lng], { icon: pinIcon }).addTo(map as any)
      leafletMapRef.current = map

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map as any).on('move', () => { (marker as any).setLatLng((map as any).getCenter()) })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map as any).on('moveend', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (map as any).getCenter()
        setCenter({ lat: c.lat, lng: c.lng })
        await geocode(c.lat, c.lng)
      })

      setMapLoaded(true)
      await geocode(center.lat, center.lng)
    }

    initMap()

    return () => {
      if (leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(leafletMapRef.current as any).remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  function useGPSLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setCenter({ lat, lng })
        if (leafletMapRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(leafletMapRef.current as any).setView([lat, lng], 17)
        }
        await geocode(lat, lng)
        setLocating(false)
      },
      () => { alert('Allow location access to use this feature.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 3) { setSearchResults([]); return }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, { headers: { 'Accept-Language': 'en' } })
      setSearchResults(await res.json())
    } catch {}
  }

  function selectResult(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setCenter({ lat, lng })
    if (leafletMapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(leafletMapRef.current as any).setView([lat, lng], 17)
    }
    geocode(lat, lng)
    setSearchResults([])
    setSearchQuery('')
  }

  function confirmLocation() {
    onConfirm({
      lat: center.lat, lng: center.lng,
      address: locationInfo.address || '',
      city: locationInfo.city || '',
      state: locationInfo.state || '',
      zipCode: locationInfo.zipCode || '',
      country: locationInfo.country || 'NP',
      displayName: locationInfo.displayName || '',
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-5 pb-2.5">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <FiArrowLeft className="text-2xl text-gray-800" strokeWidth={2.5} />
          </button>
          <span className="text-lg font-bold text-gray-900">Add new address</span>
        </div>

        {/* Search */}
        <div className="relative px-4 pb-3">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
            <FiSearch className="ml-3 text-gray-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by area, name, street."
              className="flex-1 px-3 py-3 text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
              style={{ fontSize: 16 }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="pr-3">
                <FiX className="text-gray-400" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => selectResult(r)}
                  className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-3">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">📍</span>
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative mt-28">
        <div ref={mapRef} className="absolute inset-0" />

        {/* "Place pin on the exact location" — exactly like screenshot */}
        {mapLoaded && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            style={{ bottom: 'calc(48% + 78px)' }}
          >
            <div className="bg-gray-900 bg-opacity-80 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-lg whitespace-nowrap">
              Place pin on the exact location
            </div>
          </div>
        )}

        {/* "Use my current location" button — on the map, like screenshot */}
        <button
          onClick={useGPSLocation}
          disabled={locating}
          className="absolute left-1/2 -translate-x-1/2 z-10 bg-white rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-md border border-gray-200 hover:shadow-lg transition-all disabled:opacity-70 whitespace-nowrap"
          style={{ bottom: 'calc(48% + 10px)' }}
        >
          <MdMyLocation className={`text-blue-500 text-lg ${locating ? 'animate-pulse' : ''}`} />
          {locating ? 'Detecting…' : 'Use my current location'}
        </button>

        {!mapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading map…</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Sheet — exactly like the screenshot ── */}
      <div className="bg-white rounded-t-3xl z-10 px-6 pt-5 pb-10 shadow-[0_-4px_30px_rgba(0,0,0,0.12)]"
        style={{ minHeight: '48%' }}>

        {/* Drag handle */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

        {/* Detected address preview */}
        {(locationInfo.displayName || geocoding) && (
          <div className="flex items-start gap-3 mb-5 pb-5 border-b border-gray-100">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📍</span>
            </div>
            {geocoding ? (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm text-gray-500">Finding address…</span>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Deliver To</p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{locationInfo.displayName}</p>
              </div>
            )}
          </div>
        )}

        {/* Question — exactly matches screenshot */}
        <h2 className="text-xl font-bold text-gray-900 mb-1.5">
          Where do you want us to deliver the order?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This will help with the right map location
        </p>

        {/* ── Two buttons exactly like screenshot ── */}
        <div className="space-y-3">
          {/* Blue filled button */}
          <button
            onClick={confirmLocation}
            disabled={geocoding}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-sm"
          >
            Away from my location
          </button>

          {/* Outlined button with icon */}
          <button
            onClick={useGPSLocation}
            disabled={locating}
            className="w-full bg-white border-2 border-blue-500 text-blue-600 font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2.5 transition-all hover:bg-blue-50 active:bg-blue-100 disabled:opacity-60"
          >
            <MdMyLocation className={`text-xl text-blue-500 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Detecting location…' : 'Use current location'}
          </button>
        </div>
      </div>
    </div>
  )
}
