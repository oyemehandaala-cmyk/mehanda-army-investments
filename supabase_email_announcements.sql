-- ============================================================================
-- MEHANDA ARMY INVESTMENTS - EMAIL ANNOUNCEMENT CENTER SCHEMA
-- ============================================================================

-- 1. Create email_announcements table
CREATE TABLE IF NOT EXISTS public.email_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (char_length(subject) >= 3 AND char_length(subject) <= 255),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
  message TEXT NOT NULL CHECK (char_length(message) >= 5),
  image_url TEXT,
  image_position TEXT NOT NULL DEFAULT 'top' CHECK (image_position IN ('top', 'middle', 'bottom')),
  cta_text TEXT,
  cta_url TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'multiple', 'all_customers', 'test')),
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Failed', 'Partial')),
  error_details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create email_announcement_recipients table for delivery auditing
CREATE TABLE IF NOT EXISTS public.email_announcement_recipients (
  id BIGSERIAL PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.email_announcements(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  provider TEXT DEFAULT 'smtp',
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create announcement_unsubscribes table for compliance
CREATE TABLE IF NOT EXISTS public.announcement_unsubscribes (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- 4. Enable Row Level Security
ALTER TABLE public.email_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_unsubscribes ENABLE ROW LEVEL SECURITY;

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_announcements_created_at
  ON public.email_announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_announcement_recipients_announcement_id
  ON public.email_announcement_recipients (announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_unsubscribes_email
  ON public.announcement_unsubscribes (email);

-- 6. Storage Bucket for Announcement Images (if storage extension is available)
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage public read policy for email clients (Gmail, Outlook, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Announcement Images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public Access for Announcement Images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'announcement-images');
  END IF;
END $$;

