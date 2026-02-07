-- Supabase SQL Migration for E-Signature System
-- Run this in your Supabase SQL Editor

-- Create signatures table
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Ensure only one default signature per user
CREATE OR REPLACE FUNCTION ensure_single_default_signature()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE signatures 
        SET is_default = false 
        WHERE owner_id = NEW.owner_id 
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_signature ON signatures;
CREATE TRIGGER trigger_single_default_signature
    BEFORE INSERT OR UPDATE ON signatures
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_signature();

-- Enable RLS
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own signatures
CREATE POLICY "Users can view their own signatures"
    ON signatures FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own signatures"
    ON signatures FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own signatures"
    ON signatures FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own signatures"
    ON signatures FOR DELETE
    USING (owner_id = auth.uid());

-- Create storage bucket for signature images (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: signatures
-- Public bucket: false (private)
