'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  endTime: string | Date
  onExpire?: () => void
}

export default function CountdownTimer({ endTime, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function calculate() {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        onExpire?.()
        return
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [endTime, onExpire])

  if (expired) return <span className="text-red-500 text-sm font-bold">Deal Expired</span>

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-600 mr-1">Ends in:</span>
      {[
        { value: timeLeft.hours, label: 'h' },
        { value: timeLeft.minutes, label: 'm' },
        { value: timeLeft.seconds, label: 's' },
      ].map(({ value, label }, i) => (
        <span key={i} className="flex items-center">
          <span className="bg-gray-900 text-white text-xs font-mono font-bold px-1.5 py-0.5 rounded">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-500 mx-0.5">{label}</span>
        </span>
      ))}
    </div>
  )
}
