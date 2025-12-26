/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKLOAD DATA CONTEXT
 * Manages workload data (assignments, DSTs) across the application
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import ecoleDirecteClient from '../api/ecoleDirecte';
import { mockAssignments, mockDSTs, mockClasses } from '../data/mockData';
import {
    calculateDailyWorkload,
    calculateWeeklyWorkload,
    checkForConflicts,
    analyzeDSTSchedule,
    generateWorkloadStats,
    formatDate,
} from '../utils/workloadCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT CREATION
// ─────────────────────────────────────────────────────────────────────────────

const WorkloadContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// WORKLOAD PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function WorkloadProvider({ children }) {
    const { isAuthenticated, userType, user, triggerRelogin } = useAuth();

    // State
    const [assignments, setAssignments] = useState([]);
    const [dsts, setDsts] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    // ─────────────────────────────────────────────────────────────────────────────
    // FETCH DATA
    // ─────────────────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        setError(null);

        try {
            if (userType === 'student') {
                // Fetch real data from the API
                let allAssignments = [];


                // Fetch homework with details
                try {
                    // First get overview of all homework (contains dates)
                    const overview = await ecoleDirecteClient.getHomework();
                    console.log('📚 Homework overview:', overview);

                    if (Array.isArray(overview) && overview.length > 0) {
                        // Get unique dates (ALL of them, no limiting)
                        const uniqueDates = [...new Set(overview.map(h => h.dueDate).filter(Boolean))].sort();
                        console.log('📅 ALL dates with homework from API:', uniqueDates);
                        console.log('📅 Number of unique dates:', uniqueDates.length);

                        // Fetch details for each date
                        for (const date of uniqueDates) {
                            try {
                                const detailed = await ecoleDirecteClient.getHomework(date);
                                if (Array.isArray(detailed)) {
                                    allAssignments.push(...detailed);
                                }
                            } catch (err) {
                                console.warn(`Failed to fetch details for ${date}:`, err);
                            }
                        }

                        // If no detailed fetch worked, use overview
                        if (allAssignments.length === 0) {
                            allAssignments = [...overview];
                        }
                    }

                    console.log('📝 Final assignments:', allAssignments);
                } catch (homeworkErr) {
                    console.warn('Failed to fetch homework:', homeworkErr);
                    // If auth error (401 or "Non authentifié"), trigger relogin modal
                    const errorMessage = homeworkErr?.message || '';
                    const isAuthError = errorMessage.toLowerCase().includes('authentifié') ||
                        errorMessage.toLowerCase().includes('non autorisé') ||
                        homeworkErr?.status === 401 ||
                        homeworkErr?.code === 401;

                    if (isAuthError && triggerRelogin) {
                        triggerRelogin();
                    }
                }

                // Fetch tests (may not be available in all implementations)
                try {
                    if (typeof ecoleDirecteClient.getTests === 'function') {
                        const tests = await ecoleDirecteClient.getTests();
                        if (Array.isArray(tests)) {
                            // Merge tests into assignments if not already present
                            const assignmentIds = new Set(allAssignments.map(a => a.id));
                            tests.forEach(test => {
                                if (!assignmentIds.has(test.id)) {
                                    allAssignments.push(test);
                                }
                            });
                        }
                    }
                } catch (testsErr) {
                    console.warn('Failed to fetch tests:', testsErr);
                }

                // Extract DSTs from assignments
                const dstList = allAssignments.filter(a =>
                    a.type === 'dst' ||
                    a.type === 'test' ||
                    a.weight === 'DST' ||
                    a.weight === 'CONTROL'
                );

                setAssignments(allAssignments);
                setDsts(dstList);

                // Sync workload to Supabase (for teachers to see)
                try {
                    const { syncStudentWorkload } = await import('../services/workloadService');
                    await syncStudentWorkload(
                        {
                            edId: user?.edId || user?.id?.toString(),
                            className: user?.classe || user?.className || user?.class || 'Unknown'
                        },
                        allAssignments
                    );
                    console.log('📊 Workload synced to Supabase');
                } catch (syncErr) {
                    console.warn('Failed to sync workload:', syncErr);
                    // Non-critical, continue anyway
                }
            } else {
                // Teachers: use mock data for now
                const teacherClasses = user?.classes || ['TS1', 'TES2'];
                const filteredAssignments = mockAssignments.filter(
                    a => teacherClasses.includes(a.classId)
                );
                const filteredDSTs = mockDSTs.filter(
                    d => d.classes.some(c => teacherClasses.includes(c))
                );

                setAssignments(filteredAssignments);
                setDsts(filteredDSTs);
                setClasses(mockClasses.filter(c => teacherClasses.includes(c.id)));
            }

            setLastSync(new Date());
        } catch (err) {
            console.error('Failed to fetch workload data:', err);
            setError('Impossible de récupérer les données');

            // Fallback to empty arrays to prevent crashes
            setAssignments([]);
            setDsts([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, userType, user, triggerRelogin]);

    // Auto-fetch on auth change
    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        } else {
            // Clear data on logout
            setAssignments([]);
            setDsts([]);
            setClasses([]);
        }
    }, [isAuthenticated, fetchData]);

    // ─────────────────────────────────────────────────────────────────────────────
    // COMPUTED VALUES
    // ─────────────────────────────────────────────────────────────────────────────

    const todayWorkload = useMemo(() => {
        return calculateDailyWorkload(assignments, new Date());
    }, [assignments]);

    const weekWorkload = useMemo(() => {
        return calculateWeeklyWorkload(assignments, new Date());
    }, [assignments]);

    const dstAnalysis = useMemo(() => {
        return analyzeDSTSchedule(dsts);
    }, [dsts]);

    const stats = useMemo(() => {
        const today = new Date();
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);
        const twoWeeksAhead = new Date(today);
        twoWeeksAhead.setDate(today.getDate() + 14);

        return generateWorkloadStats(assignments, twoWeeksAgo, twoWeeksAhead);
    }, [assignments]);

    // ─────────────────────────────────────────────────────────────────────────────
    // ACTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check if a new assignment would cause conflicts
     */
    const checkConflicts = useCallback((newAssignment) => {
        // Filter assignments for the same class
        const classAssignments = selectedClass
            ? assignments.filter(a => a.classId === selectedClass)
            : assignments;

        return checkForConflicts(classAssignments, newAssignment);
    }, [assignments, selectedClass]);

    /**
     * Add a new assignment (for teachers)
     */
    const addAssignment = useCallback((assignment) => {
        const newAssignment = {
            ...assignment,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        setAssignments(prev => [...prev, newAssignment]);
        return newAssignment;
    }, []);

    /**
     * Remove an assignment
     */
    const removeAssignment = useCallback((assignmentId) => {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    }, []);

    /**
     * Get workload for a specific date
     */
    const getWorkloadForDate = useCallback((date) => {
        const classAssignments = selectedClass
            ? assignments.filter(a => a.classId === selectedClass)
            : assignments;

        return calculateDailyWorkload(classAssignments, date);
    }, [assignments, selectedClass]);

    /**
     * Get workload for a specific week
     */
    const getWorkloadForWeek = useCallback((date) => {
        const classAssignments = selectedClass
            ? assignments.filter(a => a.classId === selectedClass)
            : assignments;

        return calculateWeeklyWorkload(classAssignments, date);
    }, [assignments, selectedClass]);

    /**
     * Get assignments grouped by date
     */
    const getAssignmentsByDate = useCallback(() => {
        const grouped = {};

        assignments.forEach(assignment => {
            const date = formatDate(assignment.dueDate);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(assignment);
        });

        return grouped;
    }, [assignments]);

    /**
     * Update assignment done status (optimistic update)
     */
    const updateAssignmentDone = useCallback((assignmentId, done) => {
        setAssignments(prev => prev.map(a =>
            a.id === assignmentId ? { ...a, done } : a
        ));
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // CONTEXT VALUE
    // ─────────────────────────────────────────────────────────────────────────────

    const value = {
        // State
        assignments,
        dsts,
        classes,
        selectedClass,
        isLoading,
        error,
        lastSync,

        // Computed
        todayWorkload,
        weekWorkload,
        dstAnalysis,
        stats,

        // Actions
        fetchData,
        checkConflicts,
        addAssignment,
        removeAssignment,
        updateAssignmentDone,
        getWorkloadForDate,
        getWorkloadForWeek,
        getAssignmentsByDate,
        setSelectedClass,
        clearError: () => setError(null),
    };

    return (
        <WorkloadContext.Provider value={value}>
            {children}
        </WorkloadContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useWorkload() {
    const context = useContext(WorkloadContext);

    if (!context) {
        throw new Error('useWorkload must be used within a WorkloadProvider');
    }

    return context;
}

export default WorkloadContext;
