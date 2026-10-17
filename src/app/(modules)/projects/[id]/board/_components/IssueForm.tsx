'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, ChevronDown, Users, Zap } from 'lucide-react'
import { FormActions } from '@/components/form/FormActions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toDateInputValue } from '@/lib/projects/gantt'
import { cn } from '@/lib/utils'
import type { IssueType, TaskStatus } from '@/types'
import { createIssue, updateIssue } from '../_actions/issue'
import { priorityMeta, statusMeta, type BoardIssue, type MemberOption } from './issue-meta'

type EpicOption = { id: string; label: string }

type Props = {
  projectId: string
  issue?: BoardIssue
  // 새로 만들 때의 기본값 (에픽 패널의 + 는 EPIC, 컬럼의 '이슈 만들기'는 해당 상태)
  defaultType?: IssueType
  defaultStatus?: TaskStatus
  defaultEpicId?: string
  members: MemberOption[]
  epics: EpicOption[]
  onSuccess?: () => void
}

const toItems = <K extends string>(meta: Record<K, { label: string }>) =>
  (Object.keys(meta) as K[]).map((value) => ({ value, label: meta[value].label }))

const issueTypeItems = [
  { value: 'TASK', label: '작업' },
  { value: 'STORY', label: '스토리' },
]
const priorityItems = toItems(priorityMeta)
const statusItems = toItems(statusMeta)

export function IssueForm({
  projectId,
  issue,
  defaultType = 'TASK',
  defaultStatus = 'TODO',
  defaultEpicId,
  members,
  epics,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(issue?.assignees.map((a) => a.id) ?? [])
  const type = issue?.type ?? defaultType
  const isEpic = type === 'EPIC'

  // 비활성화돼 목록에서 빠진 기존 담당자도 선택 상태로 보여준다
  const memberOptions = [
    ...members,
    ...(issue?.assignees.filter((a) => !members.some((m) => m.id === a.id)) ?? []).map((a) => ({
      ...a,
      name: `${a.name} (비활성)`,
    })),
  ]
  const epicItems = [{ value: '', label: '없음' }, ...epics.map((e) => ({ value: e.id, label: e.label }))]
  const selectedNames = memberOptions.filter((m) => assigneeIds.includes(m.id)).map((m) => m.name)

  const handleAction = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = issue
        ? await updateIssue(issue.id, projectId, formData)
        : await createIssue(projectId, formData)
      if (result.error) setError(result.error)
      else onSuccess?.()
    })
  }

  const toggleAssignee = (id: string, checked: boolean) =>
    setAssigneeIds((ids) => (checked ? [...ids, id] : ids.filter((v) => v !== id)))

  return (
    <form action={handleAction} className="space-y-4">
      {assigneeIds.map((id) => (
        <input key={id} type="hidden" name="assigneeIds" value={id} />
      ))}

      <Field label="이슈 타입 *" htmlFor="type">
        {isEpic ? (
          <>
            <input type="hidden" name="type" value="EPIC" />
            <div className="flex h-9 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm">
              <Zap className="size-4 text-purple-500" />
              에픽
            </div>
          </>
        ) : (
          <SelectField name="type" id="type" items={issueTypeItems} defaultValue={type} />
        )}
      </Field>

      <Field label="제목 *" htmlFor="title">
        <Input id="title" name="title" defaultValue={issue?.title} placeholder="이슈 제목을 입력하세요" required />
      </Field>

      <Field label="설명" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          defaultValue={issue?.description ?? ''}
          placeholder="이슈에 대한 상세 설명을 입력하세요"
          rows={4}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="담당자 (다중 선택 가능)" icon={<Users className="size-3.5" />}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm"
                />
              }
            >
              <span className={cn('truncate', selectedNames.length === 0 && 'text-muted-foreground')}>
                {selectedNames.length > 0 ? selectedNames.join(', ') : '담당자 선택'}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 w-56">
              {memberOptions.map((member) => (
                <DropdownMenuCheckboxItem
                  key={member.id}
                  checked={assigneeIds.includes(member.id)}
                  onCheckedChange={(checked) => toggleAssignee(member.id, checked)}
                >
                  {member.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Field>
        <Field label="우선순위" htmlFor="priority">
          <SelectField name="priority" id="priority" items={priorityItems} defaultValue={issue?.priority ?? 'MEDIUM'} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {issue ? (
          <Field label="상태" htmlFor="status">
            <SelectField name="status" id="status" items={statusItems} defaultValue={issue.status} />
          </Field>
        ) : (
          <input type="hidden" name="status" value={defaultStatus} />
        )}
        {!isEpic && (
          <Field label="에픽" htmlFor="epicId" icon={<Zap className="size-3.5 text-purple-500" />}>
            <SelectField
              name="epicId"
              id="epicId"
              items={epicItems}
              defaultValue={issue?.epicId ?? defaultEpicId ?? ''}
            />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="시작일" htmlFor="startDate" icon={<CalendarDays className="size-3.5" />}>
          <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(issue?.startDate)} />
        </Field>
        <Field label="마감일" htmlFor="dueDate" icon={<CalendarDays className="size-3.5" />}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInputValue(issue?.dueDate)} />
        </Field>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <FormActions isPending={isPending} submitLabel={issue ? '변경사항 저장' : '만들기'} />
    </form>
  )
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string
  htmlFor?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-1 font-semibold">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  )
}

function SelectField({
  name,
  id,
  items,
  defaultValue,
}: {
  name: string
  id: string
  items: { value: string; label: string }[]
  defaultValue: string
}) {
  return (
    <Select name={name} items={items} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
