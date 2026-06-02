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
} from '@prisma/client'

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
}

export type {
  Role,
  MemberRole,
  ProjectStatus,
  TaskStatus,
  Priority,
  PortfolioUriType,
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

export type DriveFileWithUploader = DriveFile & { uploader: User }

export type DriveFolderWithCount = DriveFolder & {
  _count: { children: number; files: number }
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
