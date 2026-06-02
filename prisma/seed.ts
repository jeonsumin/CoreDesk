import { PrismaClient, Role, MemberRole, ProjectStatus, TaskStatus, Priority } from '@prisma/client'
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
    const tasks = [
      { title: '요구사항 분석', status: TaskStatus.DONE, priority: Priority.HIGH },
      { title: 'DB 스키마 설계', status: TaskStatus.DONE, priority: Priority.HIGH },
      { title: 'Auth 구현', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH },
      { title: '프로젝트 목록 페이지', status: TaskStatus.TODO, priority: Priority.MEDIUM },
      { title: '태스크 관리 기능', status: TaskStatus.TODO, priority: Priority.MEDIUM },
    ]

    for (const task of tasks) {
      await prisma.task.create({
        data: {
          projectId: project.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeId: dev1.id,
          dueDate: new Date('2026-06-30'),
        },
      })
    }
  }

  const existingMilestones = await prisma.milestone.count({ where: { projectId: project.id } })
  if (existingMilestones === 0) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        title: 'MVP 릴리즈',
        dueDate: new Date('2026-06-30'),
        isCompleted: false,
      },
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
