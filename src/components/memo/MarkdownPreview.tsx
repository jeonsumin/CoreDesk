import Link from 'next/link'
import { contentToMarkdown } from '@/lib/memo/blocks'
import {
  parseInlineMarkdown,
  parseMarkdownBlocks,
  type MarkdownInline,
} from '@/lib/memo/markdown'
import { cn } from '@/lib/utils'

type Props = {
  content: string
  compact?: boolean
  className?: string
}

const taskItemPattern = /^\[( |x|X)\]\s+(.+)$/

function renderInline(inline: MarkdownInline, key: string) {
  switch (inline.type) {
    case 'strong':
      return <strong key={key}>{inline.text}</strong>
    case 'em':
      return <em key={key}>{inline.text}</em>
    case 'code':
      return (
        <code
          key={key}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {inline.text}
        </code>
      )
    case 'link': {
      const isExternal = /^https?:\/\//i.test(inline.href)
      if (isExternal) {
        return (
          <a
            key={key}
            href={inline.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {inline.text}
          </a>
        )
      }

      return (
        <Link
          key={key}
          href={inline.href}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {inline.text}
        </Link>
      )
    }
    default:
      return inline.text
  }
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  return parseInlineMarkdown(text).map((inline, index) =>
    renderInline(inline, `${keyPrefix}-${index}`),
  )
}

function headingClassName(level: number, compact: boolean): string {
  if (compact) return 'text-sm font-semibold text-foreground'
  if (level === 1) return 'pt-2 text-xl font-bold text-foreground'
  if (level === 2) return 'pt-1 text-lg font-semibold text-foreground'
  return 'text-base font-semibold text-foreground'
}

export function MarkdownPreview({ content, compact = false, className }: Props) {
  const blocks = parseMarkdownBlocks(contentToMarkdown(content))

  if (blocks.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        내용이 없습니다.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-3 text-sm leading-6 text-foreground',
        compact && 'space-y-2 text-xs leading-5',
        className,
      )}
    >
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`

        if (block.type === 'heading') {
          const children = renderInlineMarkdown(block.text, key)
          const className = headingClassName(block.level, compact)

          if (block.level === 1) {
            return (
              <h1 key={key} className={className}>
                {children}
              </h1>
            )
          }
          if (block.level === 2) {
            return (
              <h2 key={key} className={className}>
                {children}
              </h2>
            )
          }
          return (
            <h3 key={key} className={className}>
              {children}
            </h3>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          const taskItems = block.items.map((item) => item.match(taskItemPattern))
          const isTaskList = taskItems.every(Boolean)

          if (isTaskList) {
            return (
              <ul key={key} className="space-y-1">
                {taskItems.map((match, itemIndex) => {
                  const checked = match?.[1].toLowerCase() === 'x'
                  const text = match?.[2] ?? ''

                  return (
                    <li
                      key={`${key}-${itemIndex}`}
                      className="flex items-start gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        aria-label="완료 여부"
                        className="mt-1 h-3.5 w-3.5 rounded border-input accent-primary"
                      />
                      <span
                        className={cn(
                          checked && 'text-muted-foreground line-through',
                        )}
                      >
                        {renderInlineMarkdown(text, `${key}-${itemIndex}`)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )
          }

          return (
            <ListTag
              key={key}
              className={cn(
                'space-y-1 pl-5',
                block.ordered ? 'list-decimal' : 'list-disc',
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>
                  {renderInlineMarkdown(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ListTag>
          )
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-primary/40 pl-3 text-muted-foreground"
            >
              {renderInlineMarkdown(block.text, key)}
            </blockquote>
          )
        }

        if (block.type === 'code') {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-foreground"
            >
              <code>{block.code}</code>
            </pre>
          )
        }

        return (
          <p key={key}>{renderInlineMarkdown(block.text, key)}</p>
        )
      })}
    </div>
  )
}
