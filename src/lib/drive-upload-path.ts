import path from 'path'

export const DEFAULT_DRIVE_UPLOAD_ROOT = path.join('uploads', 'drive')
export const DRIVE_UPLOAD_ROOT_ENV_KEY = 'DRIVE_UPLOAD_ROOT'

type UploadRootEnv = Record<string, string | undefined>

type DriveStorageLocationInput = {
  storageFileName: string
  env?: UploadRootEnv
  cwd?: string
}

type DriveStorageLocation = {
  absoluteDir: string
  absolutePath: string
  storagePath: string
}

function getConfiguredUploadRoot(env: UploadRootEnv): string | null {
  const configured = env[DRIVE_UPLOAD_ROOT_ENV_KEY]?.trim()
  return configured ? configured : null
}

function assertValidUploadRoot(uploadRoot: string, cwd: string) {
  if (uploadRoot.includes('\0')) {
    throw new Error(`${DRIVE_UPLOAD_ROOT_ENV_KEY}에 null 문자는 사용할 수 없습니다`)
  }

  const resolvedCwd = path.resolve(cwd)
  const resolvedUploadRoot = path.isAbsolute(uploadRoot)
    ? path.resolve(uploadRoot)
    : path.resolve(resolvedCwd, uploadRoot)
  const filesystemRoot = path.parse(resolvedUploadRoot).root

  if (resolvedUploadRoot === filesystemRoot) {
    throw new Error(`${DRIVE_UPLOAD_ROOT_ENV_KEY}는 파일시스템 루트로 지정할 수 없습니다`)
  }

  if (resolvedUploadRoot === resolvedCwd) {
    throw new Error(`${DRIVE_UPLOAD_ROOT_ENV_KEY}는 프로젝트 루트로 지정할 수 없습니다`)
  }

  if (!path.isAbsolute(uploadRoot)) {
    const relativeToProject = path.relative(resolvedCwd, resolvedUploadRoot)
    if (relativeToProject.startsWith('..') || path.isAbsolute(relativeToProject)) {
      throw new Error(
        `${DRIVE_UPLOAD_ROOT_ENV_KEY} 상대 경로는 프로젝트 루트 내부여야 합니다`,
      )
    }
  }
}

export function getDriveUploadRoot(
  env: UploadRootEnv = process.env,
  cwd = process.cwd(),
): string {
  const configuredUploadRoot = getConfiguredUploadRoot(env)
  if (!configuredUploadRoot) {
    return path.join(path.resolve(cwd), DEFAULT_DRIVE_UPLOAD_ROOT)
  }

  assertValidUploadRoot(configuredUploadRoot, cwd)
  return path.isAbsolute(configuredUploadRoot)
    ? path.resolve(configuredUploadRoot)
    : path.resolve(cwd, configuredUploadRoot)
}

export function createDriveStorageLocation({
  storageFileName,
  env = process.env,
  cwd = process.cwd(),
}: DriveStorageLocationInput): DriveStorageLocation {
  const configuredUploadRoot = getConfiguredUploadRoot(env)
  const absoluteDir = getDriveUploadRoot(env, cwd)
  const absolutePath = path.join(absoluteDir, storageFileName)

  return {
    absoluteDir,
    absolutePath,
    storagePath: configuredUploadRoot
      ? absolutePath
      : path.join(DEFAULT_DRIVE_UPLOAD_ROOT, storageFileName),
  }
}

export function resolveDriveStoragePath(storagePath: string, cwd = process.cwd()): string {
  if (storagePath.includes('\0')) {
    throw new Error('storagePath에 null 문자는 사용할 수 없습니다')
  }

  return path.isAbsolute(storagePath)
    ? path.normalize(storagePath)
    : path.resolve(cwd, storagePath)
}
