-- 一次性迁移：单表 Page → PageDraft（在 prisma db push 前执行）
-- 用法：sqlite3 packages/server/prisma/dev.db < packages/server/prisma/migrate-to-dual-table.sql

ALTER TABLE Page RENAME TO PageDraft;
ALTER TABLE PageDraft ADD COLUMN updatedAt DATETIME;
UPDATE PageDraft SET updatedAt = createdAt WHERE updatedAt IS NULL;
