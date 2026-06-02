import { parseMarkdownBlocks, type MarkdownBlock } from './markdown'

export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'code'

export type Block = {
  id: string
  type: BlockType
  content: string
  checked?: boolean
}

type SerializedMemoBlocks = {
  version: 1
  blocks: Block[]
}

const serializedVersion = 1
const todoPattern = /^\[( |x|X)\]\s+(.+)$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBlockType(value: unknown): value is BlockType {
  return (
    value === 'text' ||
    value === 'h1' ||
    value === 'h2' ||
    value === 'h3' ||
    value === 'todo' ||
    value === 'bullet' ||
    value === 'number' ||
    value === 'quote' ||
    value === 'code'
  )
}

function isBlock(value: unknown): value is Block {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    isBlockType(value.type) &&
    typeof value.content === 'string' &&
    (typeof value.checked === 'boolean' || value.checked === undefined)
  )
}

function createBlockId(index: number): string {
  return `block-${index + 1}`
}

function withGeneratedIds(blocks: Omit<Block, 'id'>[]): Block[] {
  return blocks.map((block, index) => ({
    id: createBlockId(index),
    ...block,
  }))
}

function markdownHeadingType(level: number): BlockType {
  if (level === 1) return 'h1'
  if (level === 2) return 'h2'
  return 'h3'
}

function listItemToBlock(item: string, ordered: boolean): Omit<Block, 'id'> {
  const todoMatch = item.match(todoPattern)
  if (todoMatch) {
    return {
      type: 'todo',
      content: todoMatch[2].trim(),
      checked: todoMatch[1].toLowerCase() === 'x',
    }
  }

  return {
    type: ordered ? 'number' : 'bullet',
    content: item,
  }
}

function markdownBlockToBlocks(block: MarkdownBlock): Omit<Block, 'id'>[] {
  if (block.type === 'heading') {
    return [{ type: markdownHeadingType(block.level), content: block.text }]
  }

  if (block.type === 'list') {
    return block.items.map((item) => listItemToBlock(item, block.ordered))
  }

  if (block.type === 'quote') {
    return [{ type: 'quote', content: block.text }]
  }

  if (block.type === 'code') {
    return [{ type: 'code', content: block.code }]
  }

  return [{ type: 'text', content: block.text }]
}

function parseSerializedBlocks(content: string): Block[] | null {
  try {
    const parsed: unknown = JSON.parse(content)
    if (!isRecord(parsed)) return null
    if (parsed.version !== serializedVersion) return null
    if (!Array.isArray(parsed.blocks)) return null
    if (!parsed.blocks.every(isBlock)) return null
    return parsed.blocks.length > 0
      ? parsed.blocks
      : [{ id: createBlockId(0), type: 'text', content: '' }]
  } catch {
    return null
  }
}

export function isSerializedMemoBlocks(content: string): boolean {
  return parseSerializedBlocks(content) !== null
}

export function serializeMemoBlocks(blocks: Block[]): string {
  const payload: SerializedMemoBlocks = {
    version: serializedVersion,
    blocks,
  }

  return JSON.stringify(payload)
}

export function deserializeMemoBlocks(content: string): Block[] {
  const serializedBlocks = parseSerializedBlocks(content)
  if (serializedBlocks) return serializedBlocks

  const markdownBlocks = parseMarkdownBlocks(content)
  const blocks = markdownBlocks.flatMap(markdownBlockToBlocks)
  if (blocks.length === 0) {
    return [{ id: createBlockId(0), type: 'text', content: '' }]
  }

  return withGeneratedIds(blocks)
}

function blockToMarkdownLine(block: Block): string {
  if (block.type === 'h1') return `# ${block.content}`
  if (block.type === 'h2') return `## ${block.content}`
  if (block.type === 'h3') return `### ${block.content}`
  if (block.type === 'todo') {
    return `- [${block.checked ? 'x' : ' '}] ${block.content}`
  }
  if (block.type === 'bullet') return `- ${block.content}`
  if (block.type === 'number') return `1. ${block.content}`
  if (block.type === 'quote') return `> ${block.content}`
  if (block.type === 'code') return `\`\`\`\n${block.content}\n\`\`\``
  return block.content
}

function shouldGroupWithPrevious(block: Block, previousBlock: Block): boolean {
  const listTypes: BlockType[] = ['todo', 'bullet', 'number']
  return listTypes.includes(block.type) && block.type === previousBlock.type
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.reduce<string[]>((chunks, block, index) => {
    if (!block.content.trim() && block.type !== 'todo') return chunks

    const line = blockToMarkdownLine(block)
    const previousBlock = blocks[index - 1]
    if (previousBlock && shouldGroupWithPrevious(block, previousBlock)) {
      const lastChunk = chunks[chunks.length - 1] ?? ''
      return [...chunks.slice(0, -1), `${lastChunk}\n${line}`]
    }

    return [...chunks, line]
  }, []).join('\n\n')
}

export function contentToMarkdown(content: string): string {
  return isSerializedMemoBlocks(content)
    ? blocksToMarkdown(deserializeMemoBlocks(content))
    : content
}

export function getMemoPreviewContent(content: string, maxBlocks: number): string {
  if (!isSerializedMemoBlocks(content)) {
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(0, maxBlocks)
      .join('\n')
  }

  const blocks = deserializeMemoBlocks(content)
    .filter((block) => block.content.trim().length > 0)
    .slice(0, maxBlocks)

  return blocksToMarkdown(blocks)
}
