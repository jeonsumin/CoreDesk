'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type PwCellProps = {
  value: string | null | undefined
  className?: string
}

export function PwCell({ value, className }: PwCellProps) {
  const [visible, setVisible] = useState(false)

  if (!value) {
    return <span className="text-muted-foreground/50">—</span>
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-sm">
        {visible ? value : '••••••'}
      </span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  )
}

type TagChipsProps = {
  tags: string[]
  className?: string
}

export function TagChips({ tags, className }: TagChipsProps) {
  if (!tags || tags.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex items-center rounded-full border border-primary/40 px-2 text-xs text-primary"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

type PasswordInputProps = {
  id: string
  name: string
  defaultValue?: string
  placeholder?: string
}

export function PasswordInput({
  id,
  name,
  defaultValue,
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 pr-9 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}
