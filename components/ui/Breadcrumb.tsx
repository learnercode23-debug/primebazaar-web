import Link from 'next/link'
import { FiChevronRight } from 'react-icons/fi'

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-600 mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <FiChevronRight className="text-gray-400" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-600 hover:underline transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
