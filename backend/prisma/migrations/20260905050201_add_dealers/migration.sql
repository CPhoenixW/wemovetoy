-- CreateEnum
CREATE TYPE "DealerCompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DealerMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DealerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DealerCompany" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "status" "DealerCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerMember" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "DealerMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerApplication" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "status" "DealerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER,

    CONSTRAINT "DealerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerMember_userId_idx" ON "DealerMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerMember_companyId_userId_key" ON "DealerMember"("companyId", "userId");

-- CreateIndex
CREATE INDEX "DealerApplication_userId_idx" ON "DealerApplication"("userId");

-- CreateIndex
CREATE INDEX "DealerApplication_status_idx" ON "DealerApplication"("status");

-- AddForeignKey
ALTER TABLE "DealerMember" ADD CONSTRAINT "DealerMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "DealerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerMember" ADD CONSTRAINT "DealerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerApplication" ADD CONSTRAINT "DealerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerApplication" ADD CONSTRAINT "DealerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerApplication" ADD CONSTRAINT "DealerApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "DealerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
