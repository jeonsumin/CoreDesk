import { z } from 'zod'

export const portfolioLinkTypes = ['GITHUB', 'PRODUCTION', 'OTHER'] as const

export type PortfolioLinkType = (typeof portfolioLinkTypes)[number]

export const portfolioLinkTypeLabels: Record<PortfolioLinkType, string> = {
  GITHUB: 'GitHub',
  PRODUCTION: '운영 URL',
  OTHER: '기타',
}

export type PortfolioInput = {
  title: string
  description?: string
  techSpecs: string[]
  links: PortfolioLinkInput[]
}

export type PortfolioLinkInput = {
  type: PortfolioLinkType
  label?: string
  url: string
}

type ParseResult =
  | { success: true; data: PortfolioInput }
  | { success: false; error: string }

const MAX_TECH_SPEC_COUNT = 30
const MAX_LINK_COUNT = 3

function strOrUndef(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function parseJsonArray(raw: FormDataEntryValue | null): unknown[] {
  if (typeof raw !== 'string' || raw.trim().length === 0) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeTags(raw: FormDataEntryValue | null): string[] {
  const uniqueTags = new Set<string>()
  parseJsonArray(raw).forEach((value) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (trimmed.length > 0) uniqueTags.add(trimmed)
  })
  return [...uniqueTags]
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const linkSchema = z.object({
  type: z.enum(portfolioLinkTypes).default('OTHER'),
  label: z
    .string()
    .trim()
    .max(60, 'URI 라벨은 60자 이하로 입력해주세요')
    .optional()
    .transform((value) => (value ? value : undefined)),
  url: z
    .string()
    .trim()
    .min(1)
    .transform(normalizeUrl)
    .pipe(z.string().url('올바른 URI를 입력해주세요').max(500)),
})

const portfolioSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요').max(120),
  description: z
    .string()
    .trim()
    .max(2000, '설명은 2000자 이하로 입력해주세요')
    .optional()
    .transform((value) => (value ? value : undefined)),
  techSpecs: z
    .array(z.string().min(1).max(40, '기술 태그는 40자 이하로 입력해주세요'))
    .max(MAX_TECH_SPEC_COUNT, `기술 태그는 최대 ${MAX_TECH_SPEC_COUNT}개까지 등록할 수 있습니다`),
  links: z
    .array(linkSchema)
    .max(MAX_LINK_COUNT, 'URI는 최대 3개까지 등록할 수 있습니다'),
})

export function parsePortfolioFormData(formData: FormData): ParseResult {
  const rawLinks = parseJsonArray(formData.get('links')).filter((value) => {
    if (!value || typeof value !== 'object') return false
    const url = 'url' in value ? value.url : undefined
    return typeof url === 'string' && url.trim().length > 0
  })

  const parsed = portfolioSchema.safeParse({
    title: formData.get('title'),
    description: strOrUndef(formData.get('description')),
    techSpecs: normalizeTags(formData.get('techSpecs')),
    links: rawLinks,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  return { success: true, data: parsed.data }
}
