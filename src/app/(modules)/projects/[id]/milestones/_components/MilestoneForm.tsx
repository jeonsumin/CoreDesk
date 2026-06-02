'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toDateInputValue } from '@/lib/projects/milestone-gantt'
import { createMilestone, updateMilestone } from '../_actions/milestone'
import type { Milestone } from '@/types'

type Props = {
  projectId: string
  milestone?: Milestone
  onSuccess?: () => void
  defaultDate?: string
  defaultStartDate?: string
}

export function MilestoneForm({
  projectId,
  milestone,
  onSuccess,
  defaultDate,
  defaultStartDate,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = milestone
        ? await updateMilestone(milestone.id, projectId, formData)
        : await createMilestone(projectId, formData)
      if (result?.error) setError(result.error)
      else onSuccess?.()
    })
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">마일스톤명 *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={milestone?.title}
          placeholder="예: MVP 릴리즈"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              toDateInputValue(milestone?.startDate) || defaultStartDate || ''
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">마감일 *</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(milestone?.dueDate) || defaultDate || ''}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '저장 중...' : milestone ? '수정' : '마일스톤 추가'}
      </Button>
    </form>
  )
}
