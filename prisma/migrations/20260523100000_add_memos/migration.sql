-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memo_ownerId_idx" ON "Memo"("ownerId");

-- CreateIndex
CREATE INDEX "Memo_projectId_idx" ON "Memo"("projectId");

-- CreateIndex
CREATE INDEX "Memo_title_idx" ON "Memo"("title");

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
