# CoreDesk 디자인 가이드

새 페이지나 모듈을 만들 때 이 문서를 먼저 읽는다. 기준 시안은 `docs/erp_design/*.html`(정적 캡처, `python3 -m http.server`로 열어 볼 수 있음)이고, 이 문서는 그 시안을 우리 코드의 컴포넌트와 규칙으로 옮긴 것이다.

## 1. 무드

- **차분한 업무 도구.** 흰 바탕, 옅은 회색 테두리, 하나의 보라색. 장식보다 정보가 먼저 보인다.
- **보라는 "지금 선택된 것"과 "주 행동"에만.** 활성 탭, 활성 메뉴, 주 버튼, 진행률 막대, 링크. 그 외에는 회색 계열로 둔다.
- **의미 색은 숫자와 배지에만.** 진행 중=파랑, 주의·임박=주황, 위험·초과=빨강, 완료=초록. 넓은 면을 칠하지 않는다.
- **둥근 패널 안에 정리.** 페이지는 큰 제목 아래 1~2개의 둥근 패널로 나뉘고, 패널 안은 구분선으로 나눈다. 패널 안에 또 테두리 박스를 겹치지 않는다.

## 2. 토큰

`src/app/globals.css`의 CSS 변수가 유일한 출처다. 컴포넌트에서 hex 값을 직접 쓰지 않고 Tailwind 토큰 클래스를 쓴다.

| 토큰 | 값 | Tailwind | 쓰는 곳 |
|---|---|---|---|
| primary | `#6e2177` | `bg-primary` `text-primary` | 활성 탭·메뉴, 주 버튼, 진행률, 링크 |
| primary 옅은 면 | primary 10~15% | `bg-primary/10` `bg-sidebar-accent` | 선택된 목록 항목 배경, 진행률 트랙 |
| foreground | `#030712` | `text-foreground` | 본문, 제목 |
| muted-foreground | `#6b7280` | `text-muted-foreground` | 보조 문구, 라벨, 메타 정보 |
| muted | `#f3f4f6` | `bg-muted` | 세그먼트 탭 트랙, 개수 배지, 보조 면 |
| border | `#e5e7eb` | `border` (기본) | 패널 테두리, 구분선, 입력창 |
| destructive | `#ef4444` | `text-destructive` `variant="destructive"` | 삭제, 오류 |
| radius | `0.65rem` | `rounded-lg`(버튼·입력) `rounded-xl`(패널·카드) | |

의미 색 (Tailwind 기본 팔레트를 그대로 쓴다):

| 의미 | 숫자/텍스트 | 배지 |
|---|---|---|
| 진행 중 | `text-blue-600` | `bg-blue-50 text-blue-700` |
| 주의 (D-7 이하, 처리 필요) | `text-orange-500` | `bg-orange-50 text-orange-600 border-orange-200` |
| 위험 (초과, 리스크) | `text-red-500` | `bg-red-50 text-red-600 border-red-200` |
| 완료 | `text-green-500` | `bg-green-50 text-green-700` |

프로젝트처럼 목록 항목을 구분하는 색은 `projectColor(id)`(`src/lib/projects/appearance.ts`)로 id마다 고정 배정한다.

## 3. 타이포그래피

Pretendard Variable 하나만 쓴다. 기본 본문은 14px.

| 역할 | 클래스 |
|---|---|
| 페이지 제목 (`PageHeader`) | `text-3xl font-bold` |
| 패널 안 대상 이름 (프로젝트명 등) | `text-xl font-bold` |
| 패널 제목 (`PanelHeader`) | `text-sm font-semibold` |
| 폼 섹션 제목 | `text-base font-semibold` |
| 본문 | `text-sm` |
| 메타·보조 | `text-xs text-muted-foreground` |
| 큰 숫자 (`StatCard`) | `text-2xl font-bold tabular-nums` |

라벨을 대문자 변환하거나 자간을 벌리지 않는다. 숫자가 세로로 정렬되어야 하면 `tabular-nums`.

## 4. 레이아웃

### 앱 셸 (`src/app/(modules)/layout.tsx`)

shadcn/ui [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar)(`src/components/ui/sidebar.tsx`)를 그대로 쓴다. 조립은 `src/components/layout/AppSidebar.tsx`.

