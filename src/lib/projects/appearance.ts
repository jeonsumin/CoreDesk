// 프로젝트 아이콘 사각형 색. 프로젝트에 색 필드가 없어 id 해시로 고정 배정한다
const PROJECT_COLORS = [
  'bg-lime-500',
  'bg-blue-600',
  'bg-violet-600',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
] as const

export function projectColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

export const projectStatusLabel: Record<string, string> = {
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  ON_HOLD: '보류',
  CANCELLED: '취소',
}
