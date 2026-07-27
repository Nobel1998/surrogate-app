-- Add blog translation fields (English source -> zh/es)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS title_zh text,
ADD COLUMN IF NOT EXISTS description_zh text,
ADD COLUMN IF NOT EXISTS content_zh text,
ADD COLUMN IF NOT EXISTS title_es text,
ADD COLUMN IF NOT EXISTS description_es text,
ADD COLUMN IF NOT EXISTS content_es text,
ADD COLUMN IF NOT EXISTS translation_status varchar(20) NOT NULL DEFAULT 'pending'
  CHECK (translation_status IN ('pending', 'done', 'failed')),
ADD COLUMN IF NOT EXISTS translation_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_translation_status
  ON public.events (translation_status);

COMMENT ON COLUMN public.events.translation_status IS 'Auto translation state for zh/es content.';
COMMENT ON COLUMN public.events.translation_updated_at IS 'Last successful or failed translation timestamp.';
