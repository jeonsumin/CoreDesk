# Code Review — 2026-06-11

> **대상:** `git diff HEAD` (unstaged — 커밋 전 변경사항)
> **기준:** coding-standards
> **브랜치:** `master`
> **범위:** 수정 5개 파일 + 신규 3개 파일 (Portfolio isPublic 공개 기능)

---

## 전체 평가

포트폴리오 공개 토글 및 CDN 이미지 API 구현이 전반적으로 깔끔하다. Server Action 패턴, 인증 분리, 캐시 전략이 프로젝트 아키텍처 규칙을 잘 따르고 있다. 단, 공개 상태 전환 시 공개 페이지 캐시 무효화 누락과 `migration_lock.toml` 수동 편집 이력이 확인됐다.

---

## 잘 된 부분

- **보안 이중 체크** — 이미지 API(`/api/portfolio/images/[id]`)에서 `PortfolioImage` 소속 여부와 `thumbnailFileId` 두 경로를 모두 확인하며, `isPublic: false`면 404 반환. 인증 없는 엔드포인트로서 적절한 보호.
- **조건부 쿼리 최적화** — 썸네일 쿼리는 이미지 쿼리가 실패했을 때만 실행 (`portfolioByImage ? null : findFirst(...)`) — 불필요한 DB 왕복 제거.
- **`useTransition` 활용** — 토글 버튼이 pending 중 disabled 처리되어 중복 요청 방지.
- **미들웨어 최소 변경** — `/portfolio/` 경로만 추가해 기존 인증 로직을 건드리지 않음.
- **`Cache-Control: public`** — 공개 이미지 API에 1시간 브라우저 캐시 적용, CDN 친화적.

---

## 이슈 목록

### 🟠 Major

#### 1. `migration_lock.toml` 수동 편집 — 마이그레이션 히스토리 불일치 위험

`prisma/migrations/migration_lock.toml`

Prisma가 "수동 편집 금지"를 명시한 파일을 직접 수정했다. 기존 마이그레이션 SQL이 PostgreSQL 문법으로 작성돼 있다면 provider 불일치로 `prisma migrate` 계열 명령이 비정상 동작할 수 있다.

```toml
# before
provider = "postgresql"
# after (수동 변경)
provider = "mysql"
```

**확인 방법:** `prisma/migrations/` 폴더 내 SQL 파일들이 MySQL 문법으로 작성됐는지 검토. schema.prisma의 provider가 이미 `mysql`이므로, lock 파일 불일치가 사전 버그였다면 현재 수정 방향은 맞다. 단, migrations/ 폴더에 PostgreSQL 전용 SQL(`CREATE INDEX CONCURRENTLY`, `SERIAL` 등)이 있으면 지금 정리 필요.

---

### 🟡 Minor

#### 2. 미요청 스키마 변경 — `Memo.content @db.Text`

`prisma/schema.prisma:218`

포트폴리오 기능과 무관한 `Memo.content` 컬럼 타입이 변경됐다. 기능 요청에 없던 변경이므로 의도 여부를 확인해야 한다. (MySQL VARCHAR 191자 한도 문제를 해결하는 유효한 수정이긴 하다.)

```prisma
# before
content   String
# after
content   String   @db.Text
```

**권고:** 별도 커밋으로 분리해 이유를 commit message에 기록. 현재 diff에 묶이면 변경 목적이 불분명해짐.

---

#### 3. 공개 페이지 캐시 미무효화 — `togglePortfolioPublic`

`src/app/(modules)/portfolios/_actions/portfolio.ts:257`

`isPublic` 변경 시 ERP 내부 경로(`/portfolios/${id}`, `/portfolios`)만 revalidate하고, 공개 페이지(`/portfolio/${id}`)는 누락됐다. 포트폴리오를 비공개로 전환해도 공개 페이지가 Next.js 캐시에 남아 있을 수 있다.

```ts
// before (현재)
revalidatePath(`/portfolios/${id}`)
revalidatePath('/portfolios')

// after (권고)
revalidatePath(`/portfolios/${id}`)
revalidatePath('/portfolios')
revalidatePath(`/portfolio/${id}`)   // 공개 페이지 캐시도 무효화
```

---

#### 4. 불필요한 optional chaining — `PortfolioPublicToggle`

`src/app/(modules)/portfolios/_components/PortfolioPublicToggle.tsx:21`

`togglePortfolioPublic`의 반환 타입은 `Promise<ActionResult>`로 undefined가 될 수 없다. `result?.error`의 `?`는 불필요.

```ts
// before
if (result?.error) {
// after
if (result.error) {
```

---

#### 5. 공개 페이지 이중 DB 쿼리 — `generateMetadata` + 페이지 컴포넌트

`src/app/portfolio/[id]/page.tsx:17-44`

`generateMetadata`와 `PublicPortfolioPage`가 같은 `{ id, isPublic: true }` 조건으로 각각 DB를 조회한다. Next.js 15 fetch 캐시는 `prisma` 직접 호출에 적용되지 않아 실제로 쿼리가 2번 실행된다.

```ts
// 권고: unstable_cache 또는 별도 fetch 함수로 dedup
import { cache } from 'react'

const getPublicPortfolio = cache(async (id: string) => {
  return prisma.portfolio.findFirst({
    where: { id, isPublic: true },
    include: { thumbnailFile: true, links: ..., images: ... },
  })
})
```

---

## 우선순위별 액션 아이템

| 우선순위 | # | 파일 | 이슈 |
|---------|---|------|------|
| P0 | 1 | `prisma/migrations/migration_lock.toml` | 기존 마이그레이션 SQL이 MySQL 문법인지 검토 |
| P1 | 3 | `_actions/portfolio.ts` | `revalidatePath('/portfolio/${id}')` 추가 |
| P2 | 2 | `schema.prisma` | Memo.content 변경을 별도 커밋으로 분리 |
| P2 | 4 | `PortfolioPublicToggle.tsx` | `result?.error` → `result.error` |
| P2 | 5 | `portfolio/[id]/page.tsx` | `react.cache`로 DB 쿼리 dedup |
