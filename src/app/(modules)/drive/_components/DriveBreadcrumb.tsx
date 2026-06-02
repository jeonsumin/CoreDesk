'use client'

import Link from 'next/link'
import { ChevronRight, HardDrive } from 'lucide-react'
import type { BreadcrumbItem } from '@/types'

type Props = {
  breadcrumb: BreadcrumbItem[]
}

export function DriveBreadcrumb({ breadcrumb }: Props) {
  if (breadcrumb.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        href="/drive"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <HardDrive size={14} />
        <span>드라이브</span>
      </Link>

      {breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1
        return (
          <span key={item.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="shrink-0" />
            {isLast ? (
              <span className="text-foreground font-medium">{item.name}</span>
            ) : (
              <Link
                href={`/drive?folderId=${item.id}`}
                className="hover:text-foreground transition-colors"
              >
                {item.name}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
