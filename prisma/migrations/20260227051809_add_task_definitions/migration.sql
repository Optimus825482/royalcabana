-- AlterTable
ALTER TABLE "staff_tasks" ADD COLUMN     "taskDefinitionId" TEXT;

-- CreateTable
CREATE TABLE "task_definitions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_definitions_isActive_idx" ON "task_definitions"("isActive");

-- CreateIndex
CREATE INDEX "task_definitions_category_idx" ON "task_definitions"("category");

-- CreateIndex
CREATE INDEX "task_definitions_deletedAt_idx" ON "task_definitions"("deletedAt");

-- CreateIndex
CREATE INDEX "staff_tasks_taskDefinitionId_idx" ON "staff_tasks"("taskDefinitionId");

-- AddForeignKey
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_taskDefinitionId_fkey" FOREIGN KEY ("taskDefinitionId") REFERENCES "task_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
