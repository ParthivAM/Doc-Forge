-- Migration: Create user_usage table for tracking daily usage limits
-- File: 003_user_usage.sql

-- Create user_usage table for tracking daily limits
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    uploads INTEGER DEFAULT 0,
    rebuilds INTEGER DEFAULT 0,
    compares INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per day
    UNIQUE(user_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_user_date ON user_usage(user_id, date);

-- Enable RLS
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own usage data
CREATE POLICY "Users can read own usage"
    ON user_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage data
CREATE POLICY "Users can insert own usage"
    ON user_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage data
CREATE POLICY "Users can update own usage"
    ON user_usage
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_usage_updated_at ON user_usage;
CREATE TRIGGER trigger_update_user_usage_updated_at
    BEFORE UPDATE ON user_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage_updated_at();

-- Grant necessary permissions for service role (used by server)
GRANT ALL ON user_usage TO service_role;
GRANT ALL ON user_usage TO authenticated;
