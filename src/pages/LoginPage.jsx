/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGIN PAGE
 * Authentication page for students and teachers
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, USER_TYPES } from '../contexts/AuthContext';
import './LoginPage.css';

export function LoginPage() {
    const navigate = useNavigate();
    const { loginAsStudent, loginAsTeacher, isLoading, error, clearError } = useAuth();

    const [loginType, setLoginType] = useState(USER_TYPES.STUDENT);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearError();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { username, password } = formData;

        if (!username || !password) return;

        let result;
        if (loginType === USER_TYPES.STUDENT) {
            result = await loginAsStudent(username, password);
        } else {
            result = await loginAsTeacher(username, password);
        }

        if (result.success) {
            navigate('/');
        }
    };

    const toggleLoginType = (type) => {
        setLoginType(type);
        setFormData({ username: '', password: '' });
        clearError();
    };

    return (
        <div className="login-page">
            {/* Background decoration */}
            <div className="login-page__background">
                <div className="login-page__blob login-page__blob--1"></div>
                <div className="login-page__blob login-page__blob--2"></div>
                <div className="login-page__blob login-page__blob--3"></div>
            </div>

            <main className="login-page__content">
                {/* Hero section */}
                <section className="login-page__hero">
                    <div className="login-page__brand">
                        <span className="login-page__logo">📚</span>
                        <h1 className="login-page__title">Charge Scolaire</h1>
                    </div>
                    <p className="login-page__subtitle">
                        Visualisez et gérez la charge de travail scolaire intelligemment
                    </p>

                    <div className="login-page__features">
                        <div className="login-page__feature">
                            <span className="login-page__feature-icon">📊</span>
                            <span>Analyse de charge</span>
                        </div>
                        <div className="login-page__feature">
                            <span className="login-page__feature-icon">⚠️</span>
                            <span>Alertes surcharge</span>
                        </div>
                        <div className="login-page__feature">
                            <span className="login-page__feature-icon">📅</span>
                            <span>Planning intelligent</span>
                        </div>
                    </div>
                </section>

                {/* Login form */}
                <section className="login-page__form-container">
                    <div className="login-card">
                        {/* Tab switcher */}
                        <div className="login-card__tabs">
                            <button
                                type="button"
                                className={`login-card__tab ${loginType === USER_TYPES.STUDENT ? 'login-card__tab--active' : ''}`}
                                onClick={() => toggleLoginType(USER_TYPES.STUDENT)}
                            >
                                <span className="login-card__tab-icon">🎓</span>
                                Élève
                            </button>
                            <button
                                type="button"
                                className={`login-card__tab ${loginType === USER_TYPES.TEACHER ? 'login-card__tab--active' : ''}`}
                                onClick={() => toggleLoginType(USER_TYPES.TEACHER)}
                            >
                                <span className="login-card__tab-icon">👨‍🏫</span>
                                Professeur
                            </button>
                        </div>

                        <form className="login-card__form" onSubmit={handleSubmit}>
                            <h2 className="login-card__title">
                                {loginType === USER_TYPES.STUDENT
                                    ? 'Connexion Élève'
                                    : 'Connexion Professeur'
                                }
                            </h2>

                            <p className="login-card__description">
                                {loginType === USER_TYPES.STUDENT
                                    ? 'Utilisez vos identifiants École Directe'
                                    : 'Utilisez votre compte professeur'
                                }
                            </p>

                            {error && (
                                <div className="login-card__error">
                                    <span>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className="login-card__field">
                                <label className="label" htmlFor="username">
                                    {loginType === USER_TYPES.STUDENT ? 'Identifiant' : 'Email'}
                                </label>
                                <input
                                    className="input"
                                    type={loginType === USER_TYPES.TEACHER ? 'email' : 'text'}
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder={loginType === USER_TYPES.STUDENT
                                        ? 'Votre identifiant École Directe'
                                        : 'votre.email@lycee.fr'
                                    }
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            <div className="login-card__field">
                                <label className="label" htmlFor="password">
                                    Mot de passe
                                </label>
                                <input
                                    className="input"
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn--primary login-card__submit"
                                disabled={isLoading || !formData.username || !formData.password}
                            >
                                {isLoading ? 'Connexion...' : 'Se connecter'}
                            </button>

                            {loginType === USER_TYPES.TEACHER && (
                                <p className="login-card__demo-hint">
                                    <strong>Demo:</strong> demo@prof.fr / demo
                                </p>
                            )}

                            {loginType === USER_TYPES.STUDENT && (
                                <p className="login-card__demo-hint">
                                    <strong>Demo:</strong> Utilisez n'importe quels identifiants
                                </p>
                            )}
                        </form>

                        <div className="login-card__footer">
                            <p className="login-card__privacy">
                                🔒 Vos identifiants ne sont jamais stockés
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default LoginPage;
