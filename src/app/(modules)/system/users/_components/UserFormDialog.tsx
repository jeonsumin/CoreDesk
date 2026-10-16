'use client'

import { useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import {
  ROLES,
  ROLE_LABELS,
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
} from '@/lib/system/user-schema'
import { createUser, updateUser } from '../_actions/user'
import type { UserRow } from './UserTable'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; user: UserRow; isSelf: boolean }

export function UserFormDialog(props: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEdit = props.mode === 'edit'
  const user = props.mode === 'edit' ? props.user : null

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'MEMBER',
      password: '',
    },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'MEMBER',
        password: '',
      })
      setError(null)
    }
  }

  const onSubmit = (data: CreateUserInput) => {
    setError(null)
    startTransition(async () => {
      const result = user ? await updateUser(user.id, data) : await createUser(data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      toast.success(isEdit ? '사용자를 수정했습니다' : '사용자를 추가했습니다')
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size={isEdit ? 'sm' : 'default'} variant={isEdit ? 'outline' : 'default'}>
            {isEdit ? '수정' : '사용자 추가'}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '사용자 수정' : '사용자 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? '변경할 때만 입력' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>역할</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  disabled={props.mode === 'edit' && props.isSelf}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '저장 중...' : isEdit ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
