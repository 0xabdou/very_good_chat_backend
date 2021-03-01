/*
  Warnings:

  - You are about to drop the column `auth_provider_id` on the `auth_users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "auth_users.auth_provider_id_unique";

-- AlterTable
ALTER TABLE "auth_users" DROP COLUMN "auth_provider_id";
