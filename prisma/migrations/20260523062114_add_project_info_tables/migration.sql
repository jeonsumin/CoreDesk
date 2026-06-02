-- CreateTable
CREATE TABLE "ProjectUrl" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tags" TEXT[],
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAccount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tags" TEXT[],
    "ip" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDb" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tags" TEXT[],
    "ip" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "port" TEXT,
    "dbName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDb_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectUrl" ADD CONSTRAINT "ProjectUrl_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAccount" ADD CONSTRAINT "ProjectAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDb" ADD CONSTRAINT "ProjectDb_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
