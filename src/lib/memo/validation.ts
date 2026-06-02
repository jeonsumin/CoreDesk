import { z } from 'zod'

export type MemoInput = {
  title: string
  content: string
  projectId?: string
}

export type MemoSearchParams = {
  q?: string
}

type ParseResult =
  | { success: true; data: MemoInput }
  | { success: false; error: string }

const MAX_TITLE_LENGTH = 120
const MAX_CONTENT_LENGTH = 20000
const MAX_SEARCH_LENGTH = 80

function stringValue(raw: FormDataEntryValue | null): string {
  return typeof raw === 'string' ? raw : ''
}

function optionalStringValue(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

const memoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해주세요')
    .max(MAX_TITLE_LENGTH, `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해주세요`),
  content: z
    .string()
    .max(
      MAX_CONTENT_LENGTH,
      `내용은 ${MAX_CONTENT_LENGTH.toLocaleString()}자 이하로 입력해주세요`,
    )
    .transform(normalizeLineEndings),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export function parseMemoFormData(formData: FormData): ParseResult {
  const parsed = memoSchema.safeParse({
    title: stringValue(formData.get('title')),
    content: stringValue(formData.get('content')),
    projectId: optionalStringValue(formData.get('projectId')),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  return { success: true, data: parsed.data }
}

export function parseMemoSearchParams(searchParams: {
  q?: string | string[]
}): MemoSearchParams {
  const rawQuery = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q
  const q = rawQuery?.trim().slice(0, MAX_SEARCH_LENGTH)

  return { q: q && q.length > 0 ? q : undefined }
}
