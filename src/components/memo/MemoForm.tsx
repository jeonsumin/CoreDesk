'use client'

import { useCallback, useState, useTransition } from 'react'
import { FormActions } from '@/components/form/FormActions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Memo } from '@/types'
import { BlockEditor } from './BlockEditor'

type Props = {
  memo?: Memo
  // 개인 메모(/memos)와 프로젝트 메모가 각자의 Server Action을 넘긴다
  onSubmit: (formData: FormData) => Promise<{ error?: string } | void>
  cancelHref: string
}

export function MemoForm({ memo, onSubmit, cancelHref }: Props) {
  const [content, setContent] = useState(memo?.content ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const handleEditorChange = useCallback((nextContent: string) => {
    setContent(nextContent)
  }, [])

  const action = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await onSubmit(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form id="memo-form" action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="font-semibold">
          제목 *
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={memo?.title}
          placeholder="메모 제목"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="font-semibold">
          내용
        </Label>
        <input type="hidden" id="content" name="content" value={content} />
        <BlockEditor content={content} onChange={handleEditorChange} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <FormActions
        submitLabel={memo ? '변경사항 저장' : '메모 저장'}
        isPending={isPending}
        cancelHref={cancelHref}
      />
    </form>
  )
}
