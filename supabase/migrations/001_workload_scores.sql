-- ═══════════════════════════════════════════════════════════════════════════
-- CHARGE SCOLAIRE - WORKLOAD SCORES MIGRATION
-- Stores daily workload scores per student, synced from student logins
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- WORKLOAD_SCORES TABLE
-- Stores daily workload data per student (populated when students sync)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workload_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ed_id TEXT,                           -- École Directe student ID (for quick matching)
    class_name TEXT NOT NULL,             -- e.g., "Terminale B"
    
    -- When
    score_date DATE NOT NULL,             -- The date this score is for
    
    -- Score breakdown
    total_score INTEGER NOT NULL DEFAULT 0,    -- Total workload score
    homework_count INTEGER DEFAULT 0,          -- Number of homework assignments
    test_count INTEGER DEFAULT 0,              -- Number of tests/evaluations
    
    -- Details (JSON for flexibility)
    assignments JSONB,                    -- Array of { subject, type, title }
    
    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),  -- When the student synced
    
    -- Unique constraint: one score per user per day
    UNIQUE(ed_id, score_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLASS_WORKLOAD_SUMMARY VIEW
-- Aggregated view by class and date (for teacher dashboard)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW class_workload_summary AS
SELECT 
    class_name,
    score_date,
    COUNT(DISTINCT ed_id) as student_count,
    ROUND(AVG(total_score)::numeric, 1) as avg_score,
    MAX(total_score) as max_score,
    SUM(homework_count) as total_homework,
    SUM(test_count) as total_tests,
    -- Status based on average score
    CASE 
        WHEN AVG(total_score) <= 2 THEN 'light'
        WHEN AVG(total_score) <= 4 THEN 'medium'
        WHEN AVG(total_score) <= 6 THEN 'heavy'
        ELSE 'critical'
    END as load_status
FROM workload_scores
GROUP BY class_name, score_date
ORDER BY score_date DESC, class_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workload_scores_date ON workload_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_workload_scores_class ON workload_scores(class_name);
CREATE INDEX IF NOT EXISTS idx_workload_scores_ed_id ON workload_scores(ed_id);
CREATE INDEX IF NOT EXISTS idx_workload_scores_class_date ON workload_scores(class_name, score_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS - Allow all for now
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE workload_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for workload_scores" ON workload_scores FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Done! This table stores workload data synced from students.
-- Teachers can read the class_workload_summary view to see aggregated data.
-- ═══════════════════════════════════════════════════════════════════════════
