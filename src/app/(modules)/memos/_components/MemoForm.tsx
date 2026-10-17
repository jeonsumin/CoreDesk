'use client'

import { useCallback, useState, useTransition } from 'react'
import { FormActions } from '@/components/form/FormActions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Memo } from '@/types'
import { createMemo, updateMemo } from '../_actions/memo'
import { BlockEditor } from './BlockEditor'

type ProjectOption = {
  id: string
  name: string
}

type Props = {
  projects: ProjectOption[]
  memo?: Memo
  defaultProjectId?: string
}

export function MemoForm({ projects, memo, defaultProjectId }: Props) {
  const [content, setContent] = useState(memo?.content ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const initialProjectId = memo?.projectId ?? defaultProjectId ?? ''
  const handleEditorChange = useCallback((nextContent: string) => {
    setContent(nextContent)
  }, [])

  const action = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = memo
        ? await updateMemo(memo.id, formData)
        : await createMemo(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form id="memo-form" action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
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
          <Label htmlFor="projectId" className="font-semibold">
            프로젝트 연결
          </Label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={initialProjectId}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
          >
            <option value="">연결 안 함</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
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
        cancelHref={memo ? `/memos/${memo.id}` : '/memos'}
      />
    </form>
  )
}
