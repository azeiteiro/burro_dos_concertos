/*
  Warnings:

  - A unique constraint covering the columns `[pollId]` on the table `Concert` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ConcertResponse` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `responseType` on the `ConcertResponse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Concert" ADD COLUMN     "pollId" TEXT,
ADD COLUMN     "pollMessageId" BIGINT;

-- AlterTable
ALTER TABLE "ConcertResponse" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "responseType",
ADD COLUMN     "responseType" "ResponseType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Concert_pollId_key" ON "Concert"("pollId");
