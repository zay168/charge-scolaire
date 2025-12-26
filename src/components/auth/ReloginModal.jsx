/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RELOGIN MODAL COMPONENT
 * Floating modal for re-authentication when session expires
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ReloginModal.css';

export function ReloginModal({ isOpen, onClose, onSuccess }) {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Veuillez remplir tous les champs');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(username, password);
            setUsername('');
            setPassword('');
            onSuccess?.();
            onClose?.();
        } catch (err) {
            setError(err.message || 'Échec de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        // Force redirect to login page
        window.location.href = '/';
    };

    if (!isOpen) return null;

    return (
        <div className="relogin-overlay">
            <div className="relogin-modal">
                <div className="relogin-header">
                    <span className="relogin-icon">🔐</span>
                    <h2>Session expirée</h2>
                    <p>Votre session a expiré. Veuillez vous reconnecter pour continuer.</p>
                </div>

                <form className="relogin-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="relogin-error">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="relogin-field">
                        <label htmlFor="relogin-username">Identifiant</label>
                        <input
                            type="text"
                            id="relogin-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Votre identifiant École Directe"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="relogin-field">
                        <label htmlFor="relogin-password">Mot de passe</label>
                        <input
                            type="password"
                            id="relogin-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Votre mot de passe"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="relogin-actions">
                        <button
                            type="submit"
                            className="relogin-btn relogin-btn--primary"
                            disabled={isLoading}
                        >
                            {isLoading ? '⏳ Connexion...' : '🔓 Se reconnecter'}
                        </button>
                        <button
                            type="button"
                            className="relogin-btn relogin-btn--secondary"
                            onClick={handleLogout}
                            disabled={isLoading}
                        >
                            Changer de compte
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReloginModal;
