-- Add PIN column to users table (bcrypt-hashed 6-digit PIN)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin" TEXT;
