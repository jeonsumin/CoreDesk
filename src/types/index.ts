import type {
  User,
  Project,
  Task,
  Milestone,
  ProjectMember,
  DriveFile,
  DriveFolder,
  ProjectUrl,
  ProjectAccount,
  ProjectDb,
  Portfolio,
  PortfolioLink,
  PortfolioImage,
  Memo,
  Menu,
  MenuPermission,
} from '@prisma/client'
import type { FolderPerms } from '@/lib/drive/permission-schema'

export type {
  User,
  Project,
  Task,
  Milestone,
  ProjectMember,
  DriveFile,
  DriveFolder,
  ProjectUrl,
  ProjectAccount,
  ProjectDb,
  Portfolio,
  PortfolioLink,
  PortfolioImage,
  Memo,
  Menu,
  MenuPermission,
}

export type {
  Role,
  MemberRole,
  ProjectStatus,
  TaskStatus,
  Priority,
  PortfolioUriType,
  MenuType,
  MenuStatus,
  MenuAccess,
} from '@prisma/client'

export type ProjectWithDetails = Project & {
  owner: User
  members: (ProjectMember & { user: User })[]
  tasks: Task[]
  milestones: Milestone[]
}

export type TaskWithDetails = Task & {
  assignee: User | null
  project: Project
}

export type ProjectSummary = Project & {
  owner: Pick<User, 'id' | 'name' | 'email'>
  _count: { tasks: number; members: number }
  completedTaskCount: number
}

export type DriveFolderWithCount = DriveFolder & {
  _count: { children: number; files: number }
}

export type DriveFolderItem = DriveFolderWithCount & {
  canEdit: boolean
  canManage: boolean
  badge: string | null
  perms: FolderPerms | null
}

export type DriveFileItem = Omit<DriveFile, 'storagePath'> & {
  uploader: Pick<User, 'id' | 'name'>
  canEdit: boolean
}

export type BreadcrumbItem = Pick<DriveFolder, 'id' | 'name'>

export type PortfolioWithAssets = Portfolio & {
  driveFolder: DriveFolder
  thumbnailFile: DriveFile | null
  links: PortfolioLink[]
  images: (PortfolioImage & { file: DriveFile })[]
}

export type MemoWithProject = Memo & {
  project: Pick<Project, 'id' | 'name'> | null
}
