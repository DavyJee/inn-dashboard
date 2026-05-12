-- CreateTable
CREATE TABLE "Inn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoomAvailability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "innId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "availableRooms" INTEGER NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "bookedRooms" INTEGER NOT NULL,
    "occupancyRate" REAL NOT NULL,
    "lowestPrice" REAL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAvailability_innId_fkey" FOREIGN KEY ("innId") REFERENCES "Inn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "innId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "roomType" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_innId_fkey" FOREIGN KEY ("innId") REFERENCES "Inn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "innId" INTEGER,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Alert_innId_fkey" FOREIGN KEY ("innId") REFERENCES "Inn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaptureLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Inn_platformId_key" ON "Inn"("platformId");

-- CreateIndex
CREATE INDEX "Inn_platform_idx" ON "Inn"("platform");

-- CreateIndex
CREATE INDEX "Inn_isActive_idx" ON "Inn"("isActive");

-- CreateIndex
CREATE INDEX "RoomAvailability_innId_date_idx" ON "RoomAvailability"("innId", "date");

-- CreateIndex
CREATE INDEX "RoomAvailability_capturedAt_idx" ON "RoomAvailability"("capturedAt");

-- CreateIndex
CREATE INDEX "RoomAvailability_date_idx" ON "RoomAvailability"("date");

-- CreateIndex
CREATE INDEX "PriceHistory_innId_date_idx" ON "PriceHistory"("innId", "date");

-- CreateIndex
CREATE INDEX "PriceHistory_date_idx" ON "PriceHistory"("date");

-- CreateIndex
CREATE INDEX "Alert_innId_idx" ON "Alert"("innId");

-- CreateIndex
CREATE INDEX "Alert_isResolved_idx" ON "Alert"("isResolved");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "CaptureLog_platform_idx" ON "CaptureLog"("platform");

-- CreateIndex
CREATE INDEX "CaptureLog_status_idx" ON "CaptureLog"("status");

-- CreateIndex
CREATE INDEX "CaptureLog_startedAt_idx" ON "CaptureLog"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
