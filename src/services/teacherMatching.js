/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEACHER MATCHING SERVICE
 * Automatically links students to teachers based on École Directe data
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabase';

/**
 * Normalize a teacher name for matching
 * Handles various formats: "M. DUPONT P.", "Mme Martin", "DUPONT", etc.
 */
function normalizeForMatching(name) {
    if (!name) return '';

    return name
        .replace(/^(M\.|Mme|Mlle|Mr\.?|Mrs\.?)\s*/i, '') // Remove titles
        .replace(/\s+[A-Z]\.?$/i, '') // Remove trailing initials like "P."
        .trim()
        .toUpperCase();
}

/**
 * Try to find a matching teacher in Supabase
 * @param {string} teacherName - Normalized teacher name from ED
 * @returns {Object|null} - Teacher user record or null
 */
async function findTeacherByName(teacherName) {
    const normalized = normalizeForMatching(teacherName);
    if (!normalized || normalized.length < 2) return null;

    // Search in users table for teachers with matching name
    // We search in the 'name' field which should contain the teacher's full name
    const { data: teachers, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .or(`name.ilike.%${normalized}%,ed_teacher_name.eq.${normalized}`);

    if (error) {
        console.error('Error searching for teacher:', error);
        return null;
    }

    if (teachers && teachers.length > 0) {
        // If multiple matches, prefer exact match on ed_teacher_name
        const exactMatch = teachers.find(t =>
            normalizeForMatching(t.ed_teacher_name) === normalized
        );
        return exactMatch || teachers[0];
    }

    return null;
}

/**
 * Link a student to a teacher's groups for specific subjects
 * @param {string} studentId - Student's user ID in Supabase
 * @param {string} teacherId - Teacher's user ID in Supabase
 * @param {Array} subjects - Array of { name, code } for subjects taught
 * @param {string} studentClass - Student's class name (e.g., "2nde 3")
 */
async function linkStudentToTeacher(studentId, teacherId, subjects, studentClass) {
    // Get teacher's groups
    const { data: teacherGroups, error: groupsError } = await supabase
        .from('group_members')
        .select(`
            group_id,
            subject_id,
            groups (id, name, type),
            subjects (id, name, code)
        `)
        .eq('user_id', teacherId)
        .eq('role', 'teacher');

    if (groupsError) {
        console.error('Error fetching teacher groups:', groupsError);
        return { linked: 0, errors: [groupsError.message] };
    }

    const linked = [];
    const errors = [];

    for (const tg of teacherGroups || []) {
        // Check if this group matches any of the student's subjects
        const matchingSubject = subjects.find(s =>
            s.code === tg.subjects?.code ||
            s.name.toUpperCase() === tg.subjects?.name?.toUpperCase()
        );

        // Also check if the group matches the student's class
        const classMatches = !studentClass ||
            tg.groups?.name?.toUpperCase().includes(studentClass.toUpperCase());

        if (matchingSubject && classMatches) {
            // Check if student is already in this group
            const { data: existing } = await supabase
                .from('group_members')
                .select('id')
                .eq('user_id', studentId)
                .eq('group_id', tg.group_id)
                .single();

            if (!existing) {
                // Add student to group
                const { error: insertError } = await supabase
                    .from('group_members')
                    .insert({
                        user_id: studentId,
                        group_id: tg.group_id,
                        role: 'student',
                        subject_id: tg.subject_id,
                    });

                if (insertError) {
                    errors.push(`Failed to add to ${tg.groups?.name}: ${insertError.message}`);
                } else {
                    linked.push({
                        groupName: tg.groups?.name,
                        subject: matchingSubject.name,
                        teacherId,
                    });
                    console.log(`✅ Linked student to ${tg.groups?.name} (${matchingSubject.name})`);
                }
            }
        }
    }

    return { linked, errors };
}

/**
 * Main function: Process ED teacher data and link student to matching teachers
 * @param {string} studentId - Student's Supabase user ID
 * @param {Array} edTeachers - Teachers from getMyTeachers() with format [{ name, subjects: [{ name, code }] }]
 * @param {string} studentClass - Student's class from ED (e.g., "Terminale B")
 */
export async function matchAndLinkTeachers(studentId, edTeachers, studentClass = '') {
    console.log(`🔗 Matching ${edTeachers.length} teachers for student ${studentId}...`);

    const results = {
        matched: [],
        notFound: [],
        linked: [],
        errors: [],
    };

    for (const edTeacher of edTeachers) {
        const teacher = await findTeacherByName(edTeacher.name);

        if (teacher) {
            results.matched.push({
                edName: edTeacher.name,
                supabaseId: teacher.id,
                supabaseName: teacher.name,
            });

            // Link student to this teacher's groups
            const linkResult = await linkStudentToTeacher(
                studentId,
                teacher.id,
                edTeacher.subjects,
                studentClass
            );

            results.linked.push(...linkResult.linked);
            results.errors.push(...linkResult.errors);
        } else {
            results.notFound.push(edTeacher.name);
        }
    }

    console.log(`📊 Matching results:`, {
        matched: results.matched.length,
        notFound: results.notFound.length,
        linked: results.linked.length,
        errors: results.errors.length,
    });

    return results;
}

/**
 * Update or create a student user in Supabase from ED data
 * @param {Object} edAccount - Account data from ED login
 * @returns {Object} - Supabase user record
 */
export async function syncStudentFromED(edAccount) {
    const email = edAccount.email || `${edAccount.id}@ed.local`;

    // Check if user exists
    const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('ed_id', edAccount.id)
        .single();

    if (existing) {
        // Update existing user
        const { data: updated, error } = await supabase
            .from('users')
            .update({
                name: `${edAccount.firstName} ${edAccount.lastName}`,
                email: email,
                ed_class: edAccount.classe,
                ed_school: edAccount.school,
                last_sync: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating student:', error);
            return existing;
        }
        return updated;
    }

    // Create new user
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email: email,
            name: `${edAccount.firstName} ${edAccount.lastName}`,
            role: 'student',
            ed_id: edAccount.id,
            ed_class: edAccount.classe,
            ed_school: edAccount.school,
            last_sync: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating student:', error);
        throw error;
    }

    console.log(`✅ Created student in Supabase:`, newUser.name);
    return newUser;
}

/**
 * Full sync: Create/update student and match to teachers
 * Call this after successful ED login
 */
export async function fullStudentSync(edClient) {
    if (!edClient.isAuthenticated()) {
        throw new Error('Not authenticated with ED');
    }

    // 1. Sync student record
    const student = await syncStudentFromED(edClient.account);

    // 2. Get teachers from ED
    const edTeachers = await edClient.getMyTeachers();

    // 3. Record detected teachers for the claim system
    try {
        await recordDetectedTeachers(
            edTeachers,
            edClient.account.classe,
            edClient.account.school
        );
    } catch (err) {
        console.warn('Failed to record detected teachers (non-blocking):', err.message);
    }

    // 4. Match and link to existing teachers
    const matchResults = await matchAndLinkTeachers(
        student.id,
        edTeachers,
        edClient.account.classe
    );

    return {
        student,
        teacherMatching: matchResults,
    };
}

/**
 * Record detected teachers from student's ED data
 * This builds the list for the secure "claim" system
 */
export async function recordDetectedTeachers(edTeachers, studentClass, establishment) {
    console.log(`📝 Recording ${edTeachers.length} detected teachers...`);

    for (const teacher of edTeachers) {
        const normalizedName = teacher.name.toUpperCase();

        // Check if this teacher already exists
        const { data: existing } = await supabase
            .from('detected_teachers')
            .select('*')
            .eq('normalized_name', normalizedName)
            .eq('establishment', establishment || 'unknown')
            .single();

        if (existing) {
            // Update existing record with more data
            const updatedSubjects = [...new Set([
                ...existing.subjects,
                ...teacher.subjects.map(s => JSON.stringify(s))
            ])].map(s => typeof s === 'string' ? JSON.parse(s) : s);

            const updatedClasses = [...new Set([
                ...existing.classes,
                studentClass
            ].filter(Boolean))];

            await supabase
                .from('detected_teachers')
                .update({
                    subjects: updatedSubjects,
                    classes: updatedClasses,
                    claim_count: existing.claim_count + 1,
                    last_seen: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // Create new detected teacher
            await supabase
                .from('detected_teachers')
                .insert({
                    name: teacher.name,
                    normalized_name: normalizedName,
                    subjects: teacher.subjects,
                    classes: studentClass ? [studentClass] : [],
                    establishment: establishment || 'unknown',
                    claim_count: 1,
                });
        }
    }
}

/**
 * Get list of unclaimed teachers for registration dropdown
 * @param {string} establishment - Optional: filter by school
 */
export async function getUnclaimedTeachers(establishment = null) {
    let query = supabase
        .from('detected_teachers')
        .select('*')
        .is('claimed_by', null)
        .order('claim_count', { ascending: false });

    if (establishment) {
        query = query.eq('establishment', establishment);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching unclaimed teachers:', error);
        return [];
    }

    return data || [];
}

/**
 * Claim a detected teacher identity
 * @param {string} detectedTeacherId - ID of the detected_teachers record
 * @param {string} userId - User ID of the claiming teacher
 * @param {object} verificationAnswers - Answers to verification questions
 */
export async function claimTeacherIdentity(detectedTeacherId, userId, verificationAnswers) {
    // Get the detected teacher
    const { data: detected, error: fetchError } = await supabase
        .from('detected_teachers')
        .select('*')
        .eq('id', detectedTeacherId)
        .single();

    if (fetchError || !detected) {
        throw new Error('Enseignant non trouvé');
    }

    if (detected.claimed_by) {
        throw new Error('Cette identité a déjà été revendiquée');
    }

    // Verify the answers
    const verification = verifyTeacherClaim(detected, verificationAnswers);
    if (!verification.valid) {
        throw new Error(verification.error || 'Vérification échouée');
    }

    // Mark as claimed
    const { error: claimError } = await supabase
        .from('detected_teachers')
        .update({ claimed_by: userId })
        .eq('id', detectedTeacherId);

    if (claimError) {
        throw new Error('Erreur lors de la revendication');
    }

    // Update the user with the teacher name
    await supabase
        .from('users')
        .update({
            ed_teacher_name: detected.normalized_name,
            name: detected.name.replace(/^(M\.|Mme|Mlle)\s*/i, '').trim(),
        })
        .eq('id', userId);

    console.log(`✅ Teacher ${detected.name} claimed by user ${userId}`);
    return detected;
}

/**
 * Verify teacher claim answers
 */
function verifyTeacherClaim(detected, answers) {
    // Check if they know at least one subject they teach
    if (answers.subject) {
        const subjectMatch = detected.subjects.some(s =>
            s.name.toLowerCase().includes(answers.subject.toLowerCase()) ||
            s.code?.toLowerCase() === answers.subject.toLowerCase()
        );
        if (!subjectMatch) {
            return { valid: false, error: 'La matière ne correspond pas' };
        }
    }

    // Check if they know a class they teach
    if (answers.class) {
        const classMatch = detected.classes.some(c =>
            c.toLowerCase().includes(answers.class.toLowerCase())
        );
        if (!classMatch) {
            return { valid: false, error: 'La classe ne correspond pas' };
        }
    }

    // If no verification data available, allow claim (trust-based for now)
    // In production, you'd want stronger verification
    return { valid: true };
}

export default {
    matchAndLinkTeachers,
    syncStudentFromED,
    fullStudentSync,
    findTeacherByName,
    recordDetectedTeachers,
    getUnclaimedTeachers,
    claimTeacherIdentity,
};
