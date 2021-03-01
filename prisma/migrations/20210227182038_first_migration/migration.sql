-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "auth_provider_id" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "username" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "photo_url" TEXT,
    "auth_user" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users.email_unique" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users.auth_provider_id_unique" ON "auth_users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "users.username_unique" ON "users"("username");

-- AddForeignKey
ALTER TABLE "users" ADD FOREIGN KEY ("auth_user") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
