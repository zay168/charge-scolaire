/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKLOAD SERVICE - ENHANCED VERSION
 * Manages workload score storage, retrieval and analysis from Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION - SIMPLE SCORING
// ─────────────────────────────────────────────────────────────────────────────

export const WORKLOAD_CONFIG = {
    // Score weights - SIMPLE
    weights: {
        homework: 1,    // Devoir = 1 point
        test: 3         // Contrôle/Évaluation = 3 points
    },

    // Daily thresholds for load status
    thresholds: {
        daily: {
            light: 2,       // 🟢 Score <= 2 = Léger
            medium: 4,      // 🟠 Score 3-4 = Modéré  
            heavy: 6,       // 🔴 Score 5-6 = Chargé
            // > 6 = ❌ Critique
        },
        weekly: {
            light: 10,      // 🟢 Semaine légère
            medium: 18,     // 🟠 Semaine moyenne
            heavy: 25       // 🔴 Semaine chargée
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STUDENT WORKLOAD
// Called when a student logs in to sync their workload data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync a student's workload for all dates with assignments
 * @param {Object} studentData - Student info { edId, className }
 * @param {Array} assignments - Array of assignment objects from EcoleDirecte
 */
export async function syncStudentWorkload(studentData, assignments) {
    const { edId, className } = studentData;

    if (!edId || !className) {
        console.warn('⚠️ Cannot sync workload: missing edId or className');
        return { success: false, error: 'Missing student data' };
    }

    // Get unique dates from all assignments
    const uniqueDates = [...new Set(
        assignments
            .filter(a => a.dueDate)
            .map(a => {
                try {
                    return new Date(a.dueDate).toISOString().split('T')[0];
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
    )].sort();

    if (uniqueDates.length === 0) {
        console.log('ℹ️ No assignment dates to sync');
        return { success: true, count: 0 };
    }

    console.log(`📅 Syncing workload for ${uniqueDates.length} dates: ${uniqueDates[0]} → ${uniqueDates[uniqueDates.length - 1]}`);

    const records = [];

    // Calculate score for each date with assignments
    for (const dateStr of uniqueDates) {
        const dayAssignments = assignments.filter(a => {
            try {
                const dueDate = new Date(a.dueDate).toISOString().split('T')[0];
                return dueDate === dateStr;
            } catch {
                return false;
            }
        });

        // Calculate detailed score
        let totalScore = 0;
        let homeworkCount = 0;
        let testCount = 0;
        const assignmentDetails = [];
        const subjectsWithTests = new Set();

        dayAssignments.forEach(a => {
            // Determine type and weight
            const type = detectAssignmentType(a);
            const weight = WORKLOAD_CONFIG.weights[type] || 1;

            totalScore += weight;

            if (type === 'homework' || type === 'homework_long') {
                homeworkCount++;
            } else {
                testCount++;
                subjectsWithTests.add(a.subject || a.subjectName || 'Inconnu');
            }

            assignmentDetails.push({
                subject: a.subject || a.subjectName || 'Inconnu',
                type: type,
                weight: weight,
                title: a.title || '',
                content: a.content || ''
            });
        });

        // Check if it's a Saturday (potential DST day)
        const date = new Date(dateStr);
        const isSaturday = date.getDay() === 6;

        records.push({
            ed_id: edId,
            class_name: className,
            score_date: dateStr,
            total_score: totalScore,
            homework_count: homeworkCount,
            test_count: testCount,
            is_saturday: isSaturday,
            subjects_with_tests: Array.from(subjectsWithTests),
            assignments: assignmentDetails,
            synced_at: new Date().toISOString()
        });
    }

    try {
        const { error } = await supabase
            .from('workload_scores')
            .upsert(records, {
                onConflict: 'ed_id,score_date',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('❌ Workload sync failed:', error);
            return { success: false, error };
        }

        console.log(`✅ Synced ${records.length} workload records for ${className}`);
        return { success: true, count: records.length };
    } catch (err) {
        console.error('❌ Workload sync error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Detect assignment type: homework (1pt) or test (3pts)
 */
function detectAssignmentType(assignment) {
    const type = (assignment.type || '').toLowerCase();
    const title = (assignment.title || '').toLowerCase();

    // Anything that's a test/evaluation/controle/interro/dst = test (3 points)
    if (type === 'test' || type === 'evaluation' || type === 'dst' ||
        type.includes('contrôle') || type.includes('interro') ||
        title.includes('contrôle') || title.includes('évaluation') ||
        title.includes('interro') || title.includes('dst') ||
        title.includes('devoir surveillé') || title.includes('bac')) {
        return 'test';
    }

    // Everything else = homework (1 point)
    return 'homework';
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CLASS WORKLOAD (FOR TEACHERS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get workload summary for a class over a date range
 */
export async function getClassWorkload(className, startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('class_workload_summary')
            .select('*')
            .eq('class_name', className)
            .gte('score_date', startDate)
            .lte('score_date', endDate)
            .order('score_date', { ascending: true });

        if (error) {
            console.error('❌ Failed to get class workload:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('❌ getClassWorkload error:', err);
        return [];
    }
}

/**
 * Get workload for all classes (for overview)
 */
export async function getAllClassesWorkload(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('class_workload_summary')
            .select('*')
            .gte('score_date', startDate)
            .lte('score_date', endDate)
            .order('score_date', { ascending: true });

        if (error) {
            console.error('❌ Failed to get all classes workload:', error);
            return [];
        }

        // Group by class
        const byClass = {};
        (data || []).forEach(row => {
            if (!byClass[row.class_name]) {
                byClass[row.class_name] = [];
            }
            byClass[row.class_name].push(row);
        });

        return byClass;
    } catch (err) {
        console.error('❌ getAllClassesWorkload error:', err);
        return {};
    }
}

/**
 * Get detailed workload for a specific class on a specific date
 */
export async function getClassWorkloadDetails(className, date) {
    try {
        const { data, error } = await supabase
            .from('workload_scores')
            .select('*')
            .eq('class_name', className)
            .eq('score_date', date);

        if (error) {
            console.error('❌ Failed to get workload details:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('❌ getClassWorkloadDetails error:', err);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS & ALERTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze workload for a class and return alerts
 */
export function analyzeWorkload(workloadData) {
    const alerts = [];
    const stats = {
        totalDays: 0,
        heavyDays: 0,
        criticalDays: 0,
        saturdayCount: 0,
        averageScore: 0,
        weeklyScores: {}
    };

    if (!workloadData || workloadData.length === 0) {
        return { alerts, stats };
    }

    let totalScore = 0;

    workloadData.forEach(day => {
        stats.totalDays++;
        totalScore += day.avg_score || day.total_score || 0;

        const status = getStatusFromScore(day.avg_score || day.total_score || 0);

        if (status === 'heavy') stats.heavyDays++;
        if (status === 'critical') {
            stats.criticalDays++;
            alerts.push({
                type: 'critical',
                date: day.score_date,
                message: `Journée critique le ${formatDateFr(day.score_date)}`,
                score: day.avg_score || day.total_score
            });
        }

        // Saturday alerts
        const date = new Date(day.score_date);
        if (date.getDay() === 6 && (day.test_count > 0 || day.avg_score > 3)) {
            stats.saturdayCount++;
            alerts.push({
                type: 'saturday',
                date: day.score_date,
                message: `DST potentiel le ${formatDateFr(day.score_date)}`,
                testCount: day.test_count
            });
        }

        // Track weekly scores
        const weekStart = getWeekStart(day.score_date);
        if (!stats.weeklyScores[weekStart]) {
            stats.weeklyScores[weekStart] = 0;
        }
        stats.weeklyScores[weekStart] += day.avg_score || day.total_score || 0;
    });

    stats.averageScore = stats.totalDays > 0 ? (totalScore / stats.totalDays).toFixed(1) : 0;

    // Check for overloaded weeks
    Object.entries(stats.weeklyScores).forEach(([week, score]) => {
        if (score > WORKLOAD_CONFIG.thresholds.weekly.heavy) {
            alerts.push({
                type: 'week_overload',
                date: week,
                message: `Semaine surchargée (score: ${score})`,
                score
            });
        }
    });

    return { alerts, stats };
}

/**
 * Get week start date (Monday)
 */
function getWeekStart(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

/**
 * Format date for French display
 */
function formatDateFr(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS & DISPLAY UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get load status color and label
 */
export function getLoadStatusInfo(status) {
    const statusMap = {
        light: {
            color: '#22c55e',
            bgColor: '#dcfce7',
            label: 'Léger',
            emoji: '🟢',
            description: 'Charge de travail légère'
        },
        medium: {
            color: '#f59e0b',
            bgColor: '#fef3c7',
            label: 'Modéré',
            emoji: '🟠',
            description: 'Charge de travail normale'
        },
        heavy: {
            color: '#ef4444',
            bgColor: '#fee2e2',
            label: 'Chargé',
            emoji: '🔴',
            description: 'Attention: charge élevée'
        },
        critical: {
            color: '#dc2626',
            bgColor: '#fecaca',
            label: 'Critique',
            emoji: '❌',
            description: 'Surcharge! Risque de fatigue'
        },
        none: {
            color: '#94a3b8',
            bgColor: '#f1f5f9',
            label: 'Aucun',
            emoji: '⚪',
            description: 'Pas de devoirs'
        }
    };

    return statusMap[status] || statusMap.none;
}

/**
 * Calculate load status from score
 */
export function getStatusFromScore(score) {
    if (score === 0) return 'none';
    if (score <= WORKLOAD_CONFIG.thresholds.daily.light) return 'light';
    if (score <= WORKLOAD_CONFIG.thresholds.daily.medium) return 'medium';
    if (score <= WORKLOAD_CONFIG.thresholds.daily.heavy) return 'heavy';
    return 'critical';
}

/**
 * Get assignment type display info
 */
export function getAssignmentTypeInfo(type) {
    const types = {
        homework: { label: 'Devoir', icon: '📚', color: '#3b82f6', points: 1 },
        test: { label: 'Contrôle', icon: '📝', color: '#ef4444', points: 3 }
    };

    return types[type] || types.homework;
}

/**
 * Calculate weekly summary from daily data
 */
export function calculateWeeklySummary(dailyData) {
    const weeks = {};

    dailyData.forEach(day => {
        const weekStart = getWeekStart(day.score_date);

        if (!weeks[weekStart]) {
            weeks[weekStart] = {
                startDate: weekStart,
                totalScore: 0,
                homeworkCount: 0,
                testCount: 0,
                dayCount: 0,
                heavyDays: 0
            };
        }

        const w = weeks[weekStart];
        const score = day.avg_score || day.total_score || 0;
        w.totalScore += score;
        w.homeworkCount += day.homework_count || 0;
        w.testCount += day.test_count || 0;
        w.dayCount++;

        if (getStatusFromScore(score) === 'heavy' || getStatusFromScore(score) === 'critical') {
            w.heavyDays++;
        }
    });

    return Object.values(weeks).map(w => ({
        ...w,
        averageScore: w.dayCount > 0 ? (w.totalScore / w.dayCount).toFixed(1) : 0,
        status: getStatusFromScore(w.totalScore / 5) // Assuming 5 school days
    }));
}
