-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('STRUCTURE', 'SCRIPT');

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "niches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "niches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_niches" (
    "user_id" TEXT NOT NULL,
    "niche_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_niches_pkey" PRIMARY KEY ("user_id","niche_id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" TEXT NOT NULL,
    "audience_country" TEXT,
    "niche_requested" TEXT NOT NULL,
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "structure_content" JSONB NOT NULL,
    "script_content" JSONB NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "niche_id" TEXT NOT NULL,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_feedbacks" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "is_useful" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generation_id" TEXT NOT NULL,

    CONSTRAINT "generation_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "niches_name_key" ON "niches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "generation_feedbacks_generation_id_type_key" ON "generation_feedbacks"("generation_id", "type");

-- AddForeignKey
ALTER TABLE "user_niches" ADD CONSTRAINT "user_niches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_niches" ADD CONSTRAINT "user_niches_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "niches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "niches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_feedbacks" ADD CONSTRAINT "generation_feedbacks_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
