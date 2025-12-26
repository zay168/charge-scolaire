-- ═══════════════════════════════════════════════════════════════════════════
-- CHARGE SCOLAIRE - RESET & RECREATE DATABASE
-- Run this FIRST to clean up, then run schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop all existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS completions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS class_members CASCADE;  -- Old table name
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS classes CASCADE;        -- Old table name
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_join_code() CASCADE;
DROP FUNCTION IF EXISTS auto_generate_join_code() CASCADE;

-- Done! Now run schema.sql
