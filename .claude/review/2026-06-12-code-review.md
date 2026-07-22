# Code Review — 2026-06-12

> **대상:** `git diff origin/main..HEAD`
> **기준:** coding-standards
> **브랜치:** `master` (origin/main 대비 6 커밋 앞)

---

## 전체 평가

포트폴리오 공개 기능과 외부 API를 안정적으로 추가했다. CORS 및 인증 미들웨어 분리는 올바르게 처리됐으나, 클라이언트 사이드에서 공개 URL을 생성하는 로직이 방금 API에서 수정한 localhost 문제를 그대로 가지고 있다.

---

## 잘 된 부분

- `middleware.ts` matcher로 `/api/*` 전체를 미들웨어 밖에 두고, `/portfolio/*` 만 별도 `isPublicPage` 예외 처리 — 인증 로직이 깔끔하게 분리됨
- `togglePortfolioPublic` Server Action에서 `ownerId` 검증 후 토글 처리 — 권한 체크 누락 없음
- `images/[id]/route.ts`에서 이미지 접근 전 `isPublic` 포트폴리오 소속 여부를 검증해 비공개 파일 노출 방지
- `revalidatePath`를 `/portfolios`, `/portfolios/${id}`, `/portfolio/${id}` 세 경로 모두 호출 — 공개/비공개 전환 시 캐시 일관성 유지

---

## 이슈 목록

### 🟠 Major

#### 1. 공개 URL 복사가 `window.location.origin` 기반 — localhost 문제 재발

**파일:** `src/app/(modules)/portfolios/_components/PortfolioPublicToggle.tsx:35`

```ts
// Before (현재 코드)
const url = `${window.location.origin}/portfolio/${id}`
```

관리자가 서버 내부(`http://localhost:3000`)에서 앱에 접근하면 복사된 URL도 `http://localhost:3000/portfolio/...`가 된다. API 이미지 URL에서 방금 수정한 것과 동일한 문제다.

클라이언트 컴포넌트이므로 `process.env.NEXTAUTH_URL`을 직접 쓸 수 없다. 두 가지 해결책:

**방법 A — `NEXT_PUBLIC_APP_URL` 환경변수 추가 (권장)**
```ts
// .env
NEXT_PUBLIC_APP_URL="https://your-domain.com"

// PortfolioPublicToggle.tsx
const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
const url = `${base}/portfolio/${id}`
```

**방법 B — 서버 컴포넌트에서 publicUrl prop으로 전달**
```tsx
// portfolios/[id]/page.tsx (Server Component)
const publicUrl = `${process.env.NEXTAUTH_URL ?? ''}/portfolio/${portfolio.id}`

<PortfolioPublicToggle id={portfolio.id} isPublic={portfolio.isPublic} publicUrl={publicUrl} />
```

---

#### 2. `<img>` 태그 직접 사용 — 이미지 최적화 누락

**파일:** `src/app/portfolio/[id]/page.tsx:76`, `src/app/portfolio/[id]/page.tsx:101`

공개 포트폴리오 페이지는 외부 사용자가 접근하는 퍼블릭 페이지다. `eslint-disable` 주석으로 Next.js 경고를 억제하고 `<img>`를 그대로 사용하고 있어 자동 WebP 변환, 크기 최적화, 지연 로딩이 모두 빠진다.

`/api/portfolio/images/[id]`는 내부 라우트이므로 `next/image`의 `remotePatterns`에 등록할 필요 없이 상대 경로로 바로 사용 가능하다.

```tsx
// Before
// eslint-disable-next-line @next/next/no-img-element
<img
  src={publicImageUrl(portfolio.thumbnailFile.id)}
  alt={`${portfolio.title} 썸네일`}
  className="h-full w-full object-cover"
/>

// After
import Image from 'next/image'

<Image
  src={publicImageUrl(portfolio.thumbnailFile.id)}
  alt={`${portfolio.title} 썸네일`}
  fill
  className="object-cover"
/>
```

스크린샷 그리드(`portfolio.images.map`)도 동일하게 적용 필요.

---

### 🟡 Minor

#### 3. `images/[id]/route.ts` — 두 번의 순차 DB 조회를 OR 쿼리로 통합 가능

**파일:** `src/app/api/portfolio/images/[id]/route.ts:18-33`

현재 `portfolioByImage`가 없을 때만 `portfolioByThumbnail`을 조회하는 단락 평가 방식이지만, 단일 OR 쿼리가 더 직관적이다.

```ts
// Before
const portfolioByImage = await prisma.portfolio.findFirst({ where: { isPublic: true, images: { some: { fileId: id } } } })
const portfolioByThumbnail = portfolioByImage
  ? null
  : await prisma.portfolio.findFirst({ where: { isPublic: true, thumbnailFileId: id } })
if (!portfolioByImage && !portfolioByThumbnail) { ... }

// After
const portfolio = await prisma.portfolio.findFirst({
  where: {
    isPublic: true,
    OR: [
      { thumbnailFileId: id },
      { images: { some: { fileId: id } } },
    ],
  },
  select: { id: true },
})
if (!portfolio) return new NextResponse('Not Found', { status: 404 })
```

#### 4. CLAUDE.md 규칙 — `images/[id]/route.ts` 코드 설명 주석

**파일:** `src/app/api/portfolio/images/[id]/route.ts:17`

```ts
// Check if this file belongs to a public portfolio (as image or thumbnail)
```

코드 자체로 의도가 명확하므로 제거 대상.

---

## 우선순위별 액션 아이템

| 우선순위 | # | 파일 | 이슈 |
|---------|---|------|------|
| P0 | 1 | `PortfolioPublicToggle.tsx:35` | URL 복사 시 `window.location.origin` → `NEXT_PUBLIC_APP_URL` |
| P1 | 2 | `portfolio/[id]/page.tsx:76,101` | `<img>` → `next/image` |
| P2 | 3 | `images/[id]/route.ts:18-33` | 순차 쿼리 → 단일 OR 쿼리 |
| P2 | 4 | `images/[id]/route.ts:17` | 코드 설명 주석 제거 |
