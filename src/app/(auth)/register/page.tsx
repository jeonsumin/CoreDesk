import Link from 'next/link'
import {buttonVariants} from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">가입 비활성화</CardTitle>
                    <CardDescription>
                        CoreDesk 계정은 관리자가 생성합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        접근이 필요하면 사내 관리자에게 계정 생성을 요청하세요.
                    </p>
                    <Link href="/login" className={buttonVariants({className: 'w-full'})}>
                        로그인으로 돌아가기
                    </Link>
                </CardContent>
            </Card>
            {/*<Card>*/}
            {/*    <MarkdownSection/>*/}
            {/*</Card>*/}
        </div>
    )
}

import MarkdownRenderer from '@/lib/markup/markup-renderer'
import {getAllPolicyVersions} from './index'

const MarkdownSection = async () => {
    const content = (await getAllPolicyVersions()) ?? ''

    return (
            <MarkdownRenderer content={content}/>
    )
}
