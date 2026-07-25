# Next.js + Prisma + GHCR + K3s 배포 환경 구축 기록

## 1. 목표

구성 목표:

- Next.js + Prisma 애플리케이션 컨테이너화
- GitHub Actions를 통한 CI 구축
- GHCR(GitHub Container Registry)에 Docker Image Push
- K3s 환경에서 Kubernetes 운영
- Traefik Ingress를 통한 도메인 연결
- Let's Encrypt SSL 자동 발급
- Secret 기반 환경변수 관리

최종 구조:

```
Developer
   |
   | git push
   |
   v
GitHub Actions
   |
   | Docker Build
   | Push Image
   |
   v
GHCR
   |
   | image pull
   |
   v
K3s Cluster
   |
   +----------------+
   |                |
Deployment       Service
   |                |
   v                |
Next.js Pod <-------+
   |
   |
Ingress (Traefik)
   |
   |
HTTPS
   |
   v
Domain
```

---

# 2. Repository 구성

추천 구조:

```
application-repo

coredesk/
├── src/
├── prisma/
├── Dockerfile
├── package.json
└── .github/
    └── workflows/
        └── build.yml


k8s-repo

k8s/
└── coredesk/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── secret.yaml
```

---

# 3. Docker Image 생성

## Dockerfile

멀티 스테이지 빌드 사용

구조:

```
deps
 |
 | npm ci
 |
builder
 |
 | prisma generate
 | next build
 |
runner
 |
 | production 실행
```

목적:

- 빌드 이미지와 실행 이미지 분리
- Production 이미지 크기 감소
- Prisma Client 포함
- Node 권한으로 실행


주요 설정:

```dockerfile
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
```

실행:

```dockerfile
CMD ["npm", "run", "start"]
```

---

# 4. GitHub Actions CI

역할:

- 코드 검증
- Docker Image Build
- GHCR Push


흐름:

```
git push master

        |
        v

GitHub Actions

        |
        +-- npm ci
        |
        +-- prisma generate
        |
        +-- lint
        |
        +-- test
        |
        +-- docker build
        |
        +-- docker push

        |
        v

ghcr.io/owner/project:image
```

---

## GHCR 로그인

사용:

```yaml
permissions:
  contents: read
  packages: write
```

로그인:

```yaml
uses: docker/login-action@v3

with:
  registry: ghcr.io
  username: ${{ github.actor }}
  password: ${{ secrets.GITHUB_TOKEN }}
```

주의:

`GITHUB_TOKEN`은 GitHub Actions 내부에서 제공되는 토큰이며,
별도 PAT가 아님.

---

# 5. Private GHCR 이미지 Pull 문제 해결

Private Repository Image는 Kubernetes가 자동으로 가져올 수 없음.

필요:

```
imagePullSecret
```

생성:

```bash
kubectl create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=USERNAME \
  --docker-password=TOKEN
```

Deployment:

```yaml
spec:
  imagePullSecrets:
    - name: ghcr-pull
```

---

# 6. ARM64 이미지 문제 해결

문제:

```
no matching manifest for linux/arm64
```

원인:

GitHub Runner:

```
linux/amd64
```

서버:

```
linux/arm64
```

아키텍처 불일치.


해결:

Docker Buildx multi platform 빌드 사용:

```yaml
platforms: linux/amd64,linux/arm64
```

또는 ARM 서버용 runner 사용.

---

# 7. Kubernetes Deployment

기본 구조:

```
Deployment
 |
 |
Pod
 |
 |
Container
```

예:

```yaml
apiVersion: apps/v1
kind: Deployment

metadata:
  name: coredesk

spec:
  replicas: 1

  selector:
    matchLabels:
      app: coredesk

  template:
    metadata:
      labels:
        app: coredesk

    spec:

      imagePullSecrets:
        - name: ghcr-pull

      containers:
        - name: coredesk

          image:
            ghcr.io/jeonsumin/coredesk:tag

          ports:
            - containerPort: 3000
```

---

# 8. Service 구성

Pod는 직접 접근하지 않음.

구조:

```
User
 |
Service
 |
Pod
```


Service:

```yaml
apiVersion: v1
kind: Service

metadata:
  name: coredesk

spec:

  selector:
    app: coredesk

  ports:
    - port: 80
      targetPort: 3000
```

---

# 9. Secret 관리

환경변수:

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
FIELD_ENCRYPTION_KEY
```


secret.yaml:

```yaml
apiVersion: v1
kind: Secret

metadata:
  name: coredesk-secrets

