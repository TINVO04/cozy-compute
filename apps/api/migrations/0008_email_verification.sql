-- Migration 0008: Email verification tracking for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz DEFAULT now();
