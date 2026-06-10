'use client'

import { useState } from 'react'
import { FiX, FiInfo } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface SizeGuideProps {
  category?: string
}

type Unit = 'cm' | 'inch'

const CLOTHING_SIZES = [
  { size: 'XS', chest_cm: '76–81', waist_cm: '61–66', hip_cm: '84–89', chest_in: '30–32', waist_in: '24–26', hip_in: '33–35' },
  { size: 'S',  chest_cm: '81–86', waist_cm: '66–71', hip_cm: '89–94', chest_in: '32–34', waist_in: '26–28', hip_in: '35–37' },
  { size: 'M',  chest_cm: '86–91', waist_cm: '71–76', hip_cm: '94–99', chest_in: '34–36', waist_in: '28–30', hip_in: '37–39' },
  { size: 'L',  chest_cm: '91–97', waist_cm: '76–81', hip_cm: '99–104', chest_in: '36–38', waist_in: '30–32', hip_in: '39–41' },
  { size: 'XL', chest_cm: '97–107', waist_cm: '81–91', hip_cm: '104–114', chest_in: '38–42', waist_in: '32–36', hip_in: '41–45' },
  { size: '2XL', chest_cm: '107–117', waist_cm: '91–101', hip_cm: '114–124', chest_in: '42–46', waist_in: '36–40', hip_in: '45–49' },
  { size: '3XL', chest_cm: '117–127', waist_cm: '101–111', hip_cm: '124–134', chest_in: '46–50', waist_in: '40–44', hip_in: '49–53' },
]

const FOOTWEAR_SIZES = [
  { eu: '36', uk: '3', us_m: '4', us_w: '6', cm: '22.5' },
  { eu: '37', uk: '4', us_m: '5', us_w: '7', cm: '23.5' },
  { eu: '38', uk: '5', us_m: '6', us_w: '8', cm: '24.0' },
  { eu: '39', uk: '6', us_m: '7', us_w: '9', cm: '24.5' },
  { eu: '40', uk: '6.5', us_m: '7.5', us_w: '9.5', cm: '25.0' },
  { eu: '41', uk: '7', us_m: '8', us_w: '10', cm: '25.5' },
  { eu: '42', uk: '8', us_m: '9', us_w: '11', cm: '26.5' },
  { eu: '43', uk: '9', us_m: '10', us_w: '12', cm: '27.0' },
  { eu: '44', uk: '9.5', us_m: '10.5', us_w: '12.5', cm: '27.5' },
  { eu: '45', uk: '10.5', us_m: '11.5', us_w: '13.5', cm: '28.5' },
]

const isFootwear = (cat?: string) =>
  !!cat && /shoe|footwear|sneaker|boot|sandal|slipper/i.test(cat)

const isSizeRelevant = (cat?: string) =>
  !!cat && /fashion|cloth|apparel|wear|garment|shirt|tshirt|t-shirt|dress|pant|jean|jacket|top|bottom|kurta|saree|suit|knitwear|sportswear|lingerie|underwear|sock|shoe|footwear|sneaker|boot|sandal|slipper/i.test(cat)

export default function SizeGuide({ category }: SizeGuideProps) {
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState<Unit>('cm')
  const footwear = isFootwear(category)

  // Only show for clothing/footwear categories
  if (!isSizeRelevant(category)) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-semibold underline underline-offset-2 transition-colors"
      >
        <FiInfo className="text-xs" /> Size Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col animate-slide-in-up z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900">Size Guide</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {footwear ? 'International shoe sizes' : 'Measurements in body size'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!footwear && (
                  <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => setUnit('cm')}
                      className={cn('px-3 py-1.5 transition-colors', unit === 'cm' ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
                    >cm</button>
                    <button
                      onClick={() => setUnit('inch')}
                      className={cn('px-3 py-1.5 transition-colors', unit === 'inch' ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
                    >inch</button>
                  </div>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {footwear ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-violet-50">
                      {['EU', 'UK', 'US (Men)', 'US (Women)', 'Length (cm)'].map(h => (
                        <th key={h} className="py-2.5 px-3 text-left text-xs font-bold text-violet-800 first:rounded-l-lg last:rounded-r-lg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FOOTWEAR_SIZES.map((row, i) => (
                      <tr key={row.eu} className={cn('border-b border-gray-50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{row.eu}</td>
                        <td className="py-2.5 px-3 text-gray-700">{row.uk}</td>
                        <td className="py-2.5 px-3 text-gray-700">{row.us_m}</td>
                        <td className="py-2.5 px-3 text-gray-700">{row.us_w}</td>
                        <td className="py-2.5 px-3 text-gray-700">{row.cm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-violet-50">
                      {['Size', 'Chest', 'Waist', 'Hip'].map(h => (
                        <th key={h} className="py-2.5 px-3 text-left text-xs font-bold text-violet-800 first:rounded-l-lg last:rounded-r-lg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CLOTHING_SIZES.map((row, i) => (
                      <tr key={row.size} className={cn('border-b border-gray-50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                        <td className="py-2.5 px-3 font-black text-violet-700">{row.size}</td>
                        <td className="py-2.5 px-3 text-gray-700">{unit === 'cm' ? row.chest_cm : row.chest_in}</td>
                        <td className="py-2.5 px-3 text-gray-700">{unit === 'cm' ? row.waist_cm : row.waist_in}</td>
                        <td className="py-2.5 px-3 text-gray-700">{unit === 'cm' ? row.hip_cm : row.hip_in}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* How to measure */}
              <div className="mt-5 bg-violet-50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-violet-900 mb-2">How to measure</h3>
                {footwear ? (
                  <p className="text-xs text-violet-700 leading-relaxed">
                    Measure your foot length from the heel to the tip of your longest toe. Add 0.5–1 cm for comfort. If between sizes, choose the larger size.
                  </p>
                ) : (
                  <ul className="text-xs text-violet-700 space-y-1">
                    <li><strong>Chest:</strong> Measure around the fullest part of your chest, keeping the tape horizontal.</li>
                    <li><strong>Waist:</strong> Measure around your natural waistline, the narrowest part of your torso.</li>
                    <li><strong>Hip:</strong> Measure around the fullest part of your hips, about 20 cm below the waist.</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
