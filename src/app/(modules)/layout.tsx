import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { getCurrentDbUser } from '@/lib/admin'

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/api/logout')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  )
}
