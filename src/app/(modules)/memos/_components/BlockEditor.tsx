'use client'

import {
  CheckSquare,
  Code2,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Text,
} from 'lucide-react'
import {
  type KeyboardEvent,
  type RefCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  deserializeMemoBlocks,
  serializeMemoBlocks,
  type Block,
  type BlockType,
} from '@/lib/memo/blocks'
import { cn } from '@/lib/utils'

type Props = {
  content: string
  onChange: (content: string) => void
}

type SlashState = {
  blockId: string
  selectedIndex: number
}

type SlashCommand = {
  type: BlockType
  label: string
  icon: typeof Text
}

const slashCommands: SlashCommand[] = [
  { type: 'text', label: 'Text', icon: Text },
  { type: 'h1', label: 'Heading 1', icon: Heading1 },
  { type: 'h2', label: 'Heading 2', icon: Heading2 },
  { type: 'h3', label: 'Heading 3', icon: Heading3 },
  { type: 'todo', label: 'Todo', icon: CheckSquare },
  { type: 'bullet', label: 'Bulleted List', icon: List },
  { type: 'number', label: 'Numbered List', icon: ListOrdered },
  { type: 'quote', label: 'Quote', icon: Quote },
  { type: 'code', label: 'Code Block', icon: Code2 },
]

const markdownShortcuts: Array<{ marker: string; type: BlockType }> = [
  { marker: '### ', type: 'h3' },
  { marker: '## ', type: 'h2' },
  { marker: '# ', type: 'h1' },
  { marker: '- ', type: 'bullet' },
  { marker: '1. ', type: 'number' },
  { marker: '> ', type: 'quote' },
  { marker: '```', type: 'code' },
]

