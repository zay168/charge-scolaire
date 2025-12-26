-- ═══════════════════════════════════════════════════════════════════════════
-- DST (Devoir Surveillé du Samedi) TABLE
-- Stores DST announcements that are not in EcoleDirecte
-- ═══════════════════════════════════════════════════════════════════════════

-- Create DST table
CREATE TABLE IF NOT EXISTS dst_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Date and timing
    dst_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER DEFAULT 90,
    
    -- Class info
    class_name VARCHAR(50) NOT NULL,
    student_count INTEGER,
    
    -- Subject info
    subject VARCHAR(100) NOT NULL,
    professor VARCHAR(200),
    room VARCHAR(50),
    
    -- Metadata
    created_by VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'pdf_import', 'api'
    source_file VARCHAR(500),
    
    -- Unique constraint: one DST per class/subject/date
    UNIQUE(dst_date, class_name, subject)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dst_date ON dst_schedule(dst_date);
CREATE INDEX IF NOT EXISTS idx_dst_class ON dst_schedule(class_name);

-- Enable RLS
ALTER TABLE dst_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read (anon and authenticated)
CREATE POLICY "DST readable by everyone" ON dst_schedule
    FOR SELECT TO anon, authenticated USING (true);

-- Policy: Anyone can insert/update (anon and authenticated - for prototype simplicity)
CREATE POLICY "DST writable by everyone" ON dst_schedule
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW: DST with workload impact
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW dst_workload_impact AS
SELECT 
    dst_date,
    class_name,
    COUNT(*) as dst_count,
    STRING_AGG(subject, ', ' ORDER BY subject) as subjects,
    STRING_AGG(DISTINCT professor, ', ') as professors,
    SUM(duration_minutes) as total_duration_minutes,
    -- Score impact: each DST = 3 points (same as test)
    COUNT(*) * 3 as score_impact
FROM dst_schedule
GROUP BY dst_date, class_name
ORDER BY dst_date, class_name;

-- Comment
COMMENT ON TABLE dst_schedule IS 'Stores DST (Devoir Surveillé) schedules that are announced outside of EcoleDirecte';
