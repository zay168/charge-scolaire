/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEACHER LOGIN PAGE - Version 3.0
 * Secure teacher authentication via École Directe
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import realEcoleDirecteClient, { QCMRequiredError } from '../../api/realEcoleDirecte';
import './TeacherLogin.css';

// Debug mode
const DEBUG = true;
const log = (...args) => DEBUG && console.log('🔐 [TeacherAuth]', ...args);

// DEV MODE - Enable quick login for testing (only in development)
const DEV_MODE = import.meta.env.DEV;

export function TeacherLoginPage() {
    const navigate = useNavigate();

    // Mode: 'choice' | 'ed-login' | 'ed-qcm' | 'email-login' | 'welcome'
    const [mode, setMode] = useState('choice');

    // Common state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // École Directe login state
    const [edUsername, setEdUsername] = useState('');
    const [edPassword, setEdPassword] = useState('');
    const [qcmData, setQcmData] = useState(null);

    // Email login state
    const [loginEmail, setLoginEmail] = useState('');

    // Welcome screen data (after first ED login)
    const [welcomeData, setWelcomeData] = useState(null);

    // ═══════════════════════════════════════════════════════════════════════════
    // ÉCOLE DIRECTE LOGIN (Primary method for new teachers)
    // ═══════════════════════════════════════════════════════════════════════════

    // DEV: Simulate ED login for testing the full UX
    const SIMULATE_ED = DEV_MODE && edUsername.toLowerCase() === 'demo';

    const handleEdLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        log('Attempting École Directe login for:', edUsername);

        // ─── DEV: Simulation mode ───────────────────────────────────────────────
        if (SIMULATE_ED) {
            log('🧪 SIMULATION MODE: Simulating ED login flow');
            await new Promise(r => setTimeout(r, 800)); // Fake loading

            // Simulate QCM challenge (50% chance)
            if (Math.random() > 0.5) {
                log('🧪 Simulating QCM challenge...');
                setQcmData({
                    question: 'Quel est votre mois de naissance ?',
                    propositions: ['Janvier', 'Février', 'Mars', 'Avril']
                });
                setMode('ed-qcm');
                setLoading(false);
                return;
            }

            // Simulate successful login
            const mockAccount = {
                id: Date.now(), // Unique ID each time
                type: 'P',
                firstName: 'Jean',
                lastName: 'DUPONT',
                email: `demo-${Date.now()}@test.local`,
                school: 'Lycée Démonstration'
            };

            try {
                log('🧪 Simulated account:', mockAccount);
                await createTeacherFromED(mockAccount);
            } catch (err) {
                log('🧪 Simulation error:', err.message);
                setError(err.message);
            } finally {
                setLoading(false);
            }
            return;
        }
        // ─────────────────────────────────────────────────────────────────────────

        try {
            // Use the same client as students (handles extension/proxy)
            const { account } = await realEcoleDirecteClient.login(edUsername, edPassword);

            log('ED Login successful!');
            log('📋 Full account data:', JSON.stringify(account, null, 2));
            log('📋 Account type:', account.type);
            log('📋 Account typeCompte (raw):', account.typeCompte);

            // List of accepted teacher account types
            // P = Professeur, A = Académique (some schools use this)
            const TEACHER_TYPES = ['P', 'A', 'T'];

            // Verify this is a teacher account
            if (!TEACHER_TYPES.includes(account.type)) {
                realEcoleDirecteClient.logout();

                let errorMsg;
                if (account.type === 'E') {
                    errorMsg = 'Ce compte est un compte élève. Utilisez l\'espace élève pour vous connecter.';
                } else if (account.type === '1' || account.type === 'F') {
                    errorMsg = 'Ce compte est un compte famille/parent. Seuls les comptes professeur sont acceptés.';
                } else {
                    errorMsg = `Type de compte "${account.type}" non reconnu. Contactez le support si vous êtes bien professeur.`;
                }

                throw new Error(errorMsg);
            }

            log('✅ Confirmed teacher account:', account.firstName, account.lastName);

            // Store credentials for silent reconnection on page reload
            realEcoleDirecteClient.storeCredentials(edUsername, edPassword);

            // Create or update teacher in Supabase
            await createTeacherFromED(account);

        } catch (err) {
            log('ED Login error:', err.message);

            // Handle QCM security challenge
            if (err instanceof QCMRequiredError || err.code === 250) {
                log('QCM required, showing challenge...');
                setQcmData({
                    question: err.question,
                    propositions: err.propositions
                });
                setMode('ed-qcm');
                setLoading(false);
                return;
            }

            setError(err.message || 'Échec de la connexion École Directe');
        } finally {
            setLoading(false);
        }
    };

    // Handle QCM answer
    const handleQcmAnswer = async (answerIndex) => {
        setError(null);
        setLoading(true);
        log('Answering QCM with index:', answerIndex);

        // ─── DEV: Simulation mode ───────────────────────────────────────────────
        if (DEV_MODE && qcmData?.question === 'Quel est votre mois de naissance ?') {
            log('🧪 SIMULATION MODE: Simulating QCM answer');
            await new Promise(r => setTimeout(r, 600)); // Fake loading

            const mockAccount = {
                id: 99999,
                type: 'P',
                firstName: 'Jean',
                lastName: 'DUPONT',
                email: 'jean.dupont@lycee-demo.fr',
                school: 'Lycée Démonstration'
            };
            await createTeacherFromED(mockAccount);
            return;
        }
        // ─────────────────────────────────────────────────────────────────────────

        try {
            const { account } = await realEcoleDirecteClient.answerQCM(answerIndex);

            log('QCM answered, account type:', account.type);

            // Verify teacher account
            if (account.type !== 'P') {
                realEcoleDirecteClient.logout();
                throw new Error('Ce compte n\'est pas un compte professeur.');
            }

            await createTeacherFromED(account);

        } catch (err) {
            log('QCM error:', err.message);
            setError(err.message || 'Réponse incorrecte');
        } finally {
            setLoading(false);
        }
    };

    // Create teacher account in Supabase from ED data
    const createTeacherFromED = async (edAccount) => {
        log('Creating/updating teacher in Supabase from ED data...');

        const teacherName = `${edAccount.firstName} ${edAccount.lastName}`.trim();
        const normalizedName = edAccount.lastName?.toUpperCase() || teacherName.toUpperCase();
        const email = edAccount.email || `${edAccount.id}@ed-prof.local`;

        try {
            // Check if teacher already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('ed_id', edAccount.id.toString())
                .maybeSingle();

            let userId;
            let isNewUser = false;

            if (existingUser) {
                log('Teacher exists, updating...');
                // Update existing teacher
                await supabase
                    .from('users')
                    .update({
                        name: teacherName,
                        email: email,
                        ed_teacher_name: normalizedName,
                        establishment: edAccount.school,
                        last_sync: new Date().toISOString(),
                    })
                    .eq('id', existingUser.id);

                userId = existingUser.id;
                isNewUser = false;
            } else {
                log('Creating new teacher...');
                // Create new teacher
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        ed_id: edAccount.id.toString(),
                        email: email,
                        name: teacherName,
                        first_name: edAccount.firstName,
                        role: 'teacher',
                        ed_teacher_name: normalizedName,
                        establishment: edAccount.school,
                        last_sync: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (insertError) {
                    // Handle duplicate email
                    if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
                        throw new Error('Un compte avec cet email existe déjà. Utilisez la connexion par email.');
                    }
                    throw insertError;
                }

                userId = newUser.id;
                isNewUser = true;
            }

            log('✅ Teacher saved in Supabase, id:', userId);

            // Store session
            localStorage.setItem('teacher_session', JSON.stringify({
                userId: userId,
                edId: edAccount.id,
                name: teacherName,
                role: 'teacher',
                establishment: edAccount.school,
                loginMethod: 'ecoledirecte'
            }));

            // For new users, show welcome screen with recovered email
            if (isNewUser) {
                setWelcomeData({
                    name: teacherName,
                    email: email,
                    establishment: edAccount.school
                });
                setMode('welcome');
                setLoading(false);
            } else {
                // Returning user, go directly to dashboard
                setSuccess('✅ Connexion réussie !');
                setTimeout(() => navigate('/teacher'), 500);
            }

        } catch (err) {
            log('Supabase error:', err.message);
            throw new Error('Erreur lors de la création du compte: ' + err.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL LOGIN - For returning users
    // ═══════════════════════════════════════════════════════════════════════════

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        log('Attempting email login for:', loginEmail);

        try {
            // Find user by email
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email', loginEmail.trim().toLowerCase())
                .eq('role', 'teacher')
                .maybeSingle();

            if (userError) throw new Error('Erreur de base de données');

            if (!userData) {
                throw new Error('Aucun compte professeur trouvé avec cet email. Connectez-vous d\'abord via École Directe pour créer votre compte.');
            }

            // Store session
            localStorage.setItem('teacher_session', JSON.stringify({
                userId: userData.id,
                edId: userData.ed_id,
                name: userData.name,
                role: 'teacher',
                establishment: userData.establishment,
                loginMethod: 'email'
            }));

            log('✅ Email login successful');
            setSuccess('✅ Connexion réussie !');
            setTimeout(() => navigate('/teacher'), 500);

        } catch (err) {
            log('Email login error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // DEV MODE - Quick login for testing
    // ═══════════════════════════════════════════════════════════════════════════

    const handleDevLogin = async () => {
        log('🧪 DEV MODE: Quick login');
        setLoading(true);

        try {
            // Create or get test teacher
            const testEmail = 'dev-teacher@test.local';
            const testName = 'Prof Test (DEV)';

            let { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', testEmail)
                .maybeSingle();

            if (!existingUser) {
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        email: testEmail,
                        name: testName,
                        role: 'teacher',
                        ed_teacher_name: 'TEST',
                        establishment: 'Établissement Test',
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                existingUser = newUser;
            }

            localStorage.setItem('teacher_session', JSON.stringify({
                userId: existingUser.id,
                name: testName,
                role: 'teacher',
                establishment: 'Établissement Test',
                loginMethod: 'dev'
            }));

            log('✅ DEV login successful');
            navigate('/teacher');
        } catch (err) {
            log('DEV login error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="teacher-login">
            <div className="teacher-login__container">
                {/* Header */}
                <div className="teacher-login__header">
                    <div className="teacher-login__logo">
                        <span className="teacher-login__logo-icon">👨‍🏫</span>
                        <span className="teacher-login__logo-text">Espace Professeur</span>
                    </div>
                    <h1 className="teacher-login__title">
                        {mode === 'choice' && 'Connexion Professeur'}
                        {mode === 'ed-login' && 'Connexion École Directe'}
                        {mode === 'ed-qcm' && 'Vérification de sécurité'}
                    </h1>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    CHOICE MODE
                    ═══════════════════════════════════════════════════════════════ */}
                {mode === 'choice' && (
                    <div className="teacher-login__choice">
                        <div className="teacher-login__choice-info">
                            <p>🔐 <strong>Connexion Professeur</strong></p>
                            <p>Utilisez vos identifiants École Directe pour vous connecter.</p>
                        </div>

                        <button
                            className="teacher-login__choice-btn teacher-login__choice-btn--primary"
                            onClick={() => setMode('ed-login')}
                        >
                            <span className="teacher-login__choice-icon">🏫</span>
                            <span className="teacher-login__choice-label">
                                <strong>Connexion École Directe</strong>
                                <small>Première connexion ou compte ED</small>
                            </span>
                        </button>

                        <div className="teacher-login__choice-divider">
                            <span>ou</span>
                        </div>

                        <button
                            className="teacher-login__choice-btn teacher-login__choice-btn--secondary"
                            onClick={() => setMode('email-login')}
                        >
                            <span className="teacher-login__choice-icon">📧</span>
                            <span className="teacher-login__choice-label">
                                <strong>Connexion par email</strong>
                                <small>Pour les comptes déjà créés</small>
                            </span>
                        </button>

                        {/* DEV MODE */}
                        {DEV_MODE && (
                            <>
                                <div className="teacher-login__choice-divider">
                                    <span>dev</span>
                                </div>
                                <button
                                    type="button"
                                    className="teacher-login__choice-btn teacher-login__choice-btn--dev"
                                    onClick={handleDevLogin}
                                    disabled={loading}
                                >
                                    <span className="teacher-login__choice-icon">🧪</span>
                                    <span className="teacher-login__choice-label">
                                        <strong>Mode Développeur</strong>
                                        <small>Connexion rapide sans ED</small>
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    ED LOGIN
                    ═══════════════════════════════════════════════════════════════ */}
                {mode === 'ed-login' && (
                    <form className="teacher-login__form" onSubmit={handleEdLogin}>
                        <div className="teacher-login__ed-info">
                            <p>📋 Utilisez vos identifiants <strong>École Directe professeur</strong>.</p>
                            <p className="teacher-login__ed-hint">
                                Ce sont les mêmes que ceux utilisés sur ecoledirecte.com
                            </p>
                        </div>

                        {DEV_MODE && (
                            <div className="teacher-login__dev-hint">
                                🧪 <strong>Mode dev:</strong> Tapez <code>demo</code> pour simuler
                            </div>
                        )}

                        <div className="teacher-login__field">
                            <label htmlFor="ed-username">Identifiant École Directe</label>
                            <input
                                id="ed-username"
                                type="text"
                                value={edUsername}
                                onChange={(e) => setEdUsername(e.target.value)}
                                placeholder="Votre identifiant ED"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="teacher-login__field">
                            <label htmlFor="ed-password">Mot de passe</label>
                            <input
                                id="ed-password"
                                type="password"
                                value={edPassword}
                                onChange={(e) => setEdPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && <div className="teacher-login__error">❌ {error}</div>}
                        {success && <div className="teacher-login__success">{success}</div>}

                        <button type="submit" className="teacher-login__submit" disabled={loading}>
                            {loading ? <span className="teacher-login__spinner" /> : 'Se connecter via École Directe'}
                        </button>

                        <button
                            type="button"
                            className="teacher-login__back-btn"
                            onClick={() => { setMode('choice'); setError(null); }}
                        >
                            ← Retour
                        </button>
                    </form>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    QCM
                    ═══════════════════════════════════════════════════════════════ */}
                {mode === 'ed-qcm' && qcmData && (
                    <div className="teacher-login__qcm">
                        <div className="teacher-login__qcm-header">
                            <span className="teacher-login__qcm-icon">🔐</span>
                            <h3>Vérification de sécurité</h3>
                            <p>École Directe demande une vérification pour valider cette connexion.</p>
                        </div>

                        <div className="teacher-login__qcm-question">
                            {qcmData.question}
                        </div>

                        <div className="teacher-login__qcm-options">
                            {qcmData.propositions.map((prop, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className="teacher-login__qcm-option"
                                    onClick={() => handleQcmAnswer(index)}
                                    disabled={loading}
                                >
                                    {prop}
                                </button>
                            ))}
                        </div>

                        {error && <div className="teacher-login__error">❌ {error}</div>}

                        <button
                            type="button"
                            className="teacher-login__back-btn"
                            onClick={() => {
                                setMode('ed-login');
                                setError(null);
                                setQcmData(null);
                                realEcoleDirecteClient.logout();
                            }}
                        >
                            ← Annuler
                        </button>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    WELCOME - Account confirmation with recovered data
                    ═══════════════════════════════════════════════════════════════ */}
                {mode === 'welcome' && welcomeData && (
                    <div className="teacher-login__welcome">
                        <div className="teacher-login__welcome-icon">✅</div>
                        <h2>Vérification de vos informations</h2>

                        <div className="teacher-login__welcome-info">
                            <p>Nous avons récupéré ces informations depuis votre compte École Directe :</p>
                        </div>

                        <div className="teacher-login__info-card">
                            <div className="teacher-login__info-row">
                                <span className="teacher-login__info-label">👤 Nom</span>
                                <span className="teacher-login__info-value">{welcomeData.name}</span>
                            </div>
                            <div className="teacher-login__info-row">
                                <span className="teacher-login__info-label">📧 Email</span>
                                <span className="teacher-login__info-value teacher-login__info-value--highlight">{welcomeData.email}</span>
                            </div>
                            <div className="teacher-login__info-row">
                                <span className="teacher-login__info-label">🏫 Établissement</span>
                                <span className="teacher-login__info-value">{welcomeData.establishment || 'Non renseigné'}</span>
                            </div>
                        </div>

                        <div className="teacher-login__welcome-note">
                            <p>
                                <strong>💡 Pour vos prochaines connexions :</strong><br />
                                Vous pourrez utiliser l'email <strong>{welcomeData.email}</strong> directement.
                            </p>
                        </div>

                        <div className="teacher-login__confirm-question">
                            <p>Ces informations sont-elles correctes ?</p>
                        </div>

                        <button
                            className="teacher-login__submit"
                            onClick={() => navigate('/teacher')}
                        >
                            ✅ Oui, continuer
                        </button>

                        <button
                            type="button"
                            className="teacher-login__back-btn"
                            onClick={() => {
                                localStorage.removeItem('teacher_session');
                                setMode('choice');
                                setWelcomeData(null);
                            }}
                        >
                            ❌ Non, recommencer
                        </button>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    EMAIL LOGIN - Quick login with email
                    ═══════════════════════════════════════════════════════════════ */}
                {mode === 'email-login' && (
                    <form className="teacher-login__form" onSubmit={handleEmailLogin}>
                        <div className="teacher-login__ed-info">
                            <p>📧 Connectez-vous avec l'email récupéré depuis École Directe.</p>
                        </div>

                        <div className="teacher-login__field">
                            <label htmlFor="login-email">Adresse email</label>
                            <input
                                id="login-email"
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="votre.email@exemple.fr"
                                required
                                autoFocus
                            />
                        </div>

                        {error && <div className="teacher-login__error">❌ {error}</div>}
                        {success && <div className="teacher-login__success">{success}</div>}

                        <button type="submit" className="teacher-login__submit" disabled={loading}>
                            {loading ? <span className="teacher-login__spinner" /> : 'Se connecter'}
                        </button>

                        <button
                            type="button"
                            className="teacher-login__back-btn"
                            onClick={() => { setMode('choice'); setError(null); }}
                        >
                            ← Retour
                        </button>
                    </form>
                )}

                {/* Back to student login */}
                <Link to="/login" className="teacher-login__back">
                    ← Retour à l'espace élève
                </Link>
            </div>

            {/* Background */}
            <div className="teacher-login__bg">
                <div className="teacher-login__bg-circle teacher-login__bg-circle--1" />
                <div className="teacher-login__bg-circle teacher-login__bg-circle--2" />
            </div>
        </div>
    );
}

export default TeacherLoginPage;
