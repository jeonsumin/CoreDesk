import { notFound } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/admin'

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentDbUser()
  if (user?.role !== 'ADMIN') notFound()
  return <>{children}</>
}
