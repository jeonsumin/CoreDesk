import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileType,
  File as FileIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 파일 유형별 아이콘과 색. 카드 썸네일과 미리보기 헤더에서 같이 쓴다
export function FileTypeIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith('image/'))
    return <FileImage className={cn('text-green-500', className)} />
  if (mime.startsWith('video/'))
    return <FileVideo className={cn('text-teal-500', className)} />
  if (mime.startsWith('audio/'))
    return <FileAudio className={cn('text-pink-500', className)} />
  if (mime === 'application/pdf')
    return <FileType className={cn('text-red-500', className)} />
  if (mime.startsWith('text/'))
    return <FileText className={cn('text-blue-500', className)} />
  return <FileIcon className={cn('text-muted-foreground', className)} />
}
