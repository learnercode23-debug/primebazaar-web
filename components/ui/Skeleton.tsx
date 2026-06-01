import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-lg" />)}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="border-b border-gray-100 py-4 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 items-center">
            <Skeleton className="w-12 h-12 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
