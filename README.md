# CoreDesk

CoreDesk는 IT/소프트웨어 회사를 위한 사내 ERP 시스템입니다. 프로젝트, 태스크, 일정, 산출물, 메모를 한곳에서 관리해 PM, 개발자, 경영진이 같은 기준으로 업무 현황과 리스크를 확인할 수 있게 합니다.

## 주요 기능

- 인증: Auth.js v5 기반 이메일/비밀번호 로그인, 관리자 계정 생성 스크립트 (회원가입 없음, 계정은 ADMIN이 생성)
- 시스템관리: 사용자관리(ADMIN 전용) — 사용자 생성·수정·비활성화
- 대시보드: 프로젝트 요약, 오늘 마감 태스크, 마감 위기 배너
- 프로젝트 관리: 프로젝트 생성/수정/삭제, 멤버 역할 관리, 진행률 계산
- 태스크 관리: 상태별 칸반 보드, 목록 뷰, 담당자/우선순위/마감일 관리
- 마일스톤: 시작일/마감일 기반 일정 관리, WBS 타임라인
- 프로젝트 정보: URL, 서버 계정, DB 접속 정보 저장 및 민감 정보 암호화
- 포트폴리오: 프로젝트 산출물, 기술 스택, 링크, 이미지 관리
- 메모: 개인 메모 작성, 마크다운 미리보기, 프로젝트 연결
- 드라이브: 폴더/파일 업로드, 미리보기, 포트폴리오 이미지 연동

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Next.js App Router |
| UI | React, Tailwind CSS, shadcn/ui, lucide-react |
| 언어 | TypeScript strict |
| 인증 | Auth.js v5 |
| ORM/DB | Prisma, PostgreSQL |
| 폼/검증 | react-hook-form, Zod |
| 테스트 | Node.js test runner |
| 배포 | Docker, Docker Compose |

현재 정확한 패키지 버전은 [package.json](./package.json)을 기준으로 확인하세요.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 준비

```bash
cp .env.example .env
```

로컬 개발용 기본값은 `.env.example`을 참고합니다. `NEXTAUTH_SECRET`와 `FIELD_ENCRYPTION_KEY`는 서로 다른 32바이트 이상 난수로 설정하세요.

```bash
openssl rand -base64 32
```

`FIELD_ENCRYPTION_KEY`는 프로젝트 URL/계정/DB 비밀번호 암호화에 사용되므로 운영 중 변경하면 기존 값을 복호화할 수 없습니다.

### 3. DB 실행

개발 환경에서 DB(MySQL)만 Docker로 실행하려면:

```bash
docker compose up -d db
```

이때 `.env`의 `DATABASE_URL`은 `mysql://coredesk:coredesk@localhost:3306/coredesk`로 설정합니다.

### 4. Prisma 마이그레이션 및 시드

```bash
npx prisma db push
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 관리자 계정 생성

마이그레이션 이후 관리자 계정을 생성하거나 기존 계정을 관리자로 승격할 수 있습니다.

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='replace-with-strong-admin-password' \
ADMIN_NAME='최고관리자' \
npm run admin:create
```

운영 환경에서는 관리자 생성 후 비밀번호를 `.env`에 남기지 않습니다.

## 자주 쓰는 명령어

```bash
npm run dev              # 개발 서버 실행
npm run build            # 프로덕션 빌드
npm run start            # 빌드 결과 실행
npm run lint             # ESLint 검사
npm run test             # 테스트 실행
npm run db:seed          # 시드 데이터 삽입
npm run admin:create     # 관리자 계정 생성/승격
npm run secrets:encrypt  # 기존 민감 정보 암호화
```

## Docker 실행

`docker-compose.yml`은 개발용입니다. DB와 개발 서버(`next dev`)를 함께 띄웁니다.

```bash
docker compose up -d              # db + app 실행
docker compose logs -f app        # 기동 로그 (첫 실행은 npm install로 몇 분 걸림)
docker compose exec app npm run db:seed   # 시드 데이터 삽입
docker compose down               # 중지 (데이터 유지)
docker compose down -v            # 중지 + DB/node_modules 볼륨 삭제
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

| 서비스 | 내용 |
| --- | --- |
| `db` | MySQL 8.4, `localhost:3306`, 계정 `coredesk` / `coredesk`(로컬 전용), 데이터는 `mysql_data` 볼륨 |
| `app` | `node:22`, 소스를 bind mount해 핫리로드, 시작 시 `npm install` → `prisma db push` → `prisma generate` → `npm run dev` |

- `.env`는 `env_file`로 읽고 `DATABASE_URL`, `NEXTAUTH_URL`은 compose에서 로컬 값으로 덮어씁니다. `.env`가 다른 DB를 가리켜도 개발 컨테이너는 로컬 `db`에 연결됩니다.
- `node_modules`는 `node_modules` 볼륨으로 분리합니다. 호스트(macOS)용 sharp/prisma 바이너리와 섞이지 않게 하기 위해서입니다. 의존성이 꼬이면 `docker compose down -v` 후 다시 실행합니다.
- `prisma/migrations/`는 PostgreSQL SQL이라 MySQL에 `migrate deploy`를 쓸 수 없어 `db push`로 스키마를 맞춥니다.

자세한 운영 절차는 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)를 참고하세요.

## 프로젝트 구조

```text
src/
├── app/
│   ├── (auth)/                 # 로그인
│   ├── (modules)/              # 인증 후 사용하는 ERP 모듈
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── portfolios/
│   │   ├── memos/
│   │   └── drive/
│   └── api/                    # Auth.js, 파일 다운로드 API
├── components/
│   ├── layout/                 # 사이드바, 헤더
│   └── ui/                     # shadcn/ui 기반 공통 컴포넌트
├── config/                     # 내비게이션 설정
├── lib/                        # Prisma, 인증, 도메인 유틸
├── middleware.ts               # 인증 라우트 보호
└── types/                      # 공유 타입

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

tests/
└── *.test.cjs
```

## 개발 규칙

- Prisma Client는 Server Component, Server Action, Route Handler에서만 사용합니다.
- 데이터 생성/수정/삭제는 Server Actions를 우선 사용합니다.
- Client Component는 폼, 드롭다운, 모달, 상태 토글처럼 인터랙션이 필요한 곳에만 둡니다.
- 필터 상태는 가능한 URL 파라미터로 관리하고 전역 상태 라이브러리는 추가하지 않습니다.
- 새 기능은 테스트를 먼저 작성하고 구현합니다.
- 커밋 메시지는 conventional commits 형식을 사용합니다. 예: `feat: add project dashboard`

## 참고 문서

- [docs/PRD.md](./docs/PRD.md): 제품 목표, 사용자 스토리, 핵심 플로우
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): 아키텍처 규칙, 데이터 모델, 디렉토리 구조
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md): Docker 기반 운영 서버 실행 절차
- [DESIGN.md](./DESIGN.md): UI/UX 디자인 가이드
