/* eslint-disable @typescript-eslint/no-require-imports */
// 보드/타임라인 개편(에픽·이슈 키·다중 담당자·상태 3개·마일스톤 제거) 1회성 이관.
// 사용: DATABASE_URL=... node scripts/migrate-issue-board.cjs
//   1) 옛 스키마에서 담당자(assigneeId)를 읽어두고 REVIEW → IN_PROGRESS 로 바꾼다
//   2) prisma db push --accept-data-loss 로 새 스키마 반영 (Milestone 테이블, Task.assigneeId 삭제)
//   3) 담당자를 TaskAssignee 로 옮기고, 프로젝트 키와 이슈 번호를 채운다
// 여러 번 실행해도 안전하다 (이미 옮긴 데이터는 건너뜀).
const { execSync } = require('node:child_process')
const { PrismaClient } = require('@prisma/client')

async function hasColumn(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    table,
    column,
  )
  return rows.length > 0
}

// 프로젝트 이름의 영문/숫자로 키를 만든다. 한글만 있으면 PRJ. 중복이면 숫자를 붙인다
function makeProjectKey(name, used) {
  const base = (name.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^[0-9]+/, '').slice(0, 10)) || 'PRJ'
  let key = base.length >= 2 ? base : `${base}P`
  for (let n = 2; used.has(key); n++) key = `${base}${n}`
  used.add(key)
  return key
}

async function main() {
  let prisma = new PrismaClient()

  const assignees = (await hasColumn(prisma, 'Task', 'assigneeId'))
    ? await prisma.$queryRawUnsafe('SELECT id AS taskId, assigneeId AS userId FROM Task WHERE assigneeId IS NOT NULL')
    : []
  const reviewed = await prisma.$executeRawUnsafe("UPDATE Task SET status = 'IN_PROGRESS' WHERE status = 'REVIEW'")
  console.log(`담당자 ${assignees.length}건 보관, REVIEW→IN_PROGRESS ${reviewed}건`)
  await prisma.$disconnect()

  execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit' })

  prisma = new PrismaClient()
  if (assignees.length > 0) {
    const { count } = await prisma.taskAssignee.createMany({ data: assignees, skipDuplicates: true })
    console.log(`TaskAssignee ${count}건 생성`)
  }

  const projects = await prisma.project.findMany({ select: { id: true, name: true, key: true, issueSeq: true }, orderBy: { createdAt: 'asc' } })
  const used = new Set(projects.map((p) => p.key).filter(Boolean))
  for (const project of projects) {
    if (!project.key) {
      const key = makeProjectKey(project.name, used)
      await prisma.project.update({ where: { id: project.id }, data: { key } })
      console.log(`프로젝트 키: ${project.name} → ${key}`)
    }

    const numbered = await prisma.task.aggregate({ where: { projectId: project.id }, _max: { number: true } })
    let seq = numbered._max.number ?? 0
    const unnumbered = await prisma.task.findMany({
      where: { projectId: project.id, number: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    for (const task of unnumbered) {
      seq += 1
      await prisma.task.update({ where: { id: task.id }, data: { number: seq } })
    }
    if (seq !== project.issueSeq) {
      await prisma.project.update({ where: { id: project.id }, data: { issueSeq: seq } })
    }
  }
  console.log('완료')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
