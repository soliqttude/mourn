-- Persist the lock state used by webhook lock/unlock.
-- Existing managed webhook tokens are revoked on lock; unlock stores a newly-created webhook.
ALTER TABLE IF EXISTS managed_webhooks
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
