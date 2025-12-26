import { supabase } from '../lib/supabase';

/**
 * Service to manage the central Student Directory.
 * Implements the "Passive Crowdsourcing" strategy:
 * Teachers automatically populate this directory when they view their classes.
 */
export const studentRepository = {

    /**
     * Syncs a list of EcoleDirecte students into the Supabase directory.
     * Upserts based on 'ed_id'.
     * @param {string} classLabel - e.g. "2A"
     * @param {Array} studentsList - Array of ED student objects
     */
    async syncClassStudents(classLabel, studentsList) {
        if (!studentsList || studentsList.length === 0) return;

        console.log(`🔄 Syncing ${studentsList.length} students for class ${classLabel} to directory...`);

        // Format for DB
        const studentsToUpsert = studentsList.map(s => ({
            ed_id: s.id, // EcoleDirecte ID
            first_name: s.prenom || s.firstName,
            last_name: s.nom || s.lastName,
            class_label: classLabel,
            gender: s.sexe || 'M',
            updated_at: new Date().toISOString()
        }));

        try {
            const { error } = await supabase
                .from('students')
                .upsert(studentsToUpsert, {
                    onConflict: 'ed_id',
                    ignoreDuplicates: false // Update data if exists
                });

            if (error) throw error;
            console.log(`✅ Directory updated for ${classLabel}`);
        } catch (err) {
            console.error('❌ Failed to sync students directory:', err);
        }
    },

    /**
     * Fetch students from directory by class labels
     * @param {Array<string>} classLabels - e.g. ["2A", "2B"]
     */
    async getStudentsByClasses(classLabels) {
        if (!classLabels || classLabels.length === 0) return [];

        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .in('class_label', classLabels)
                .order('last_name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Failed to fetch students from directory:', err);
            return [];
        }
    },

    /**
     * Fetch ALL students from directory
     */
    async getAllStudents() {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('class_label', { ascending: true })
                .order('last_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Failed to fetch all students from directory:', err);
            return [];
        }
    }
};
