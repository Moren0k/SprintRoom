ALTER TABLE public.project_keys
  ADD COLUMN IF NOT EXISTS key_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_keys_key_fingerprint
ON public.project_keys(key_fingerprint)
WHERE key_fingerprint IS NOT NULL;
