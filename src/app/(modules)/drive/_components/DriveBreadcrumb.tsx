'use client'

import Link from 'next/link'
import { ChevronRight, HardDrive } from 'lucide-react'
import type { BreadcrumbItem } from '@/types'

type Props = {
  breadcrumb: BreadcrumbItem[]
}

// 패널 툴바의 경로 표시. 루트에서도 "드라이브"를 현재 위치로 보여준다
export function DriveBreadcrumb({ breadcrumb }: Props) {
  const atRoot = breadcrumb.length === 0

  return (
    <nav aria-label="폴더 경로" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
      {atRoot ? (
        <span className="flex shrink-0 items-center gap-1.5 font-semibold text-foreground">
          <HardDrive className="size-4 text-primary" />
          드라이브
        </span>
      ) : (
        <Link
          href="/drive"
          className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <HardDrive className="size-4" />
          드라이브
        </Link>
      )}

      {breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1
        return (
          <span key={item.id} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0" />
            {isLast ? (
              <span className="truncate font-semibold text-foreground" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link
                href={`/drive?folderId=${item.id}`}
                className="truncate transition-colors hover:text-foreground"
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
