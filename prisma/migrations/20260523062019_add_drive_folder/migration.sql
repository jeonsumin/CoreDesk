-- AlterTable
ALTER TABLE "DriveFile" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "DriveFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFile" ADD CONSTRAINT "DriveFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
