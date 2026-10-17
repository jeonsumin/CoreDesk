'use client'

import { useState, useTransition } from 'react'
import { AlignLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toDateInputValue } from '@/lib/projects/gantt'
import { formatIssueKey } from '@/lib/projects/issue-key'
import { deleteIssue } from '../_actions/issue'
import { IssueForm } from './IssueForm'
import {
  EpicBadge,
  PriorityIcon,
  TypeIcon,
  priorityMeta,
  statusMeta,
  type BoardIssue,
  type MemberOption,
} from './issue-meta'

type Props = {
  projectId: string
  projectKey: string | null
  issue: BoardIssue | null
  epics: BoardIssue[]
  members: MemberOption[]
  canManage: boolean
  onClose: () => void
}

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

// 보드 카드·타임라인 행을 누르면 열리는 이슈 상세. 관리 권한이 있으면 수정/삭제
export function IssueDetailDialog({ projectId, projectKey, issue: current, epics, members, canManage, onClose }: Props) {
  // 닫히는 애니메이션 동안 내용이 비지 않게 마지막 이슈를 유지한다
  const [lastIssue, setLastIssue] = useState(current)
  if (current && current !== lastIssue) setLastIssue(current)
  const issue = current ?? lastIssue
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const close = () => {
    setEditing(false)
    setError(null)
    onClose()
  }

  const epic = issue?.epicId ? epics.find((e) => e.id === issue.epicId) : undefined
  const issueKey = issue ? formatIssueKey(projectKey, issue.number) : null
  const epicOptions = epics.map((e) => ({ id: e.id, label: [formatIssueKey(projectKey, e.number), e.title].filter(Boolean).join(' ') }))

  const handleDelete = () => {
    if (!issue) return
    startTransition(async () => {
      const result = await deleteIssue(issue.id, projectId)
      if (result.error) setError(result.error)
      else close()
    })
  }

  return (
    <Dialog open={current !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-3xl">
        {issue && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TypeIcon type={issue.type} />
                {issueKey ?? '이슈'}
              </DialogTitle>
            </DialogHeader>

            {editing ? (
              <IssueForm
                projectId={projectId}
                issue={issue}
                members={members}
                epics={epicOptions}
                onSuccess={() => setEditing(false)}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="min-w-0 space-y-4">
                  {epic && <EpicBadge issueKey={formatIssueKey(projectKey, epic.number)} title={epic.title} />}
                  <h2 className="break-words text-xl font-bold">{issue.title}</h2>
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <AlignLeft className="size-4" />
                      설명
                    </h3>
                    <p className="min-h-20 whitespace-pre-wrap rounded-lg border p-3 text-sm text-muted-foreground">
                      {issue.description || '설명이 없습니다'}
                    </p>
                  </section>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        <Pencil data-icon="inline-start" />
                        수정
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                        <Trash2 data-icon="inline-start" />
                        삭제
                      </Button>
                    </div>
                  )}
                </div>

                <dl className="space-y-3 border-t pt-4 text-sm md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <Meta label="상태">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${statusMeta[issue.status].className}`}>
                      {statusMeta[issue.status].label}
                    </span>
                  </Meta>
                  <Meta label={`담당자 (${issue.assignees.length})`}>
                    {issue.assignees.length > 0 ? issue.assignees.map((a) => a.name).join(', ') : '없음'}
                  </Meta>
                  <Meta label="우선순위">
                    <span className="flex items-center gap-1">
                      <PriorityIcon priority={issue.priority} />
                      {priorityMeta[issue.priority].label}
                    </span>
                  </Meta>
                  {issue.type !== 'EPIC' && (
                    <Meta label="에픽">{epic ? formatIssueKey(projectKey, epic.number) ?? epic.title : '없음'}</Meta>
                  )}
                  <Meta label="시작일">{toDateInputValue(issue.startDate) || '-'}</Meta>
                  <Meta label="마감일">{toDateInputValue(issue.dueDate) || '-'}</Meta>
                  <Meta label="생성자">{issue.createdBy?.name ?? '-'}</Meta>
                  <Meta label="생성일">{formatDateTime(issue.createdAt)}</Meta>
                  <Meta label="수정일">{formatDateTime(issue.updatedAt)}</Meta>
                </dl>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
