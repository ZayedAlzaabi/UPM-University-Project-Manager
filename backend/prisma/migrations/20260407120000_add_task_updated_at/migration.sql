-- Add updatedAt to Task, defaulting existing rows to their createdAt value
ALTER TABLE "Task" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
