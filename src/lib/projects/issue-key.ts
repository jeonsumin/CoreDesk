// 프로젝트 키: 영문 대문자로 시작, 영문/숫자/하이픈 2~20자, 하이픈으로 끝나지 않음 (예: BB-CIC-WEB)
const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9-]{0,18}[A-Z0-9]$/

export function normalizeProjectKey(raw: string): string | null {
  const key = raw.trim().toUpperCase()
  return PROJECT_KEY_PATTERN.test(key) ? key : null
}

export function formatIssueKey(projectKey: string | null, number: number | null): string | null {
  return projectKey && number ? `${projectKey}-${number}` : null
}
