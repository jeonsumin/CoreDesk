-- CreateEnum
CREATE TYPE "PortfolioUriType" AS ENUM ('GITHUB', 'PRODUCTION', 'OTHER');

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "techSpecs" TEXT[],
    "ownerId" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "thumbnailFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioLink" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "type" "PortfolioUriType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioImage" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_driveFolderId_key" ON "Portfolio"("driveFolderId");

-- CreateIndex
CREATE INDEX "Portfolio_ownerId_idx" ON "Portfolio"("ownerId");

-- CreateIndex
CREATE INDEX "PortfolioLink_portfolioId_idx" ON "PortfolioLink"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioImage_fileId_key" ON "PortfolioImage"("fileId");

-- CreateIndex
CREATE INDEX "PortfolioImage_portfolioId_idx" ON "PortfolioImage"("portfolioId");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_driveFolderId_fkey" FOREIGN KEY ("driveFolderId") REFERENCES "DriveFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "DriveFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioLink" ADD CONSTRAINT "PortfolioLink_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioImage" ADD CONSTRAINT "PortfolioImage_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioImage" ADD CONSTRAINT "PortfolioImage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DriveFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
