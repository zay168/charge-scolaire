-- ═══════════════════════════════════════════════════════════════════════════
-- STUDENT REPOSITORY & ADVANCED DST ALLOCATION
-- 1. Create a central directory of students (synced by teachers)
-- 2. Add specific student allocation columns to DST
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Table des élèves (Global Directory)
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ed_id INTEGER UNIQUE NOT NULL,      -- ID EcoleDirecte (clé de déduplication)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    class_label VARCHAR(20),            -- Ex: "2A", "TERMINALE B"
    gender VARCHAR(1),                  -- "M" ou "F"
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par classe
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_label);

-- RLS: Tout le monde (auth & anon) peut lire/écrire pour le fonctionnement "Crowdsourcing"
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students public access" ON students
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 2. Colonnes pour l'allocation précise des élèves dans les DST
ALTER TABLE dst_schedule 
ADD COLUMN IF NOT EXISTS selected_student_ids JSONB DEFAULT '[]'::JSONB, -- Liste des ID Supabase des élèves sélectionnés
ADD COLUMN IF NOT EXISTS room_allocations JSONB DEFAULT '{}'::JSONB;     -- Mapping { "Salle B12": [student_id_1, ...], "Salle B14": [...] }

-- Commentaire
COMMENT ON TABLE students IS 'Répertoire central des élèves, alimenté automatiquement par les connexions professeurs';
