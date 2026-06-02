import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export async function Header() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-sm leading-tight">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <Button variant="ghost" size="sm" type="submit">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  )
}
