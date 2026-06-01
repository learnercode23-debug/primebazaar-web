import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullPage?: boolean
}

export default function LoadingSpinner({ size = 'md', className, fullPage }: LoadingSpinnerProps) {
  const sizeClass = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-4' }[size]

  const spinner = (
    <div
      className={cn(
        'rounded-full border-gray-300 border-t-amazon-orange animate-spin',
        sizeClass,
        className
      )}
    />
  )

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
