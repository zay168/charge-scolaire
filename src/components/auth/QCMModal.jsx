/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QCM SECURITY MODAL
 * Handles the École Directe double authentication via security questions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import './QCMModal.css';

export default function QCMModal({ question, propositions, onAnswer, onCancel, isLoading }) {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (selectedAnswer === null) {
            setError('Veuillez sélectionner une réponse');
            return;
        }

        setError(null);
        onAnswer(selectedAnswer);
    };

    return (
        <div className="qcm-modal__overlay">
            <div className="qcm-modal">
                {/* Header */}
                <div className="qcm-modal__header">
                    <div className="qcm-modal__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M12 8v4" />
                            <circle cx="12" cy="16" r="1" />
                        </svg>
                    </div>
                    <h2>Vérification de sécurité</h2>
                    <p className="qcm-modal__subtitle">
                        Pour protéger votre compte, veuillez répondre à cette question
                    </p>
                </div>

                {/* Question */}
                <div className="qcm-modal__question">
                    <p>{question}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="qcm-modal__form">
                    <div className="qcm-modal__options">
                        {propositions.map((proposition, index) => (
                            <label
                                key={index}
                                className={`qcm-modal__option ${selectedAnswer === index ? 'qcm-modal__option--selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="qcm-answer"
                                    value={index}
                                    checked={selectedAnswer === index}
                                    onChange={() => setSelectedAnswer(index)}
                                    disabled={isLoading}
                                />
                                <span className="qcm-modal__option-radio"></span>
                                <span className="qcm-modal__option-text">{proposition}</span>
                            </label>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="qcm-modal__error">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4" />
                                <circle cx="12" cy="16" r="1" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="qcm-modal__actions">
                        <button
                            type="button"
                            className="qcm-modal__btn qcm-modal__btn--cancel"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="qcm-modal__btn qcm-modal__btn--submit"
                            disabled={isLoading || selectedAnswer === null}
                        >
                            {isLoading ? (
                                <>
                                    <span className="qcm-modal__spinner"></span>
                                    Vérification...
                                </>
                            ) : (
                                'Valider'
                            )}
                        </button>
                    </div>
                </form>

                {/* Info */}
                <div className="qcm-modal__info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <circle cx="12" cy="8" r="1" />
                    </svg>
                    <span>
                        Cette question vous est posée car vous vous connectez depuis un nouvel appareil.
                        Votre réponse sera mémorisée pour les prochaines connexions.
                    </span>
                </div>
            </div>
        </div>
    );
}
