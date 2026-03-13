-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderIntervalDays" INTEGER;