type: Opaque

stringData:

  DATABASE_URL: ""
  NEXTAUTH_URL: ""
  NEXTAUTH_SECRET: ""
  FIELD_ENCRYPTION_KEY: ""
```

Deployment:

```yaml
envFrom:

  - secretRef:
      name: coredesk-secrets
```

---

## Secret 변경 적용

Secret 변경:

```bash
kubectl apply -f secret.yaml
```

하지만 기존 Pod 환경변수는 변경되지 않음.

반드시:

```bash
kubectl rollout restart deployment coredesk
```

필요.


이유:

```
Secret
 |
 |
Pod 생성 시 환경변수 복사

```

이기 때문.

---

# 10. 테스트 배포

Pod 확인:

```bash
kubectl get pods
```


로그:

```bash
kubectl logs deployment/coredesk
```


Service 테스트:

```bash
kubectl port-forward svc/coredesk 8080:80
```


주의:

port-forward는 테스트용.

운영 방식 아님.

---

# 11. Ingress 구성

K3s 기본:

```
Traefik Ingress Controller
```

사용.


구조:

```
Internet

   |
   |
Traefik

   |
Ingress

   |
Service

   |
Pod
```

---

Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress


metadata:

  name: coredesk

  annotations:

    kubernetes.io/ingress.class: traefik

    traefik.ingress.kubernetes.io/router.tls: "true"

    traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt


spec:

  tls:

    - hosts:

        - erp.jeonsoomin.kro.kr

      secretName: coredesk-tls


  rules:

    - host: erp.jeonsoomin.kro.kr

      http:

        paths:

          - path: /

            pathType: Prefix

            backend:

              service:

                name: coredesk

                port:

                  number: 80
```

---

# 12. Let's Encrypt SSL 설정

Traefik ACME Resolver 사용.


설정 위치:

```
/var/lib/rancher/k3s/server/manifests/traefik-config.yaml
```


내용:

```yaml
apiVersion: helm.cattle.io/v1

kind: HelmChartConfig


metadata:

  name: traefik

  namespace: kube-system


spec:

  valuesContent: |-

    certificatesResolvers:

      letsencrypt:

        acme:

          email: 실제이메일

          storage: /data/acme.json

          httpChallenge:

            entryPoint: web
```


적용 후:

```bash
kubectl rollout restart deployment traefik -n kube-system
```

---

# 13. SSL 문제 해결 과정

## 문제 1

```
contact email has forbidden domain example.com
```


원인:

예제 이메일 사용.


해결:

실제 이메일 변경.

---

## 문제 2

```
Invalid response from
/.well-known/acme-challenge
404
```


확인:

DNS:

```bash
dig erp.jeonsoomin.kro.kr
```

결과:

```
129.154.212.227
```

서버 IP와 동일.


HTTP:

```bash
curl -v http://erp.jeonsoomin.kro.kr
```

Traefik 404 확인.

즉:

```
DNS 정상
80 port 정상
Traefik 정상
```

상태.


---

# 14. 운영 배포 흐름

현재 방식:

```
개발

git push

↓

GitHub Actions

↓

GHCR Image 생성

↓

K8s repo image 변경

↓

kubectl apply

↓

rollout restart

↓

서비스 반영
```

---

# 15. 새로운 앱 추가 방법

새 앱 추가 시:


## 1. Application Repository 생성

```
new-app

Dockerfile

.github/workflows/build.yml
```


## 2. GHCR Image 생성


예:

```
ghcr.io/company/new-app
```


## 3. Kubernetes Manifest 생성


```
k8s/

new-app/

├── deployment.yaml

├── service.yaml

├── ingress.yaml

└── secret.yaml
```


## 4. Domain 추가


예:

```
new-app.jeonsoomin.kro.kr
```


Ingress만 추가하면:

```
Traefik
 +
Let's Encrypt
```

자동 적용.

---

# 16. 현재 운영 구조

현재 완료:

✅ Next.js Docker Image  
✅ Prisma 포함 빌드  
✅ GitHub Actions CI  
✅ GHCR Push  
✅ Private GHCR Pull  
✅ K3s Deployment  
✅ Service  
✅ Secret 관리  
✅ Traefik Ingress  
✅ Domain 연결  
✅ Let's Encrypt 준비  


추가 개선 예정:

- GitHub Actions → Kubernetes 자동 배포
- Prisma Migration Job 분리
- ArgoCD GitOps
- Prometheus + Grafana 모니터링
- Loki 로그 수집
- Database Backup