function createBlock(type: BlockType = 'text', content = ''): Block {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(16).slice(2)}`

  return { id, type, content, checked: type === 'todo' ? false : undefined }
}

function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = '0px'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function getPlaceholder(type: BlockType): string {
  if (type === 'h1') return '제목 1'
  if (type === 'h2') return '제목 2'
  if (type === 'h3') return '제목 3'
  if (type === 'todo') return '할 일'
  if (type === 'bullet') return '목록'
  if (type === 'number') return '목록'
  if (type === 'quote') return '인용'
  if (type === 'code') return '코드 입력'
  return "내용을 입력하거나 '/'로 명령"
}

function blockTextareaClassName(type: BlockType): string {
  if (type === 'h1') return 'text-3xl font-bold leading-tight'
  if (type === 'h2') return 'text-2xl font-semibold leading-tight'
  if (type === 'h3') return 'text-xl font-semibold leading-snug'
  if (type === 'quote') {
    return 'border-l-2 border-primary/40 pl-3 text-muted-foreground'
  }
  if (type === 'code') {
    return 'rounded-lg bg-muted px-3 py-2 font-mono text-sm leading-6'
  }
  return 'text-base leading-7'
}

export function BlockEditor({ content, onChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    deserializeMemoBlocks(content),
  )
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [slashState, setSlashState] = useState<SlashState | null>(null)
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    onChange(serializeMemoBlocks(blocks))
  }, [blocks, onChange])

  useEffect(() => {
    if (!pendingFocusId) return

    const textarea = textareaRefs.current[pendingFocusId]
    if (!textarea) return

    textarea.focus()
    textarea.selectionStart = textarea.value.length
    textarea.selectionEnd = textarea.value.length
    adjustTextareaHeight(textarea)
    setPendingFocusId(null)
  }, [blocks, pendingFocusId])

  const setTextareaRef = (blockId: string): RefCallback<HTMLTextAreaElement> =>
    (node) => {
      textareaRefs.current[blockId] = node
      if (node) adjustTextareaHeight(node)
    }

  const updateBlock = (blockId: string, partial: Partial<Block>) => {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === blockId ? { ...block, ...partial } : block,
      ),
    )
  }

  const closeSlashMenu = () => setSlashState(null)

  const applySlashCommand = (blockId: string, type: BlockType) => {
    updateBlock(blockId, {
      type,
      content: '',
      checked: type === 'todo' ? false : undefined,
    })
    closeSlashMenu()
    setPendingFocusId(blockId)
  }

  const handleContentChange = (block: Block, value: string) => {
    const shortcut = markdownShortcuts.find(({ marker }) => marker === value)
    if (shortcut) {
      updateBlock(block.id, {
        type: shortcut.type,
        content: '',
        checked: shortcut.type === 'todo' ? false : undefined,
      })
      closeSlashMenu()
      return
    }

    updateBlock(block.id, { content: value })
    if (value === '/') {
      setSlashState({ blockId: block.id, selectedIndex: 0 })
      return
    }

    if (slashState?.blockId === block.id && !value.startsWith('/')) {
      closeSlashMenu()
    }
  }

  const insertBlockAfter = (block: Block, cursorPosition: number) => {
    const nextBlock = createBlock('text', block.content.slice(cursorPosition))
    const nextBlocks = blocks.flatMap((currentBlock) => {
      if (currentBlock.id !== block.id) return [currentBlock]
      return [
        { ...currentBlock, content: currentBlock.content.slice(0, cursorPosition) },
        nextBlock,
      ]
    })

    setBlocks(nextBlocks)
    closeSlashMenu()
    setPendingFocusId(nextBlock.id)
  }

  const removeEmptyBlock = (block: Block) => {
    const blockIndex = blocks.findIndex((currentBlock) => currentBlock.id === block.id)
    if (blockIndex <= 0) return

    const previousBlock = blocks[blockIndex - 1]
    setBlocks((currentBlocks) =>
      currentBlocks.filter((currentBlock) => currentBlock.id !== block.id),
    )
    closeSlashMenu()
    setPendingFocusId(previousBlock.id)
  }

  const handleSlashKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashState) return false

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSlashState((current) =>
        current
          ? {
              ...current,
              selectedIndex: (current.selectedIndex + 1) % slashCommands.length,
            }
          : current,
      )
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSlashState((current) =>
        current
          ? {
              ...current,
              selectedIndex:
                (current.selectedIndex - 1 + slashCommands.length) %
                slashCommands.length,
            }
          : current,
      )
      return true
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeSlashMenu()
      return true
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const command = slashCommands[slashState.selectedIndex]
      applySlashCommand(slashState.blockId, command.type)
      return true
    }

    return false
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    block: Block,
  ) => {
    if (slashState?.blockId === block.id && handleSlashKeyDown(event)) return

    const textarea = event.currentTarget
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      insertBlockAfter(block, textarea.selectionStart)
      return
    }

    if (
      event.key === 'Backspace' &&
      textarea.selectionStart === 0 &&
      textarea.selectionEnd === 0 &&
      block.content.length === 0
    ) {
      event.preventDefault()
      removeEmptyBlock(block)
    }
  }

  return (
    <div className="min-h-80 rounded-lg border border-input bg-background px-2 py-4 transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20 md:px-4 md:py-5">
      <div className="space-y-1">
        {blocks.map((block, index) => {
          const isActive = activeBlockId === block.id
          const isSlashOpen = slashState?.blockId === block.id

          return (
            <div
              key={block.id}
              className={cn(
                'group relative flex gap-2 rounded-lg px-2 py-1.5 transition-colors',
                isActive && 'bg-muted/50',
              )}
            >
              <button
                type="button"
                aria-label="블록 메뉴"
                title="블록 메뉴"
                className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <GripVertical size={15} />
              </button>

              {block.type === 'todo' && (
                <input
                  type="checkbox"
                  checked={Boolean(block.checked)}
                  onChange={(event) =>
                    updateBlock(block.id, { checked: event.target.checked })
                  }
                  className="mt-2.5 h-4 w-4 rounded border-input accent-primary"
                  aria-label="할 일 완료"
                />
              )}
              {block.type === 'bullet' && (
                <span className="mt-2 w-4 text-center text-muted-foreground">•</span>
              )}
              {block.type === 'number' && (
                <span className="mt-2 w-5 text-right text-sm text-muted-foreground">
                  {index + 1}.
                </span>
              )}

              <div className="relative min-w-0 flex-1">
                <textarea
                  ref={setTextareaRef(block.id)}
                  value={block.content}
                  rows={block.type === 'code' ? 3 : 1}
                  placeholder={getPlaceholder(block.type)}
                  onFocus={() => setActiveBlockId(block.id)}
                  onBlur={() => setActiveBlockId(null)}
                  onInput={(event) => adjustTextareaHeight(event.currentTarget)}
                  onChange={(event) =>
                    handleContentChange(block, event.target.value)
                  }
                  onKeyDown={(event) => handleKeyDown(event, block)}
                  className={cn(
                    'block max-h-none min-h-8 w-full resize-none overflow-hidden bg-transparent py-0.5 outline-none transition-colors placeholder:text-muted-foreground/65',
                    blockTextareaClassName(block.type),
                    block.type === 'todo' &&
                      block.checked &&
                      'text-muted-foreground line-through',
                  )}
                />

                {isSlashOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg">
                    {slashCommands.map((command, commandIndex) => {
                      const Icon = command.icon
                      const isSelected = slashState.selectedIndex === commandIndex

                      return (
                        <button
                          key={command.type}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applySlashCommand(block.id, command.type)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon size={15} />
                          {command.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
