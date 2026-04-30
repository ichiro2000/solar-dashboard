-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacityKw" REAL NOT NULL,
    "tz" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plantId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL,
    "pvKw" REAL NOT NULL,
    "loadKw" REAL NOT NULL,
    "batteryKw" REAL NOT NULL,
    "gridKw" REAL NOT NULL,
    "socPct" REAL,
    CONSTRAINT "Sample_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "raisedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "Alert_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SemsSession" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "region" TEXT NOT NULL,
    "apiHost" TEXT NOT NULL,
    "tokenCipher" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Sample_plantId_ts_idx" ON "Sample"("plantId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "Sample_plantId_ts_key" ON "Sample"("plantId", "ts");

-- CreateIndex
CREATE INDEX "Alert_plantId_raisedAt_idx" ON "Alert"("plantId", "raisedAt");
