import { cache } from 'react'
import type { User } from '@prisma/client'
import { auth } from './auth'
import { prisma } from './prisma'

export type DbSessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive'>

export const getCurrentDbUser = cache(async (): Promise<DbSessionUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
  if (!user || !user.isActive) return null
  return user
})

export async function requireAdmin(): Promise<DbSessionUser> {
  const user = await getCurrentDbUser()
  if (!user || user.role !== 'ADMIN') throw new Error('Forbidden')
  return user
}
