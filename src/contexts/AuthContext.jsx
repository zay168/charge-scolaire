/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION CONTEXT
 * Manages user authentication state across the application
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';

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

    // ─────────────────────────────────────────────────────────────────────────────
    // RESTORE SESSION ON MOUNT
    // ─────────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const storedToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
                const storedAccount = sessionStorage.getItem(STORAGE_KEYS.ACCOUNT);
                const storedUserType = sessionStorage.getItem(STORAGE_KEYS.USER_TYPE);

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

    const saveToStorage = useCallback((token, account, type) => {
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
        sessionStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
        sessionStorage.setItem(STORAGE_KEYS.USER_TYPE, type);
    }, []);

    const clearStorage = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.ACCOUNT);
        sessionStorage.removeItem(STORAGE_KEYS.USER_TYPE);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGIN AS STUDENT (via École Directe)
    // ─────────────────────────────────────────────────────────────────────────────

    const loginAsStudent = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);

        try {
            const { token, account } = await ecoleDirecteClient.login(username, password);

            setUser(account);
            setUserType(USER_TYPES.STUDENT);
            setIsAuthenticated(true);
            saveToStorage(token, account, USER_TYPES.STUDENT);

            return { success: true, account };
        } catch (err) {
            setError(err.message || 'Échec de la connexion');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [saveToStorage]);

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGIN AS TEACHER (internal account)
    // ─────────────────────────────────────────────────────────────────────────────

    const loginAsTeacher = useCallback(async (email, password) => {
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
            saveToStorage(token, teacher, USER_TYPES.TEACHER);

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
        clearStorage();
    }, [clearStorage]);

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
        loginAsStudent,
        loginAsTeacher,
        logout,
        clearError: () => setError(null),
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
