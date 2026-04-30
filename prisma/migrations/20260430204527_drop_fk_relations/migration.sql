-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "raisedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME
);
INSERT INTO "new_Alert" ("code", "id", "message", "plantId", "raisedAt", "resolvedAt", "severity") SELECT "code", "id", "message", "plantId", "raisedAt", "resolvedAt", "severity" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE INDEX "Alert_plantId_raisedAt_idx" ON "Alert"("plantId", "raisedAt");
CREATE TABLE "new_Sample" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plantId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL,
    "pvKw" REAL NOT NULL,
    "loadKw" REAL NOT NULL,
    "batteryKw" REAL NOT NULL,
    "gridKw" REAL NOT NULL,
    "socPct" REAL
);
INSERT INTO "new_Sample" ("batteryKw", "gridKw", "id", "loadKw", "plantId", "pvKw", "socPct", "ts") SELECT "batteryKw", "gridKw", "id", "loadKw", "plantId", "pvKw", "socPct", "ts" FROM "Sample";
DROP TABLE "Sample";
ALTER TABLE "new_Sample" RENAME TO "Sample";
CREATE INDEX "Sample_plantId_ts_idx" ON "Sample"("plantId", "ts");
CREATE UNIQUE INDEX "Sample_plantId_ts_key" ON "Sample"("plantId", "ts");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
