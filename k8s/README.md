# CoreDesk Kubernetes 배포

역할 분리:

- **GitHub Actions** (`.github/workflows/build-image.yml`) — 린트·테스트 후 컨테이너 이미지를 빌드해 GHCR에 푸시한다. 여기까지만 한다.
- **클러스터** — 이 디렉터리의 매니페스트로 서버에서 직접 관리한다. CI가 클러스터에 접근하지 않는다.

서버에 프로젝트 소스를 둘 필요는 없다. 앱 코드는 GHCR 이미지 안에 있고, 서버에는 이 `k8s/` 디렉터리만 있으면 된다.

## 구성

파일명 접두사 숫자는 적용 순서다. kubectl은 디렉터리 안 파일을 알파벳 순으로 적용하므로 네임스페이스가 먼저 생성되도록 맞춰둔 것이다.

| 파일 | 내용 |
|------|------|
| `00-namespace.yaml` | `coredesk` 네임스페이스 |
| `10-configmap.yaml` | 비밀이 아닌 환경변수 (`NEXTAUTH_URL`, `DRIVE_UPLOAD_ROOT` 등) |
| `20-pvc.yaml` | 드라이브 업로드 영속 볼륨 (20Gi, RWO) |
| `30-deployment.yaml` | 앱 Deployment + `prisma migrate deploy` initContainer |
| `40-service.yaml` | ClusterIP 서비스 (3000 → 3000) |
| `optional/secret.example.yaml` | 앱 시크릿 예시 (커밋하지 않음) |
| `optional/mysql.yaml` | 클러스터 내 MySQL StatefulSet — **현재 구성에서는 미사용** (외부 DB 사용) |
| `optional/ingress.yaml` | ingress-nginx용 Ingress (`erp.jeonsoomin.kro.kr`) |
| `optional/service-loadbalancer.yaml` | 호스트 :3000 에 직접 바인딩 (k3s ServiceLB / MetalLB) |
| `optional/service-nodeport.yaml` | LoadBalancer·Ingress 가 없을 때 쓰는 NodePort 서비스 |

## 최초 1회 설정

`kubectl apply -f k8s/` 만으로는 파드가 뜨지 않는다. 시크릿 2개가 먼저 있어야 한다.

```bash
# 0) 네임스페이스
kubectl apply -f k8s/00-namespace.yaml

# 1) GHCR 이미지 풀 시크릿
#    GHCR 패키지가 private 이면 필수다. PAT 은 read:packages 권한만 있으면 된다.
#    (패키지를 public 으로 바꾸면 이 시크릿 없이도 되지만, 30-deployment.yaml 의
#     imagePullSecrets 항목도 함께 지워야 한다.)
kubectl -n coredesk create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=jeonsumin \
  --docker-password='<read:packages PAT>'

# 2) 앱 시크릿 (DATABASE_URL / NEXTAUTH_SECRET / FIELD_ENCRYPTION_KEY)
#    기존 .env 값을 그대로 옮긴다. 값은 레포에 커밋하지 않는다.
kubectl -n coredesk create secret generic coredesk-secrets \
  --from-literal=DATABASE_URL='mysql://terry:<비밀번호>@129.154.212.227:3306/coredesk' \
  --from-literal=NEXTAUTH_SECRET='<기존 .env 값>' \
  --from-literal=FIELD_ENCRYPTION_KEY='<기존 .env 값>'
```

DB는 외부 MySQL(`129.154.212.227:3306`)을 쓰므로 `optional/mysql.yaml`은 적용하지 않는다.

**`localhost` 는 쓸 수 없다.** DB가 k8s 노드와 같은 서버에 있어도 파드 안의 `localhost`는 파드 자신을 가리킨다. 같은 서버라면 노드의 사설 IP(`hostname -I`)를, 다른 서버라면 공인 IP를 쓴다.

MySQL 계정 권한도 확인이 필요하다. 접속 출처가 파드 IP이므로 `terry@localhost` 그랜트만 있으면 실패한다.

```sql
SELECT user, host FROM mysql.user WHERE user = 'terry';
-- host 가 '%' 가 아니면 파드 CIDR(예: '10.42.%') 또는 '%' 로 그랜트를 추가한다
```

`FIELD_ENCRYPTION_KEY`는 프로젝트 URL/계정/DB 비밀번호 복호화 키다. **운영 중 교체하면 기존 데이터를 읽을 수 없다.** 기존 `.env` 값을 그대로 넣는다. `base64:` 접두사가 붙은 값과 순수 base64 32바이트 모두 허용되므로, 기존에 쓰던 문자열을 그대로 옮기면 된다.

3) 외부 노출 방식을 하나 고른다. 서비스 도메인은 `erp.jeonsoomin.kro.kr`, 앱 포트는 3000이다.

