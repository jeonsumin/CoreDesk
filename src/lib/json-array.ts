import type { Prisma } from '@prisma/client'

export function toStringArray(value: Prisma.JsonValue | unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}
