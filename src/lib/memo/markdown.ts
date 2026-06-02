export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; language?: string; code: string }

export type MarkdownInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string }

const headingPattern = /^(#{1,6})\s+(.+)$/
const unorderedListPattern = /^\s*[-*]\s+(.+)$/
const orderedListPattern = /^\s*\d+[.)]\s+(.+)$/
const quotePattern = /^>\s?(.+)$/
const fencedCodePattern = /^```([A-Za-z0-9_-]+)?\s*$/
const inlinePattern =
  /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

function toHeadingLevel(value: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (value <= 1) return 1
  if (value === 2) return 2
  if (value === 3) return 3
  if (value === 4) return 4
  if (value === 5) return 5
  return 6
}

function pushParagraph(blocks: MarkdownBlock[], paragraphLines: string[]) {
  if (paragraphLines.length === 0) return

  blocks.push({
    type: 'paragraph',
    text: paragraphLines.join(' ').trim(),
  })
  paragraphLines.length = 0
}

function parseList(
  lines: string[],
  startIndex: number,
  ordered: boolean,
): { block: MarkdownBlock; nextIndex: number } {
  const pattern = ordered ? orderedListPattern : unorderedListPattern
  const items: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const match = lines[index].match(pattern)
    if (!match) break
    items.push(match[1].trim())
    index += 1
  }

  return {
    block: { type: 'list', ordered, items },
    nextIndex: index,
  }
}

function parseCodeBlock(
  lines: string[],
  startIndex: number,
  openingFence: RegExpMatchArray,
): { block: MarkdownBlock; nextIndex: number } {
  const codeLines: string[] = []
  let index = startIndex + 1

  while (index < lines.length) {
    if (fencedCodePattern.test(lines[index])) {
      return {
        block: {
          type: 'code',
          language: openingFence[1],
          code: codeLines.join('\n'),
        },
        nextIndex: index + 1,
      }
    }

    codeLines.push(lines[index])
    index += 1
  }

  return {
    block: {
      type: 'code',
      language: openingFence[1],
      code: codeLines.join('\n'),
    },
    nextIndex: index,
  }
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  const paragraphLines: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmedLine = line.trim()

    if (trimmedLine.length === 0) {
      pushParagraph(blocks, paragraphLines)
      index += 1
      continue
    }

    const codeMatch = trimmedLine.match(fencedCodePattern)
    if (codeMatch) {
      pushParagraph(blocks, paragraphLines)
      const parsed = parseCodeBlock(lines, index, codeMatch)
      blocks.push(parsed.block)
      index = parsed.nextIndex
      continue
    }

    const headingMatch = trimmedLine.match(headingPattern)
    if (headingMatch) {
      pushParagraph(blocks, paragraphLines)
      blocks.push({
        type: 'heading',
        level: toHeadingLevel(headingMatch[1].length),
        text: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const isUnorderedList = unorderedListPattern.test(line)
    if (isUnorderedList) {
      pushParagraph(blocks, paragraphLines)
      const parsed = parseList(lines, index, false)
      blocks.push(parsed.block)
      index = parsed.nextIndex
      continue
    }

    const isOrderedList = orderedListPattern.test(line)
    if (isOrderedList) {
      pushParagraph(blocks, paragraphLines)
      const parsed = parseList(lines, index, true)
      blocks.push(parsed.block)
      index = parsed.nextIndex
      continue
    }

    const quoteMatch = line.match(quotePattern)
    if (quoteMatch) {
      pushParagraph(blocks, paragraphLines)
      blocks.push({ type: 'quote', text: quoteMatch[1].trim() })
      index += 1
      continue
    }

    paragraphLines.push(trimmedLine)
    index += 1
  }

  pushParagraph(blocks, paragraphLines)
  return blocks
}

function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/)/i.test(href)
}

function parseInlineToken(token: string): MarkdownInline {
  if (token.startsWith('`') && token.endsWith('`')) {
    return { type: 'code', text: token.slice(1, -1) }
  }

  if (token.startsWith('**') && token.endsWith('**')) {
    return { type: 'strong', text: token.slice(2, -2) }
  }

  if (token.startsWith('*') && token.endsWith('*')) {
    return { type: 'em', text: token.slice(1, -1) }
  }

  const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (linkMatch) {
    const href = linkMatch[2].trim()
    return isSafeHref(href)
      ? { type: 'link', text: linkMatch[1], href }
      : { type: 'text', text: linkMatch[1] }
  }

  return { type: 'text', text: token }
}

export function parseInlineMarkdown(text: string): MarkdownInline[] {
  const inlines: MarkdownInline[] = []
  let lastIndex = 0

  for (const match of text.matchAll(inlinePattern)) {
    const token = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      inlines.push({ type: 'text', text: text.slice(lastIndex, index) })
    }

    inlines.push(parseInlineToken(token))
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    inlines.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return inlines
}
