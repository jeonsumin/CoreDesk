/* eslint-disable @typescript-eslint/no-require-imports */
// 고정 역할(MANAGER/MEMBER/VIEWER) → 권한 그룹 1회성 이관.
// 사용: DATABASE_URL=... node scripts/migrate-permission-groups.cjs
//   1) 옛 역할별 메뉴·폴더 권한과 사용자 역할을 백업 파일로 읽어두고, 사용자 역할을 USER로 바꾼다
//   2) prisma db push --accept-data-loss 로 새 스키마 반영
//   3) 매니저/멤버/열람자 그룹을 만들고 사용자·메뉴 권한(WRITE→전체, READ→읽기)을 옮긴다.
//      역할별 드라이브 폴더 공유는 그 역할이던 사용자 각각에게 같은 권한으로 펼친다 (폴더 소유자 제외)
// 여러 번 실행해도 안전하다 (백업 파일이 있으면 그것으로 3단계만 다시 수행).
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execSync } = require('node:child_process')

// db push 뒤 generate 한 새 클라이언트를 쓰려면 모듈 캐시를 비우고 다시 불러와야 한다
function loadPrismaClient() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}.prisma${path.sep}`) || key.includes(`@prisma${path.sep}client`)) delete require.cache[key]
  }
  return require('@prisma/client').PrismaClient
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 을 지정하세요. 예: DATABASE_URL=mysql://... npm run migrate:permission-groups')
  process.exit(1)
}

// 다른 DB에서 남은 백업을 잘못 적용하지 않도록 대상 호스트·DB 이름을 파일명에 넣는다
const target = new URL(process.env.DATABASE_URL ?? '')
const BACKUP = path.join(
  os.tmpdir(),
  `coredesk-permission-groups-${target.hostname}-${target.port || '3306'}${target.pathname.replace(/\W/g, '_')}.json`,
)
const GROUPS = [
  { role: 'MANAGER', name: '매니저' },
  { role: 'MEMBER', name: '멤버' },
  { role: 'VIEWER', name: '열람자' },
]

async function hasColumn(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    table,
    column,
  )
  return rows.length > 0
}

async function main() {
  let prisma = new (loadPrismaClient())()

  if (await hasColumn(prisma, 'MenuPermission', 'role')) {
    const backup = {
      users: await prisma.$queryRawUnsafe("SELECT id, role FROM User WHERE role <> 'ADMIN'"),
      menus: await prisma.$queryRawUnsafe('SELECT menuId, role, access FROM MenuPermission'),
      folders: await prisma.$queryRawUnsafe('SELECT folderId, role, access FROM DriveFolderPermission'),
    }
    fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2))
    console.log(`백업: ${BACKUP} (사용자 ${backup.users.length}, 메뉴 권한 ${backup.menus.length}, 폴더 권한 ${backup.folders.length})`)

    await prisma.$executeRawUnsafe(
      "ALTER TABLE User MODIFY role ENUM('ADMIN','MANAGER','MEMBER','VIEWER','USER') NOT NULL DEFAULT 'USER'",
    )
    await prisma.$executeRawUnsafe("UPDATE User SET role = 'USER' WHERE role <> 'ADMIN'")
    // 기본키가 (menuId, groupId)로 바뀌므로 옛 행은 백업 후 비운다
    await prisma.$executeRawUnsafe('DELETE FROM MenuPermission')
    await prisma.$executeRawUnsafe('DELETE FROM DriveFolderPermission')
  }
  await prisma.$disconnect()

  execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit' })
  execSync('npx prisma generate', { stdio: 'inherit' })

  if (!fs.existsSync(BACKUP)) {
    console.log('백업 파일이 없어 옮길 데이터가 없습니다')
    return
  }
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'))
  prisma = new (loadPrismaClient())()

  const groupIdByRole = {}
  for (const [i, g] of GROUPS.entries()) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: g.name },
      create: { name: g.name, sortOrder: i },
      update: {},
    })
    groupIdByRole[g.role] = group.id
  }

  for (const u of backup.users) {
    const groupId = groupIdByRole[u.role]
    if (groupId) await prisma.user.updateMany({ where: { id: u.id, groupId: null }, data: { groupId } })
  }

  let menuCount = 0
  for (const p of backup.menus) {
    const groupId = groupIdByRole[p.role]
    if (!groupId || p.access === 'NONE') continue
    const write = p.access === 'WRITE'
    const data = { canRead: true, canCreate: write, canUpdate: write, canDelete: write }
    await prisma.menuPermission.upsert({
      where: { menuId_groupId: { menuId: p.menuId, groupId } },
      create: { menuId: p.menuId, groupId, ...data },
      update: data,
    })
    menuCount++
  }

  let folderCount = 0
  for (const p of backup.folders) {
    if (p.access === 'NONE') continue
    const folder = await prisma.driveFolder.findUnique({ where: { id: p.folderId }, select: { ownerId: true } })
    if (!folder) continue
    for (const u of backup.users) {
      if (u.role !== p.role || u.id === folder.ownerId) continue
      await prisma.driveFolderPermission.upsert({
        where: { folderId_userId: { folderId: p.folderId, userId: u.id } },
        create: { folderId: p.folderId, userId: u.id, access: p.access },
        update: { access: p.access },
      })
      folderCount++
    }
  }

  console.log(`그룹 ${GROUPS.length}개, 메뉴 권한 ${menuCount}건, 폴더 권한 ${folderCount}건 이관 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
