import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PortfolioForm } from '../_components/PortfolioForm'

export default function NewPortfolioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">새 포트폴리오</h1>
          <p className="text-muted-foreground">포트폴리오 정보를 입력하세요</p>
        </div>
        <Link href="/portfolios" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft size={14} />
          목록
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>포트폴리오 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioForm />
        </CardContent>
      </Card>
    </div>
  )
}
