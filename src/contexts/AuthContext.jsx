/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION CONTEXT
 * Manages user authentication state across the application
 * Supports QCM security verification for École Directe
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';
import { QCMRequiredError } from '../api/realEcoleDirecte';
import { fullStudentSync } from '../services/teacherMatching';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT CREATION
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
    TOKEN: 'cs_token',
    ACCOUNT: 'cs_account',
    USER_TYPE: 'cs_user_type',
    KEEP_LOGGED_IN: 'cs_keep_logged_in',
};

// ─────────────────────────────────────────────────────────────────────────────
// USER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const USER_TYPES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin',
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PROVIDER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null);
    const [error, setError] = useState(null);

    // QCM Security State
    const [qcmRequired, setQcmRequired] = useState(false);
    const [qcmData, setQcmData] = useState(null);
    const [qcmLoading, setQcmLoading] = useState(false);

    // Relogin Modal State
    const [showReloginModal, setShowReloginModal] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────────
    // RESTORE SESSION ON MOUNT
    // ─────────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const restoreSession = async () => {
            try {
                // Check localStorage first (for "keep logged in"), then sessionStorage
                const keepLoggedIn = localStorage.getItem(STORAGE_KEYS.KEEP_LOGGED_IN) === 'true';
                const storage = keepLoggedIn ? localStorage : sessionStorage;

                const storedToken = storage.getItem(STORAGE_KEYS.TOKEN);
                const storedAccount = storage.getItem(STORAGE_KEYS.ACCOUNT);
                const storedUserType = storage.getItem(STORAGE_KEYS.USER_TYPE);

                if (storedToken && storedAccount) {
                    const account = JSON.parse(storedAccount);
                    setUser(account);
                    setUserType(storedUserType || USER_TYPES.STUDENT);
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error('Failed to restore session:', err);
                clearStorage();
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // STORAGE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    const saveToStorage = useCallback((token, account, type, keepLoggedIn = false) => {
        const storage = keepLoggedIn ? localStorage : sessionStorage;

        // Save the preference
        localStorage.setItem(STORAGE_KEYS.KEEP_LOGGED_IN, keepLoggedIn.toString());

        storage.setItem(STORAGE_KEYS.TOKEN, token);
        storage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
        storage.setItem(STORAGE_KEYS.USER_TYPE, type);
    }, []);

    const clearStorage = useCallback(() => {
        // Clear from both storages
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.ACCOUNT);
        sessionStorage.removeItem(STORAGE_KEYS.USER_TYPE);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
        localStorage.removeItem(STORAGE_KEYS.USER_TYPE);
        localStorage.removeItem(STORAGE_KEYS.KEEP_LOGGED_IN);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGIN AS STUDENT (via École Directe)
    // ─────────────────────────────────────────────────────────────────────────────

    const loginAsStudent = useCallback(async (username, password, keepLoggedIn = false) => {
        setIsLoading(true);
        setError(null);
        setQcmRequired(false);
        setQcmData(null);

        try {
            const { token, account } = await ecoleDirecteClient.login(username, password, { rememberMe: keepLoggedIn });

            setUser(account);
            setUserType(USER_TYPES.STUDENT);
            setIsAuthenticated(true);
            saveToStorage(token, account, USER_TYPES.STUDENT, keepLoggedIn);

            // Sync student and match with teachers in background
            fullStudentSync(ecoleDirecteClient).catch(err => {
                console.warn('Teacher matching sync failed (non-blocking):', err.message);
            });

            return { success: true, account };
        } catch (err) {
            // Check if QCM security is required
            if (err instanceof QCMRequiredError || err.code === 250) {
                setQcmRequired(true);
                setQcmData({
                    question: err.question,
                    propositions: err.propositions,
                });
                return { success: false, qcmRequired: true, error: 'Vérification de sécurité requise' };
            }

            setError(err.message || 'Échec de la connexion');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [saveToStorage]);

    // ─────────────────────────────────────────────────────────────────────────────
    // ANSWER QCM SECURITY QUESTION
    // ─────────────────────────────────────────────────────────────────────────────

    const answerQCM = useCallback(async (answerIndex) => {
        setQcmLoading(true);
        setError(null);

        try {
            const { token, account } = await ecoleDirecteClient.answerQCM(answerIndex);

            setUser(account);
            setUserType(USER_TYPES.STUDENT);
            setIsAuthenticated(true);
            setQcmRequired(false);
            setQcmData(null);

            // Get keepLoggedIn from stored credentials
            const keepLoggedIn = localStorage.getItem(STORAGE_KEYS.KEEP_LOGGED_IN) === 'true';
            saveToStorage(token, account, USER_TYPES.STUDENT, keepLoggedIn);

            // Sync student and match with teachers in background
            fullStudentSync(ecoleDirecteClient).catch(err => {
                console.warn('Teacher matching sync failed (non-blocking):', err.message);
            });

            return { success: true, account };
        } catch (err) {
            setError(err.message || 'Réponse incorrecte');
            return { success: false, error: err.message };
        } finally {
            setQcmLoading(false);
        }
    }, [saveToStorage]);

    // ─────────────────────────────────────────────────────────────────────────────
    // CANCEL QCM
    // ─────────────────────────────────────────────────────────────────────────────

    const cancelQCM = useCallback(() => {
        setQcmRequired(false);
        setQcmData(null);
        setError(null);
        if (ecoleDirecteClient.logout) {
            ecoleDirecteClient.logout();
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGIN AS TEACHER (internal account)
    // ─────────────────────────────────────────────────────────────────────────────

    const loginAsTeacher = useCallback(async (email, password, keepLoggedIn = false) => {
        setIsLoading(true);
        setError(null);

        try {
            // In production, this would call your backend API
            // For now, we simulate with mock data
            await new Promise(resolve => setTimeout(resolve, 500));

            // Demo teacher accounts
            const demoTeachers = {
                'demo@prof.fr': {
                    id: 'T001',
                    firstName: 'Marie',
                    lastName: 'Martin',
                    email: 'demo@prof.fr',
                    subjects: ['Mathématiques'],
                    classes: ['TS1', 'TES2', '1S3'],
                    school: 'Lycée Demo',
                },
                'prof@test.fr': {
                    id: 'T002',
                    firstName: 'Pierre',
                    lastName: 'Dubois',
                    email: 'prof@test.fr',
                    subjects: ['Français', 'Littérature'],
                    classes: ['TS1', 'TL2'],
                    school: 'Lycée Demo',
                },
            };

            const teacher = demoTeachers[email.toLowerCase()];

            if (!teacher || password !== 'demo') {
                throw new Error('Identifiants incorrects');
            }

            const token = 'teacher-token-' + Date.now();

            setUser(teacher);
            setUserType(USER_TYPES.TEACHER);
            setIsAuthenticated(true);
            saveToStorage(token, teacher, USER_TYPES.TEACHER, keepLoggedIn);

            return { success: true, account: teacher };
        } catch (err) {
            setError(err.message || 'Échec de la connexion');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [saveToStorage]);

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────────────────────────────────────────────

    const logout = useCallback(() => {
        ecoleDirecteClient.logout();
        setUser(null);
        setUserType(null);
        setIsAuthenticated(false);
        setError(null);
        setShowReloginModal(false);
        clearStorage();
    }, [clearStorage]);

    // ───────────────────────────────────────────────────────────────────────────────
    // TRIGGER RELOGIN MODAL (call this when 'Non authentifié' error occurs)
    // ───────────────────────────────────────────────────────────────────────────────

    const triggerRelogin = useCallback(() => {
        setShowReloginModal(true);
    }, []);

    const closeReloginModal = useCallback(() => {
        setShowReloginModal(false);
    }, []);

    // Unified login function for relogin modal
    const login = useCallback(async (username, password) => {
        return await loginAsStudent(username, password, true);
    }, [loginAsStudent]);

    // ─────────────────────────────────────────────────────────────────────────────
    // CONTEXT VALUE
    // ─────────────────────────────────────────────────────────────────────────────

    const value = {
        isLoading,
        isAuthenticated,
        user,
        userType,
        error,
        isStudent: userType === USER_TYPES.STUDENT,
        isTeacher: userType === USER_TYPES.TEACHER,
        isAdmin: userType === USER_TYPES.ADMIN,

        // QCM Security
        qcmRequired,
        qcmData,
        qcmLoading,
        answerQCM,
        cancelQCM,

        // Auth Actions
        loginAsStudent,
        loginAsTeacher,
        login,
        logout,
        clearError: () => setError(null),

        // Relogin Modal
        showReloginModal,
        triggerRelogin,
        closeReloginModal,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

export default AuthContext;
