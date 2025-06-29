-- Supabase SQL Schema for MCP Figma Server Request History
-- Run this in your Supabase SQL editor if you want to use database storage

-- Create the requests table
CREATE TABLE IF NOT EXISTS public.figma_requests (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    file_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    response_time INTEGER NOT NULL,
    ip_address INET,
    error_message TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_figma_requests_timestamp ON public.figma_requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_figma_requests_file_key ON public.figma_requests(file_key);
CREATE INDEX IF NOT EXISTS idx_figma_requests_status ON public.figma_requests(status);

-- Enable Row Level Security (optional, for security)
ALTER TABLE public.figma_requests ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access (adjust as needed)
CREATE POLICY "Allow read access to figma_requests" ON public.figma_requests
    FOR SELECT USING (true);

-- Create a policy to allow insert access (adjust as needed)
CREATE POLICY "Allow insert access to figma_requests" ON public.figma_requests
    FOR INSERT WITH CHECK (true);

-- Optional: Create a function to clean up old records (keep only last 1000)
CREATE OR REPLACE FUNCTION cleanup_old_figma_requests()
RETURNS void AS $$
BEGIN
    DELETE FROM public.figma_requests 
    WHERE id NOT IN (
        SELECT id FROM public.figma_requests 
        ORDER BY timestamp DESC 
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a view for recent requests
CREATE OR REPLACE VIEW public.recent_figma_requests AS
SELECT 
    id,
    timestamp,
    file_key,
    status,
    response_time,
    ip_address,
    error_message,
    created_at
FROM public.figma_requests
ORDER BY timestamp DESC
LIMIT 50; 