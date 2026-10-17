type FolderNode = { id: string; parentId: string | null }

/** 각 폴더 id → 최상위 폴더 id (자신이 최상위이면 null). 순환은 null. */
export function computeRootIds(folders: FolderNode[]): Map<string, string | null> {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const result = new Map<string, string | null>()
  for (const folder of folders) {
    const seen = new Set<string>([folder.id])
    let current = folder
    let cyclic = false
    while (current.parentId !== null) {
      const parent = byId.get(current.parentId)
      if (!parent) break
      if (seen.has(parent.id)) { cyclic = true; break }
      seen.add(parent.id)
      current = parent
    }
    result.set(folder.id, cyclic || current.id === folder.id ? null : current.id)
  }
  return result
}
