'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  defaultValue?: string[]
  placeholder?: string
  className?: string
}

export function TagInput({
  name,
  defaultValue = [],
  placeholder = 'Enter 또는 콤마로 태그 추가',
  className,
}: Props) {
  const [tags, setTags] = useState<string[]>(defaultValue)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '').trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setInput('')
      return
    }
    setTags((prev) => [...prev, trimmed])
    setInput('')
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(input)
    } else if (event.key === 'Backspace' && input === '' && tags.length > 0) {
      event.preventDefault()
      removeTag(tags.length - 1)
    }
  }

  const handleBlur = () => {
    if (input.trim()) addTag(input)
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              removeTag(index)
            }}
            className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
            aria-label={`태그 ${tag} 제거`}
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[100px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
    </div>
  )
}