```
┌ Sidebar 16rem ─────┐ ┌ SidebarInset ──────────────────────────────┐
│ [C] CoreDesk       │ │ [≡] │ 프로젝트 관리      ← 트리거 + 현재 메뉴  │
│     사내 업무 관리   │ │                                            │
│ 업무               │ │ 페이지 영역 (각 모듈의 page/layout)          │
│  ▣ 대시보드         │ │                                            │
│  ▣ 프로젝트 관리 ◀  │ │                                            │
│ 자료               │ │                                            │
│  ▣ 포트폴리오 관리   │ │                                            │
│  ▣ 메모            │ │                                            │
│  ▣ 드라이브         │ │                                            │
│ 관리 (ADMIN만)      │ │                                            │
│  ▣ 시스템관리   ›   │ │                                            │
│     사용자관리       │ │                                            │
│ ────────────────── │ │                                            │
│ [김] 김지훈  ⇅      │ │                                            │
│      이메일         │ │                                            │
└────────────────────┘ └────────────────────────────────────────────┘
```

- `collapsible="icon"`: 트리거(또는 `⌘/Ctrl+B`, 사이드바 가장자리 레일 클릭)로 3rem 아이콘 모드로 접힌다. 접힘 상태는 `sidebar_state` 쿠키로 유지된다. 아이콘 모드에서는 `tooltip`으로 메뉴 이름을 보여준다.
- `md` 미만에서는 자동으로 왼쪽에서 열리는 시트가 된다.
- 헤더: 로고 + 서비스명. 본문: 그룹 라벨(업무, 자료)별 메뉴. 활성 메뉴는 `isActive`(옅은 보라 배경 + 보라 글자). 푸터: 사용자 드롭다운(로그아웃).
- 메뉴 추가는 `src/config/nav.ts`에 `{ title, href, icon, group }` 한 줄. 그룹은 업무 / 자료 / 관리이며, 새 그룹이 필요하면 `NavGroup` 타입과 `AppSidebar`의 `GROUPS`에 추가한다.
- 관리자 전용 메뉴는 `adminOnly: true`. ADMIN이 아니면 메뉴와 그룹 라벨이 함께 숨겨진다(페이지 접근 차단은 해당 모듈 `layout.tsx`에서 따로 한다).
- 하위 메뉴는 `children`(예: 시스템관리 > 사용자관리). 펼친 상태에서는 `SidebarMenuSub`로 접고 펴고, 아이콘 모드에서는 첫 하위 메뉴로 바로 이동한다.
- `components/ui/sidebar.tsx`는 수정하지 않는다. 동작을 바꿀 일은 `AppSidebar`에서 `className`으로 처리한다. 예: 아이콘 모드에서 숨은 그룹 라벨이 클릭을 가로채지 않도록 `group-data-[collapsible=icon]:pointer-events-none`.
- 사이드바 색은 `--sidebar*` 토큰(`globals.css`)을 따른다. 배경 `#fafafa`, 활성 `--sidebar-accent`(옅은 보라).

### 패턴 A: 목록 + 상세 (프로젝트, 포트폴리오, 메모)

시안 `dashboard.html` `board.html`의 구조. 모듈 `layout.tsx`에서 제목과 좌측 목록을 그리고, 하위 page는 우측 패널만 그린다.

```
[제목]  [세그먼트 탭: 상태 필터]                         [+ 아이콘 버튼]

┌ 목록 패널 w-72 ─────┐ ┌ 본문 Panel flex-1 ─────────────────────────┐
│ ▣ 프로젝트 [3]       │ │ 대상 헤더: 아이콘, 이름, 배지, 메타, 액션    │
│ [🔍 검색...       ]  │ ├────────────────────────────────────────────┤
├─────────────────────┤ │                                            │
│ ■ 선택된 항목   ⌄   │ │ 내용 (보드, 목록, 폼...)                     │
│   │ ▌하위 메뉴      │ │                                            │
│   │  하위 메뉴      │ │                                            │
│ ■ 다른 항목     ›   │ │                                            │
└─────────────────────┘ └────────────────────────────────────────────┘
```

- 좌측 목록은 `lg` 미만에서 숨긴다(`hidden lg:flex`). 그때 하위 메뉴는 본문 패널 상단의 `SegmentedTabs size="sm"`(`lg:hidden`)로 대체한다.
- 선택된 항목: `bg-sidebar-accent`, 이름 `text-primary`. 하위 메뉴의 활성 항목은 `bg-primary text-primary-foreground`.
- 상태 필터는 URL 파라미터(`?status=`)로 유지한다. 전역 상태 라이브러리 금지(CLAUDE.md).
- 기준 구현: `src/app/(modules)/projects/layout.tsx`, `_components/ProjectListPanel.tsx`.

