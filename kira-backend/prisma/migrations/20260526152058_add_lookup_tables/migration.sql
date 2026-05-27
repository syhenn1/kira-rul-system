/*
  Warnings:

  - You are about to drop the column `brand` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `sub_category` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `assets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assets" DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "sub_category",
DROP COLUMN "type";
