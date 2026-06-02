'use client'

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/form/TagInput'
import { toStringArray } from '@/lib/json-array'
import { formatFileSize } from '@/lib/utils'
import {
  portfolioLinkTypeLabels,
  portfolioLinkTypes,
  type PortfolioLinkType,
} from '@/lib/portfolio/validation'
import type { PortfolioWithAssets } from '@/types'
import { createPortfolio, updatePortfolio } from '../_actions/portfolio'

type LinkFormValue = {
  type: PortfolioLinkType
  label: string
  url: string
}

type Props = {
  portfolio?: PortfolioWithAssets
}

type ImagePreview = {
  name: string
  size: number
  url: string
}

function initialLinks(portfolio?: PortfolioWithAssets): LinkFormValue[] {
  if (!portfolio || portfolio.links.length === 0) {
    return [{ type: 'PRODUCTION', label: '', url: '' }]
  }

  return portfolio.links
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      type: link.type as PortfolioLinkType,
      label: link.label ?? '',
      url: link.url,
    }))
}

function createImagePreview(file: File): ImagePreview {
  return {
    name: file.name,
    size: file.size,
    url: URL.createObjectURL(file),
  }
}

function revokeImagePreview(preview: ImagePreview | null) {
  if (!preview) return
  URL.revokeObjectURL(preview.url)
}

function revokeImagePreviews(previews: ImagePreview[]) {
  previews.forEach(revokeImagePreview)
}

function SelectedImagePreview({
  preview,
  onRemove,
}: {
  preview: ImagePreview
  onRemove?: () => void
}) {
  return (
    <div className="flex w-[100px] flex-col gap-1">
      <div className="relative h-[100px] w-[100px] overflow-hidden rounded-md border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.url}
          alt={preview.name}
          className="h-full w-full object-cover"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-destructive"
            aria-label={`${preview.name} 제거`}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className="truncate text-xs font-medium" title={preview.name}>
        {preview.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatFileSize(preview.size)}
      </p>
    </div>
  )
}

