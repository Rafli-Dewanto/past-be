-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'ERROR', 'TIMEOUT');

-- CreateTable
CREATE TABLE "blogs" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(150) NOT NULL,
    "content" TEXT NOT NULL,
    "thumbnail" VARCHAR(2083),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "userId" INTEGER NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password" VARCHAR(72) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" VARCHAR(36) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "url" TEXT NOT NULL,
    "route" VARCHAR(255),
    "status_code" INTEGER NOT NULL,
    "response_time" INTEGER NOT NULL,
    "user_agent" TEXT,
    "ip" VARCHAR(45) NOT NULL,
    "user_id" INTEGER,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "status" "LogStatus" NOT NULL DEFAULT 'SUCCESS',
    "request_body" JSON,
    "response_body" JSON,
    "headers" JSON,
    "error_message" TEXT,
    "stack_trace" TEXT,
    "file_trace" JSON,
    "metadata" JSON,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blogs_uuid_key" ON "blogs"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_logs_uuid_key" ON "api_logs"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "api_logs_request_id_key" ON "api_logs"("request_id");

-- CreateIndex
CREATE INDEX "api_logs_request_id_idx" ON "api_logs"("request_id");

-- CreateIndex
CREATE INDEX "api_logs_method_url_idx" ON "api_logs"("method", "url");

-- CreateIndex
CREATE INDEX "api_logs_status_code_idx" ON "api_logs"("status_code");

-- CreateIndex
CREATE INDEX "api_logs_user_id_idx" ON "api_logs"("user_id");

-- CreateIndex
CREATE INDEX "api_logs_level_idx" ON "api_logs"("level");

-- CreateIndex
CREATE INDEX "api_logs_created_at_idx" ON "api_logs"("created_at");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