```bash
kubectl apply -f k8s/                                # 앱 본체 (ClusterIP 서비스 포함)

# (a) ingress-nginx 가 이미 있는 경우 — 도메인/TLS 를 Ingress 가 처리
kubectl apply -f k8s/optional/ingress.yaml

# (b) 서버 nginx 가 erp.jeonsoomin.kro.kr -> localhost:3000 을 프록시하는 경우 (k3s 권장)
kubectl apply -f k8s/optional/service-loadbalancer.yaml

# (c) 위 둘이 모두 없는 경우 — 30300 으로 열고 서버 nginx 에서 프록시
kubectl apply -f k8s/optional/service-nodeport.yaml
```

(b), (c)는 `40-service.yaml`과 이름이 같은 Service를 덮어쓴다. 나중에 `kubectl apply -f k8s/`를 다시 실행하면 ClusterIP로 되돌아가므로, (b)나 (c)를 쓴다면 `40-service.yaml`의 `type`을 해당 값으로 바꿔두는 편이 안전하다.

`NEXTAUTH_URL`은 `https://erp.jeonsoomin.kro.kr`로 커밋되어 있다. **https로 실제 접속이 가능해야 한다** — 인증서 없이 http로 접속하면 secure 쿠키가 저장되지 않아 로그인이 실패한다. (a)를 골랐다면 `optional/ingress.yaml`의 cert-manager 주석을 해제하거나, 서버 nginx에서 TLS를 종단한다.

## 평소 배포

`master`에 푸시하면 GitHub Actions가 이미지를 GHCR에 올린다. 태그는 두 개다.

- `ghcr.io/jeonsumin/coredesk:sha-<커밋12자>` — 특정 커밋 고정용
- `ghcr.io/jeonsumin/coredesk:latest` — master 최신

Actions 실행 요약(Summary)에 그대로 붙여 쓸 수 있는 배포 명령이 출력된다. 서버에서 둘 중 하나를 실행한다.

```bash
# (권장) 커밋 SHA 태그로 고정 배포 — 무엇이 떠 있는지 추적된다
kubectl -n coredesk set image deployment/coredesk \
  app=ghcr.io/jeonsumin/coredesk:sha-abc123def456 \
  migrate=ghcr.io/jeonsumin/coredesk:sha-abc123def456
kubectl -n coredesk rollout status deployment/coredesk

# (간편) latest 를 다시 당겨오기
kubectl -n coredesk rollout restart deployment/coredesk
kubectl -n coredesk rollout status deployment/coredesk
```

`imagePullPolicy: Always`로 두었기 때문에 `rollout restart`만으로도 최신 `:latest`를 다시 받는다. `IfNotPresent`였다면 노드에 캐시된 예전 이미지가 그대로 떠서 배포가 안 된 것처럼 보인다.

버전을 붙여 관리하려면 git 태그를 밀면 된다. `v1.2.0` 태그를 푸시하면 `ghcr.io/jeonsumin/coredesk:v1.2.0` 이미지가 생긴다.

매니페스트를 수정했을 때만 `kubectl apply -f k8s/`를 다시 실행한다.

## 운영 메모

- **replicas는 1로 고정**한다. 업로드 PVC가 `ReadWriteOnce`라 파드 2개가 동시에 마운트할 수 없다. 그래서 배포 전략도 `Recreate`(무중단 아님, 수십 초 다운타임)로 두었다. 무중단이 필요하면 업로드 저장소를 RWX(NFS 등) 또는 S3 호환 스토리지로 옮겨야 한다.
- 마이그레이션은 initContainer의 `prisma migrate deploy`가 처리한다. 실패하면 앱 컨테이너가 뜨지 않고 롤아웃이 멈춘다.
- 프로브는 `/api/health`를 쓴다. DB를 확인하지 않으므로 DB 장애로 파드가 재시작되지는 않는다.
- 업로드 PVC는 기본 StorageClass를 쓴다. `kubectl get storageclass`에 `(default)` 표시가 없으면 PVC가 `Pending`에 머문다.

```bash
# 상태 확인
kubectl -n coredesk get pods,svc,pvc
kubectl -n coredesk logs deploy/coredesk -f
kubectl -n coredesk logs deploy/coredesk -c migrate

# 현재 떠 있는 이미지 확인
kubectl -n coredesk get deploy coredesk \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

# 롤백
kubectl -n coredesk rollout undo deployment/coredesk

# 최고관리자 생성 (scripts/create-admin.cjs 가 레포에 있어야 동작)
kubectl -n coredesk exec deploy/coredesk -- \
  env ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='비밀번호' ADMIN_NAME='최고관리자' \
  npm run admin:create
```
