'use client'

import { useState, useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/form/FormActions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ICON_NAMES } from '@/lib/menu/icon-names'
import { MENU_ICONS } from '@/lib/menu/icons'
import {
  ACCESS_LABELS,
  DEFAULT_PERMISSIONS,
  MENU_SECTIONS,
  MENU_STATUSES,
  MENU_TYPES,
  PERMISSION_ROLES,
  menuCreateSchema,
  menuInputSchema,
  type MenuCreateInput,
} from '@/lib/menu/menu-schema'
import { ROLE_LABELS } from '@/lib/system/user-schema'
import { createMenu, updateMenu } from '../_actions/menu'
import type { MenuRow } from './MenuTable'

export type GroupOption = { id: string; title: string }

const TYPE_LABELS = { GROUP: '그룹', PAGE: '페이지', LINK: '외부 링크' } as const
const STATUS_LABELS = { ACTIVE: '활성', PREPARING: '준비중' } as const
const NONE = '__none__'

type Props = { groups: GroupOption[] } & ({ mode: 'create' } | { mode: 'edit'; menu: MenuRow })

const toValues = (menu: MenuRow | null): MenuCreateInput => ({
  type: menu?.type ?? 'PAGE',
  title: menu?.title ?? '',
  parentId: menu?.parentId ?? null,
  path: menu?.path ?? '',
  icon: ICON_NAMES.find((n) => n === menu?.icon) ?? 'Folder',
  section: MENU_SECTIONS.find((s) => s === menu?.section) ?? null,
  status: menu?.status ?? 'ACTIVE',
  permissions: DEFAULT_PERMISSIONS,
})

export function MenuFormDialog(props: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = props.mode === 'edit'
  const menu = props.mode === 'edit' ? props.menu : null

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<MenuCreateInput>({
    resolver: zodResolver(isEdit ? menuInputSchema : menuCreateSchema),
    defaultValues: toValues(menu),
  })

  const type = useWatch({ control, name: 'type' })
  const parentId = useWatch({ control, name: 'parentId' })
  const isGroup = type === 'GROUP'

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset(toValues(menu))
      setError(null)
    }
  }

  const onSubmit = (data: MenuCreateInput) => {
    setError(null)
    startTransition(async () => {
      const result = menu ? await updateMenu(menu.id, data) : await createMenu(data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      toast.success(isEdit ? '메뉴를 수정했습니다' : '메뉴를 추가했습니다')
    })
  }

  const fieldError = (msg?: string) => msg && <p className="text-sm text-destructive">{msg}</p>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${menu?.title ?? ''} 수정`}
              title="메뉴 수정"
            >
              <Pencil />
            </Button>
          ) : (
            <Button size="lg">
              <Plus data-icon="inline-start" />
              메뉴 추가
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '메뉴 수정' : '메뉴 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">유형 *</Label>
            {isEdit ? (
              <p className="text-sm">{TYPE_LABELS[type]}</p>
            ) : (
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    items={MENU_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
                    value={field.value}
                    onValueChange={(v) => {
                      if (!v) return
                      field.onChange(v)
                      if (v === 'GROUP') setValue('parentId', null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MENU_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="font-semibold">이름 *</Label>
            <Input id="title" {...register('title')} />
            {fieldError(errors.title?.message)}
          </div>

          {!isGroup && (
            <div className="space-y-2">
              <Label className="font-semibold">상위 그룹</Label>
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    items={[
                      { value: NONE, label: '(없음)' },
                      ...props.groups.map((g) => ({ value: g.id, label: g.title })),
                    ]}
                    value={field.value ?? NONE}
                    onValueChange={(v) => v && field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>(없음)</SelectItem>
                      {props.groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {fieldError(errors.parentId?.message)}
            </div>
          )}

          {!isGroup && (
            <div className="space-y-2">
              <Label htmlFor="path" className="font-semibold">
                {type === 'LINK' ? 'URL *' : '경로 *'}
              </Label>
              <Input
                id="path"
                placeholder={type === 'LINK' ? 'https://example.com' : '/my-tasks'}
                {...register('path')}
              />
              {fieldError(errors.path?.message)}
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">아이콘 *</Label>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <Select
                  items={ICON_NAMES.map((n) => ({ value: n, label: n }))}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_NAMES.map((n) => {
                      const Icon = MENU_ICONS[n]
                      return (
                        <SelectItem key={n} value={n}>
                          <Icon />
                          {n}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {!parentId && (
            <div className="space-y-2">
              <Label className="font-semibold">섹션</Label>
              <Controller
                control={control}
                name="section"
                render={({ field }) => (
                  <Select
                    items={[
                      { value: NONE, label: '(없음)' },
                      ...MENU_SECTIONS.map((s) => ({ value: s, label: s })),
                    ]}
                    value={field.value ?? NONE}
                    onValueChange={(v) => v && field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>(없음)</SelectItem>
                      {MENU_SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">상태 *</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  items={MENU_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {!isEdit && !isGroup && (
            <div className="space-y-2">
              <Label className="font-semibold">기본 권한</Label>
              <div className="grid grid-cols-3 gap-2">
                {PERMISSION_ROLES.map((role) => (
                  <div key={role} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                    <Controller
                      control={control}
                      name={`permissions.${role}`}
                      render={({ field }) => (
                        <Select
                          items={Object.entries(ACCESS_LABELS).map(([value, label]) => ({ value, label }))}
                          value={field.value}
                          onValueChange={(v) => v && field.onChange(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACCESS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <FormActions isPending={isPending} submitLabel={isEdit ? '변경사항 저장' : '메뉴 추가'} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
