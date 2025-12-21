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
    const { isAuthenticated, userType, user } = useAuth();

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
            // In development, use mock data
            if (import.meta.env.DEV) {
                await new Promise(resolve => setTimeout(resolve, 500));

                if (userType === 'student') {
                    // Students see their own class data
                    const homework = await ecoleDirecteClient.getHomework();
                    const tests = await ecoleDirecteClient.getTests();

                    setAssignments([...homework, ...tests]);
                    setDsts(tests.filter(t => t.type === 'dst'));
                } else {
                    // Teachers see aggregated data for their classes
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
            } else {
                // Production: fetch from École Directe
                const homework = await ecoleDirecteClient.getHomework();
                const tests = await ecoleDirecteClient.getTests();

                setAssignments([...homework, ...tests]);
                setDsts(tests.filter(t => t.type === 'dst'));
            }

            setLastSync(new Date());
        } catch (err) {
            console.error('Failed to fetch workload data:', err);
            setError('Impossible de récupérer les données');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, userType, user]);

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
