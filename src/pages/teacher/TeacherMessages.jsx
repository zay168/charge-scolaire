import React, { useState, useEffect } from 'react';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import { useOutletContext } from 'react-router-dom';
import './TeacherMessages.css';

export function TeacherMessages() {
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const data = await realEcoleDirecteClient.getTeacherMessages();
            setMessages(data.messages?.recus || []);
        } catch (err) {
            console.error(err);
            setError("Impossible de charger les messages.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMessage = async (msg) => {
        setSelectedMessage(msg);

        // If content not loaded yet (or empty string/null), fetch it
        // The list view usually gives basic info, content needs detail fetch
        if (!msg.content || msg.content === "") {
            setContentLoading(true);
            try {
                const fullMsg = await realEcoleDirecteClient.getTeacherMessageContent(msg.id);

                // Merge data
                const updatedMsg = { ...msg, ...fullMsg };

                // Update list cache so we don't fetch again
                setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
                // Update selected View
                setSelectedMessage(updatedMsg);
            } catch (err) {
                console.error(err);
            } finally {
                setContentLoading(false);
            }
        }
    };

    // Gmail-style avatar colors - consistent per sender
    const AVATAR_COLORS = [
        '#1a73e8', '#ea4335', '#fbbc04', '#34a853', '#ff6d01',
        '#46bdc6', '#7baaf7', '#f07b72', '#a142f4', '#24c1e0',
        '#5f6368', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722',
    ];

    const getAvatarColor = (name) => {
        if (!name) return AVATAR_COLORS[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    };

    // Helper: Get Initials
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ').filter(p => p);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // Filter messages
    const filteredMessages = messages.filter(m => {
        const term = searchTerm.toLowerCase();
        const sender = (m.from?.nom || m.expediteur || '').toLowerCase();
        const senderFirst = (m.from?.prenom || '').toLowerCase();
        const subject = (m.subject || m.objet || '').toLowerCase();
        return sender.includes(term) || senderFirst.includes(term) || subject.includes(term);
    });

    return (
        <div className="tm-container">
            {/* Sidebar */}
            <div className="tm-sidebar">
                <div className="tm-search-container">
                    <input
                        type="text"
                        placeholder="Rechercher un message..."
                        className="tm-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}
                </div>

                <div className="tm-list">
                    {loading && (
                        <div style={{ padding: '1rem' }}>
                            {[1, 2, 3].map(i => <div key={i} className="tm-loading" style={{ height: '80px', marginBottom: '10px' }}></div>)}
                        </div>
                    )}

                    {filteredMessages.map(msg => {
                        const senderName = `${msg.from?.prenom || ''} ${msg.from?.nom || ''}`.trim();
                        const avatarColor = getAvatarColor(senderName);

                        return (
                            <div
                                key={msg.id}
                                onClick={() => handleSelectMessage(msg)}
                                className={`tm-item ${selectedMessage?.id === msg.id ? 'tm-item--selected' : ''} ${!msg.read ? 'tm-item--unread' : ''}`}
                            >
                                {/* Avatar */}
                                <div
                                    className="tm-item-avatar"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {getInitials(senderName)}
                                </div>

                                {/* Message Info */}
                                <div className="tm-item-content">
                                    <div className="tm-item-header">
                                        <div className="tm-sender">{senderName || 'Inconnu'}</div>
                                        <div className="tm-date">
                                            {new Date(msg.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                        </div>
                                    </div>
                                    <div className="tm-subject">{msg.subject || msg.objet || '(Sans objet)'}</div>
                                    <div className="tm-preview">{msg.apercu || "..."}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="tm-content">
                {selectedMessage ? (
                    <>
                        {contentLoading && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px' }} className="tm-loading"></div>
                        )}
                        <header className="tm-content-header">
                            <h2 className="tm-subject-large">{selectedMessage.subject || selectedMessage.objet}</h2>
                            <div className="tm-meta-row">
                                <div
                                    className="tm-avatar"
                                    style={{ backgroundColor: getAvatarColor(`${selectedMessage.from?.prenom || ''} ${selectedMessage.from?.nom || ''}`) }}
                                >
                                    {getInitials((selectedMessage.from?.prenom || '') + ' ' + (selectedMessage.from?.nom || '?'))}
                                </div>
                                <div className="tm-meta-info">
                                    <div className="tm-sender-name">
                                        {selectedMessage.from?.prenom} {selectedMessage.from?.nom}
                                    </div>
                                    <div className="tm-meta-details">
                                        {new Date(selectedMessage.date).toLocaleString('fr-FR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                        {' • '}
                                        {selectedMessage.to ? `À ${selectedMessage.to.length} destinataire(s)` : 'Moi'}
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="tm-body-container">
                            <div
                                className="tm-message-body"
                                dangerouslySetInnerHTML={{
                                    __html: (() => {
                                        try {
                                            if (!selectedMessage.content) return '';
                                            // Handle Base64 decoding if needed
                                            // Simple heuristic: if no HTML tags and length > 0, assume base64
                                            // Or simply try decoding
                                            if (!selectedMessage.content.includes('<') && selectedMessage.content.length > 0) {
                                                try {
                                                    return decodeURIComponent(escape(window.atob(selectedMessage.content)));
                                                } catch {
                                                    // Fallback if not base64
                                                    return selectedMessage.content;
                                                }
                                            }
                                            return selectedMessage.content;
                                        } catch {
                                            return selectedMessage.content;
                                        }
                                    })()
                                }}
                            />

                            {/* Attachments */}
                            {selectedMessage.files && selectedMessage.files.length > 0 && (
                                <div className="tm-attachments">
                                    <div className="tm-attachments-title">Pièces Jointes ({selectedMessage.files.length})</div>
                                    <div className="tm-attachments-grid">
                                        {selectedMessage.files.map(f => (
                                            <div
                                                key={f.id}
                                                className="tm-attachment-chip"
                                                onClick={() => realEcoleDirecteClient.downloadAttachment(f.id, f.type || 'PIECE_JOINTE', f.libelle)}
                                            >
                                                <span>📎</span>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                                    {f.libelle}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="tm-empty-state">
                        <div className="tm-empty-icon">📬</div>
                        <div className="tm-empty-text">Sélectionnez un message pour le lire</div>
                    </div>
                )}
            </div>
        </div>
    );
}
