-- ═══════════════════════════════════════════════════════════════════════════
-- CHARGE SCOLAIRE - Database Schema (Simplified)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- Stores both students and teachers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ed_id TEXT UNIQUE,                    -- École Directe ID (students only)
    email TEXT,
    name TEXT NOT NULL,
    first_name TEXT,
    role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'teacher' | 'admin'
    avatar_url TEXT,
    main_class TEXT,                      -- Main class name from ED (e.g., "2nde 3")
    establishment TEXT,                   -- School name
    
    -- École Directe sync fields
    ed_class TEXT,                        -- Student: class from ED (e.g., "Terminale B")
    ed_school TEXT,                       -- School name from ED
    ed_teacher_name TEXT,                 -- Teacher: normalized name for matching (uppercase)
    last_sync TIMESTAMPTZ,                -- Last sync with École Directe
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBJECTS TABLE
-- School subjects/courses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,            -- e.g., "MATHEMATIQUES"
    code TEXT,                            -- e.g., "MATH"
    color TEXT DEFAULT '#3b82f6',         -- Display color
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUPS TABLE
-- Unified table for both classes (auto) and option groups (manual)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                   -- "2nde 3" or "Latin"
    type TEXT NOT NULL DEFAULT 'class',   -- 'class' | 'group'
    
    -- For groups only (join code system)
    join_code TEXT UNIQUE,                -- "LAT-7X9K"
    
    -- Metadata
    level TEXT,                           -- "Seconde", "Première", etc.
    year TEXT DEFAULT '2024-2025',
    establishment TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP_MEMBERS TABLE
-- Links users to groups (classes or option groups)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'student',          -- 'student' | 'teacher'
    subject_id UUID REFERENCES subjects(id), -- For teachers: which subject
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSIGNMENTS TABLE
-- Homework and tests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ed_id TEXT,                           -- École Directe sync ID
    title TEXT,
    content TEXT,                         -- HTML content
    type TEXT DEFAULT 'homework',         -- 'homework' | 'test'
    due_date DATE NOT NULL,
    
    -- Target
    group_id UUID REFERENCES groups(id),  -- Which class/group
    subject_id UUID REFERENCES subjects(id),
    subject_name TEXT,                    -- Denormalized for quick access
    
    -- Creator
    created_by UUID REFERENCES users(id),
    is_synced BOOLEAN DEFAULT false,      -- Synced from École Directe?
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLETIONS TABLE
-- Tracks which user completed which assignment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    done BOOLEAN DEFAULT false,
    done_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, assignment_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_ed_id ON users(ed_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(join_code);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_group ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION: Generate join code for groups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    prefix TEXT := '';
    suffix TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 3-char prefix
    FOR i IN 1..3 LOOP
        prefix := prefix || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    -- Generate 4-char suffix
    FOR i IN 1..4 LOOP
        suffix := suffix || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN prefix || '-' || suffix;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-generate join code for groups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_generate_join_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'group' AND NEW.join_code IS NULL THEN
        NEW.join_code := generate_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_join_code ON groups;
CREATE TRIGGER trigger_auto_join_code
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_join_code();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) - Permissive for now
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (tighten later)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow all for groups" ON groups FOR ALL USING (true);
CREATE POLICY "Allow all for group_members" ON group_members FOR ALL USING (true);
CREATE POLICY "Allow all for assignments" ON assignments FOR ALL USING (true);
CREATE POLICY "Allow all for completions" ON completions FOR ALL USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA - Common subjects with colors
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO subjects (name, code, color) VALUES
    ('MATHEMATIQUES', 'MATH', '#ef4444'),
    ('FRANCAIS', 'FR', '#3b82f6'),
    ('ANGLAIS LV1', 'ANG', '#8b5cf6'),
    ('ESPAGNOL LV2', 'ESP', '#f59e0b'),
    ('ALLEMAND LV2', 'ALL', '#eab308'),
    ('ITALIEN LV2', 'ITA', '#22c55e'),
    ('HISTOIRE-GEOGRAPHIE', 'HG', '#10b981'),
    ('PHYSIQUE-CHIMIE', 'PC', '#06b6d4'),
    ('SCIENCES VIE & TERRE', 'SVT', '#22c55e'),
    ('SCIENCES ECONOMIQUES SOCIALES', 'SES', '#f97316'),
    ('EDUCATION PHYSIQUE', 'EPS', '#14b8a6'),
    ('PHILOSOPHIE', 'PHILO', '#a855f7'),
    ('SCIENCES NUMERIQUES', 'SNT', '#6366f1'),
    ('NUMERIQUE SCIENCES INFO', 'NSI', '#4f46e5'),
    ('ENSEIGNEMENT MORAL CIVIQUE', 'EMC', '#ec4899'),
    ('LATIN', 'LAT', '#854d0e'),
    ('GREC', 'GRC', '#92400e'),
    ('ARTS PLASTIQUES', 'AP', '#be185d'),
    ('MUSIQUE', 'MUS', '#db2777'),
    ('THEATRE', 'THE', '#c026d3')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done! Your database is ready.
-- 
-- Summary:
-- - users: Students (via ED) and Teachers (via Supabase Auth)
-- - subjects: School subjects with colors
-- - groups: Classes (auto from ED) + Option groups (manual with join codes)
-- - group_members: Who is in which group
-- - assignments: Homework and tests
-- - completions: Who completed what
-- ═══════════════════════════════════════════════════════════════════════════