export function PortfolioForm({ portfolio }: Props) {
  const [links, setLinks] = useState<LinkFormValue[]>(() => initialLinks(portfolio))
  const [thumbnailPreview, setThumbnailPreview] = useState<ImagePreview | null>(null)
  const [screenshotPreviews, setScreenshotPreviews] = useState<ImagePreview[]>([])
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const screenshotsInputRef = useRef<HTMLInputElement>(null)
  const thumbnailPreviewRef = useRef<ImagePreview | null>(null)
  const screenshotFilesRef = useRef<File[]>([])
  const screenshotPreviewsRef = useRef<ImagePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    return () => {
      revokeImagePreview(thumbnailPreviewRef.current)
      revokeImagePreviews(screenshotPreviewsRef.current)
    }
  }, [])

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    revokeImagePreview(thumbnailPreviewRef.current)

    const nextPreview = file ? createImagePreview(file) : null
    thumbnailPreviewRef.current = nextPreview
    setThumbnailPreview(nextPreview)
  }

  const handleScreenshotsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const newPreviews = files.map(createImagePreview)

    screenshotFilesRef.current = [...screenshotFilesRef.current, ...files]
    setScreenshotPreviews((prev) => {
      const nextPreviews = [...prev, ...newPreviews]
      screenshotPreviewsRef.current = nextPreviews
      return nextPreviews
    })
    event.target.value = ''
  }

  const removeScreenshot = (index: number) => {
    const preview = screenshotPreviewsRef.current[index]
    revokeImagePreview(preview ?? null)

    screenshotFilesRef.current = screenshotFilesRef.current.filter(
      (_, currentIndex) => currentIndex !== index,
    )
    setScreenshotPreviews((prev) => {
      const nextPreviews = prev.filter((_, currentIndex) => currentIndex !== index)
      screenshotPreviewsRef.current = nextPreviews
      return nextPreviews
    })
  }

  const updateLink = (index: number, value: Partial<LinkFormValue>) => {
    setLinks((prev) =>
      prev.map((link, currentIndex) =>
        currentIndex === index ? { ...link, ...value } : link,
      ),
    )
  }

  const addLink = () => {
    if (links.length >= 3) return
    setLinks((prev) => [...prev, { type: 'OTHER', label: '', url: '' }])
  }

  const removeLink = (index: number) => {
    setLinks((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index)
      return next.length > 0 ? next : [{ type: 'PRODUCTION', label: '', url: '' }]
    })
  }

  const action = (formData: FormData) => {
    setError(null)
    formData.delete('screenshots')
    screenshotFilesRef.current.forEach((file) => {
      formData.append('screenshots', file, file.name)
    })

    startTransition(async () => {
      const result = portfolio
        ? await updatePortfolio(portfolio.id, formData)
        : await createPortfolio(formData)

      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="links" value={JSON.stringify(links)} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">제목 *</Label>
          <Input
            id="title"
            name="title"
            defaultValue={portfolio?.title}
            placeholder="포트폴리오 제목"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={portfolio?.description ?? ''}
            rows={5}
            placeholder="프로젝트 개요, 주요 기능, 성과"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="techSpecs">구현 기술 스펙</Label>
          <TagInput
            name="techSpecs"
            defaultValue={toStringArray(portfolio?.techSpecs)}
            placeholder="Next.js, PostgreSQL, Docker"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail">썸네일 이미지</Label>
          <input
            ref={thumbnailInputRef}
            id="thumbnail"
            name="thumbnail"
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={isPending}
          >
            <Upload size={14} />
            <span>{thumbnailPreview ? '썸네일 변경' : '썸네일 선택'}</span>
          </Button>
          {thumbnailPreview && (
            <div className="pt-1">
              <SelectedImagePreview preview={thumbnailPreview} />
            </div>
          )}
          {portfolio?.thumbnailFile && (
            <p className="text-xs text-muted-foreground">
              현재: {portfolio.thumbnailFile.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="screenshots">프로젝트 스크린샷</Label>
          <input
            ref={screenshotsInputRef}
            id="screenshots"
            type="file"
            accept="image/*"
            multiple
            onChange={handleScreenshotsChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => screenshotsInputRef.current?.click()}
            disabled={isPending}
          >
            <Plus size={14} />
            <span>스크린샷 추가</span>
          </Button>
          {screenshotPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {screenshotPreviews.map((preview, index) => (
                <SelectedImagePreview
                  key={`${preview.name}-${preview.size}-${index}`}
                  preview={preview}
                  onRemove={() => removeScreenshot(index)}
                />
              ))}
            </div>
          )}
          {portfolio && (
            <p className="text-xs text-muted-foreground">
              등록됨: {portfolio.images.length}개
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>URI</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={links.length >= 3}
          >
            <Plus size={14} />
            <span>추가</span>
          </Button>
        </div>

        <div className="space-y-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border p-3 md:grid-cols-[140px_1fr_180px_auto]"
            >
              <select
                value={link.type}
                onChange={(event) =>
                  updateLink(index, {
                    type: event.target.value as PortfolioLinkType,
                  })
                }
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="URI 유형"
              >
                {portfolioLinkTypes.map((type) => (
                  <option key={type} value={type}>
                    {portfolioLinkTypeLabels[type]}
                  </option>
                ))}
              </select>
              <Input
                value={link.url}
                onChange={(event) => updateLink(index, { url: event.target.value })}
                placeholder="https://example.com"
                aria-label="URI"
              />
              <Input
                value={link.label}
                onChange={(event) =>
                  updateLink(index, { label: event.target.value })
                }
                placeholder="라벨"
                aria-label="URI 라벨"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLink(index)}
                aria-label="URI 삭제"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Upload size={14} />
          <span>{isPending ? '저장 중...' : portfolio ? '수정하기' : '생성하기'}</span>
        </Button>
      </div>
    </form>
  )
}
