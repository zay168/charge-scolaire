-- ═══════════════════════════════════════════════════════════════════════════
-- DST ENHANCEMENTS
-- Add support for detailed room allocation and mixed/partial classes
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to dst_schedule
ALTER TABLE dst_schedule 
ADD COLUMN IF NOT EXISTS room_details TEXT,        -- Ex: "Salle 101 (A-K), Salle 102 (L-Z)"
ADD COLUMN IF NOT EXISTS population_type VARCHAR(20) DEFAULT 'ENTIERE', -- 'ENTIERE', 'GROUPE', 'CHOIX'
ADD COLUMN IF NOT EXISTS population_details TEXT;  -- Ex: "De ALBERT à MARTIN", "Groupe Spé Maths"

-- Add comment explaining new columns
COMMENT ON COLUMN dst_schedule.room_details IS 'Détails de la répartition des salles (ex: répartition alphabétique)';
COMMENT ON COLUMN dst_schedule.population_type IS 'Type de population: ENTIERE (toute la classe), GROUPE (sous-groupe), CHOIX (sélection manuelle)';
COMMENT ON COLUMN dst_schedule.population_details IS 'Précisions sur les élèves concernés';
