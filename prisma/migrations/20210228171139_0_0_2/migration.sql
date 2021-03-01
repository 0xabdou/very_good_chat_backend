/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[auth_user]` on the table `users`. If there are existing duplicate values, the migration will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_unique" ON "users"("auth_user");