### 패턴 B: 단일 패널 (드라이브, 내 태스크)

```
[제목]  [세그먼트 탭]                                   [주 액션]
┌ Panel ─────────────────────────────────────────────────────────┐
│ PanelToolbar: [+] [↻] 경로/필터 ...                    [보기 전환] │
├────────────────────────────────────────────────────────────────┤
│ 내용                                                            │
└────────────────────────────────────────────────────────────────┘
```

### 패턴 B-1: 타임라인 (마일스톤)

시안 `timeline.html`. 기준 구현: `projects/[id]/milestones/_components/WbsTimeline.tsx`.

```
[+] [↻] 0/3 완료 [지연 1]                 [🔍+] [월 › 주 › 일] [🔍-] [오늘]
┌ 좌측 목록 380px (가로 스크롤 시 고정) ┐┌ 2026년 6월 ─────────────────────┐
│ ⚑ 마일스톤 [3]   [전체|진행 중|완료] ││ 3주          │ 4주              │
│   마일스톤          D-Day   상태     ││ 15 16 17 18 …                    │
├─────────────────────────────────────┤├──────────────────────────────────┤
│ ○ M-01 기획 확정     D-3   [진행]    ││   ███ 기획 확정 ███              │
│ ○ M-02 MVP 릴리즈    D+2 초과 [지연] ││            ◆                     │
│ + 새 마일스톤                        ││  (드래그로 기간 지정)              │
└─────────────────────────────────────┘└──────────────────────────────────┘
```

- 확대/축소는 일 → 주 → 월. 눈금 표시(`월 › 주 › 일`)에서 현재 보이는 단위만 옅은 보라로 칠한다.
- 헤더 높이는 고정(84px)이고, 보이는 눈금 줄이 높이를 나눠 갖는다. 달 이름은 가로 스크롤해도 보이도록 sticky.
- 막대 색: 진행 파랑, 완료 초록, 임박 주황, 지연 빨강, 예정은 옅은 보라 바탕에 보라 글자. 하루짜리는 마름모.
- 오늘 열은 옅은 보라 배경 + 세로선, 일 눈금에서는 날짜 숫자를 보라 칩으로 표시한다.

### 패턴 C: 대시보드

`PageHeader` → (배너) → `StatCard` 4열 → 2열 패널(`Panel` + `PanelHeader`). 기준: `src/app/(modules)/dashboard/page.tsx`.

### 패턴 D: 생성·수정 폼

시안 `project-edit.html` `issue-edit.html`의 다이얼로그 폼을 우측 패널 안에 둔다. 라우트(`/new`, `/edit`)는 유지한다.

```
┌ FormPanel ─────────────────────────────────────┐
│ ▣ 새 프로젝트 만들기                              │
├────────────────────────────────────────────────┤
│        안내 문구 (선택)                           │
│        라벨 *                                    │
│        [입력                              ]      │
│        [시작일      ] [마감일      ]   ← 2열 그리드 │
│        ────────────────────────────────         │
│                              [취소] [만들기]     │
└────────────────────────────────────────────────┘
          max-w-2xl 가운데 정렬
```

- `FormPanel` 안에 `FormSection`으로 주제를 나눈다. 폼 하단은 `FormActions`(취소 링크 + 주 버튼, 우측 정렬).
- 주 버튼 문구는 결과를 말한다: "프로젝트 만들기", "변경사항 저장". "제출", "확인" 금지.
- 모달이 필요한 짧은 입력(태스크 추가 등)은 `components/ui/dialog`를 쓰고 같은 폼 규칙을 따른다.

## 5. 공용 컴포넌트

모두 `src/components/layout/`, `src/components/form/`에 있다. 새 화면은 이것부터 조합한다.

