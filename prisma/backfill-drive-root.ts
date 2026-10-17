import { PrismaClient } from '@prisma/client'
import { computeRootIds } from '../src/lib/drive/root'

async function main() {
  const prisma = new PrismaClient()
  try {
    const folders = await prisma.driveFolder.findMany({ select: { id: true, parentId: true, rootId: true } })
    const roots = computeRootIds(folders)
    let changed = 0
    for (const f of folders) {
      const next = roots.get(f.id) ?? null
      if (next !== f.rootId) {
        await prisma.driveFolder.update({ where: { id: f.id }, data: { rootId: next } })
        changed++
      }
    }
    console.log(`drive rootId backfill: ${changed} changed`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
