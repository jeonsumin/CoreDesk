# Code Review — 2026-06-11

> **대상:** 신규 파일 (untracked → intent-to-add)
> **기준:** coding-standards
> **브랜치:** `master`
> **파일:** `src/app/api/portfolio/route.ts`, `src/app/api/portfolio/[id]/route.ts`

---

## 전체 평가

포트폴리오 목록·상세 API가 간결하고 기존 코드베이스 패턴(Next.js 15 `params` await, Prisma `select` 최소화)을 잘 따르고 있다. 다만 Prisma `Json` 타입을 런타임 검증 없이 `as string[]`로 단순 캐스팅하는 부분이 타입 안전성을 깨뜨린다.

---

## 잘 된 부분

- `params`를 `Promise<{ id: string }>` 패턴으로 올바르게 await — Next.js 15 요구사항 준수
- `select`로 필요한 컬럼만 조회 — 과잉 fetch 없음
- `isPublic: true` 필터를 두 엔드포인트 모두에 적용
- 디테일 라우트에서 404 처리 명확
- 이미지 URL을 `/api/portfolio/images/{id}` 패턴으로 일관되게 구성

---

## 이슈 목록

### 🔴 Critical

#### 1. `techSpecs as string[]` — Prisma Json 타입 unsafe 캐스팅

**파일:** `src/app/api/portfolio/route.ts:22`, `src/app/api/portfolio/[id]/route.ts:42`

Prisma `Json` 필드는 런타임에서 어떤 JSON 값이든 될 수 있다 (`object`, `number`, `null` 등). TypeScript 컴파일러는 이 캐스팅을 허용하지만, DB에 배열이 아닌 값이 저장되어 있으면 `Array.prototype.map` 등을 호출할 때 런타임 TypeError가 발생한다.

```ts
// ❌ Before — 런타임 안전성 없음
tags: p.techSpecs as string[]

// ✅ After — 런타임 검증 포함
tags: parseTags(p.techSpecs)

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string')
}
```

**수정 방법:** 각 파일에 `parseTags` 헬퍼를 추가하고 `as string[]` 캐스팅을 교체한다.

---

### 🟡 Minor

#### 2. 이미지 URL 빌드 로직 중복

**파일:** `route.ts:21`, `[id]/route.ts:44,47`

`${base}/api/portfolio/images/${fileId}` 패턴이 두 파일에 중복된다. 현재 2개 파일이라 허용 가능 수준이지만, 경로 변경 시 양쪽을 모두 수정해야 한다.

```ts
// 공유 헬퍼가 필요하다면:
function imageUrl(base: string, fileId: string) {
  return `${base}/api/portfolio/images/${fileId}`
}
```

이 시점에서 분리 여부는 판단에 맡긴다.

---

## 우선순위별 액션 아이템

| 우선순위 | # | 파일 | 이슈 |
|---------|---|------|------|
| P0 | 1 | `portfolio/route.ts:22`, `portfolio/[id]/route.ts:42` | `as string[]` unsafe 캐스팅 → `parseTags()` 교체 |
| P2 | 2 | 두 파일 | 이미지 URL 빌드 중복 |