| 컴포넌트 | 용도 |
|---|---|
| `PageHeader({ title, tabs?, actions? })` | 페이지 최상단. 제목 `text-3xl` + 탭 + 우측 액션 |
| `SegmentedTabs({ items, activeKey, size? })` | 회색 트랙 위 알약형 링크 탭. 상태 필터, 보기 전환 |
| `Panel` | 둥근 흰 패널. 좌측 목록과 우측 본문 모두 |
| `PanelHeader({ icon, title, count?, actions? })` | 패널 상단 줄. 아이콘은 보라 |
| `PanelToolbar` | 패널 상단 아이콘 버튼 줄 |
| `CountBadge` | 제목 옆 회색 개수 배지 |
| `EmptyState({ icon, title, description?, action? })` | 빈 상태. 반드시 다음 행동 버튼을 넣는다 |
| `StatCard({ icon, label, value, meta?, tone? })` | 아이콘+라벨 좌상단, 큰 숫자 우측. tone으로 숫자 색 |
| `ProgressBar({ value })` | 보라 진행 막대, 옅은 보라 트랙 |
| `FormPanel({ icon, title, description?, wide? })` / `FormSection` | 생성·수정 화면. 에디터처럼 넓은 입력은 `wide` |
| `FormActions({ submitLabel, cancelHref?, isPending? })` | 폼 하단 버튼 줄 |

`src/components/ui/`(shadcn)는 수정하지 않는다. 크기나 색 조정은 사용하는 쪽에서 `className`으로 한다.

## 6. 세부 규칙

**버튼**
- 주 행동 1개만 `variant="default"`(보라). 나머지는 `outline` 또는 `ghost`.
- `Link`에 `buttonVariants()`를 직접 쓸 때는 `cn(buttonVariants(...))`로 감싼다. 감싸지 않으면 기본 `border-transparent`가 이겨 `outline` 테두리가 사라진다.
- 툴바·헤더의 아이콘 전용 버튼은 `size="icon"` / `"icon-lg"`, 반드시 `aria-label`과 `title`.
- 삭제는 `variant="destructive"`.

**목록 행** (시안 `backlog.html`)
- 행 높이 52~56px, 행 사이 `border-b`, 호버 `hover:bg-muted/50`.
- 왼쪽부터: 유형 아이콘 → 식별자(회색) → 제목 → (오른쪽) 배지, 우선순위, 담당자 아바타.

**카드** (시안 `list.html`, `board.html`)
- `rounded-xl border bg-card p-4 shadow-sm`, 호버 시 `hover:shadow-md`.
- 카드 안의 보조 수치는 `rounded-lg bg-muted/60` 작은 칸으로 묶는다.

**배지**
- 상태 배지: 테두리형 `rounded-md border px-2 py-0.5 text-xs font-semibold` + 의미 색.
- 개수 배지: `CountBadge`.
- 연결 태그(에픽, 프로젝트 등): `rounded-full border border-primary/40 text-primary px-2 text-xs`.

**입력**
- 라벨은 입력 위, `font-semibold`. 필수는 라벨 끝에 ` *`.
- 검색 입력은 왼쪽에 `Search` 아이콘(`pl-9`).
- Select에는 값이 아니라 사람이 읽는 라벨이 보여야 한다(`all` 같은 내부 값 노출 금지).

**아바타**
- 이니셜 원형. 기본 `bg-primary/10 text-primary`. 미배정은 점선 테두리 + 사람 아이콘.

**D-day 배지** (CLAUDE.md UX 규칙)
- D-3 이하 주황, 초과는 빨강 + "D+N 초과".

**빈 상태와 권한** (CLAUDE.md UX 규칙)
- 빈 목록은 `EmptyState` + CTA.
- Viewer에게는 수정·삭제 버튼을 숨긴다(비활성 아님).

**모션**
- 색·그림자 전환(`transition-colors`, `transition-shadow`)만. 진입 애니메이션을 넣지 않는다.

## 7. 새 페이지 체크리스트

1. 어떤 패턴(A 목록+상세 / B 단일 패널 / C 대시보드 / D 폼)인가?
2. `PageHeader`로 제목을 그렸는가? (패턴 A는 모듈 `layout.tsx`에서 한 번)
3. 본문은 `Panel` 안에 있는가? 패널 안에 또 테두리 박스를 겹치지 않았는가?
4. 색은 토큰 클래스만 썼는가? 보라는 활성/주 행동에만 썼는가?
5. 빈 상태에 CTA가 있는가? Viewer에게 수정 버튼이 숨겨지는가?
6. 아이콘 버튼에 `aria-label`이 있는가? `lg` 미만에서 레이아웃이 깨지지 않는가?
7. 새 모듈이면 `src/config/nav.ts`에 메뉴(`group` 포함)를 추가했는가?
