-- CreateEnum
CREATE TYPE "ContentTimeSlot" AS ENUM ('MORNING', 'MIDDAY');

-- CreateTable
CREATE TABLE "ContentCalendarSlot" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "timeSlot" "ContentTimeSlot" NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendarSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCalendarSlot_dayOfWeek_timeSlot_key" ON "ContentCalendarSlot"("dayOfWeek", "timeSlot");
