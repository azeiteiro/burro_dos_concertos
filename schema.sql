-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('going', 'interested', 'not_going');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'User',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concert" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "artistName" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "concertDate" TIMESTAMP(3) NOT NULL,
    "concertTime" TIMESTAMP(3),
    "url" TEXT,
    "notes" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcertResponse" (
    "id" SERIAL NOT NULL,
    "concertId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "responseType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcertResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "Concert_concertDate_idx" ON "Concert"("concertDate");

-- CreateIndex
CREATE INDEX "Concert_userId_idx" ON "Concert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertResponse_concertId_userId_key" ON "ConcertResponse"("concertId", "userId");

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertResponse" ADD CONSTRAINT "ConcertResponse_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertResponse" ADD CONSTRAINT "ConcertResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

