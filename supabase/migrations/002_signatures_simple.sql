-- Simplified Supabase SQL Migration for E-Signature System
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create signatures table (without foreign key constraint for flexibility)
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'uploaded', 'typed')),
    display_name TEXT NOT NULL,
    role_title TEXT,
    storage_path TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by owner
CREATE INDEX IF NOT EXISTS idx_signatures_owner_id ON signatures(owner_id);

-- Grant access to the service role (so your API can access it)
ALTER TABLE signatures OWNER TO postgres;
GRANT ALL ON signatures TO postgres;
GRANT ALL ON signatures TO service_role;
GRANT ALL ON signatures TO authenticated;

-- Optional: Enable RLS if you want (can skip for MVP)
-- ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- To verify table was created, run:
-- SELECT * FROM signatures LIMIT 1;
