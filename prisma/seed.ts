import { PrismaClient, Role, MemberRole, ProjectStatus, TaskStatus, Priority, IssueType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@coredesk.com' },
    update: {},
    create: {
      name: '김지훈 (PM)',
      email: 'admin@coredesk.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const dev1 = await prisma.user.upsert({
    where: { email: 'dev1@coredesk.com' },
    update: {},
    create: {
      name: '이수민 (개발자)',
      email: 'dev1@coredesk.com',
      password: hashedPassword,
      role: Role.MEMBER,
    },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'ceo@coredesk.com' },
    update: {},
    create: {
      name: '박성호 (CEO)',
      email: 'ceo@coredesk.com',
      password: hashedPassword,
      role: Role.MEMBER,
    },
  })

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'CoreDesk v1.0 개발',
      key: 'CD',
      description: '사내 ERP 시스템 1차 개발',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      ownerId: admin.id,
    },
  })

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: { projectId: project.id, userId: admin.id, role: MemberRole.PM },
  })

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: dev1.id } },
    update: {},
    create: { projectId: project.id, userId: dev1.id, role: MemberRole.DEVELOPER },
  })

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: viewer.id } },
    update: {},
    create: { projectId: project.id, userId: viewer.id, role: MemberRole.VIEWER },
  })

  const existingTasks = await prisma.task.count({ where: { projectId: project.id } })
  if (existingTasks === 0) {
    // 에픽 → 하위 이슈 순으로 프로젝트별 번호를 발급한다
    const plan = [
      { title: '기획', issues: [
        { title: '요구사항 분석', status: TaskStatus.DONE, priority: Priority.HIGH, start: '2026-01-05', due: '2026-01-16' },
        { title: 'DB 스키마 설계', status: TaskStatus.DONE, priority: Priority.HIGH, start: '2026-01-12', due: '2026-01-23' },
      ] },
      { title: '개발', issues: [
        { title: 'Auth 구현', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, start: '2026-01-26', due: '2026-02-13' },
        { title: '프로젝트 목록 페이지', status: TaskStatus.TODO, priority: Priority.MEDIUM, start: '2026-02-16', due: '2026-03-06' },
        { title: '보드 기능', status: TaskStatus.TODO, priority: Priority.MEDIUM, start: '2026-03-09', due: '2026-04-03' },
      ] },
    ]
    let number = 0
    for (const epicPlan of plan) {
      const epic = await prisma.task.create({
        data: { projectId: project.id, number: ++number, type: IssueType.EPIC, title: epicPlan.title, createdById: admin.id },
      })
      for (const issue of epicPlan.issues) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            number: ++number,
            epicId: epic.id,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            startDate: new Date(issue.start),
            dueDate: new Date(issue.due),
            createdById: admin.id,
            assignees: { create: [{ userId: dev1.id }] },
          },
        })
      }
    }
    await prisma.project.update({ where: { id: project.id }, data: { issueSeq: number } })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
