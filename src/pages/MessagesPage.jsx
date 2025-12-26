/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGES PAGE
 * Premium messaging interface for Ecole Directe
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
// import { useAuth } from '../contexts/AuthContext';
import ecoleDirecteClient from '../api/ecoleDirecte';
import { LoadIndicator } from '../components/ui/LoadIndicator';
import './MessagesPage.css';

// Helper: Get file icon based on extension
function getFileIcon(ext) {
    const icons = {
        pdf: '📕',
        doc: '📘', docx: '📘',
        xls: '📗', xlsx: '📗',
        ppt: '📙', pptx: '📙',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
        mp3: '🎵', wav: '🎵', ogg: '🎵',
        mp4: '🎬', mov: '🎬', avi: '🎬',
        zip: '📦', rar: '📦', '7z': '📦',
        txt: '📄', csv: '📄',
    };
    return icons[ext] || '📎';
}

// Helper: Format file size
function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

export function MessagesPage() {
    // const { user } = useAuth(); // Unused for now
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState(null);

    // Fetch messages list
    useEffect(() => {
        let isMounted = true;

        async function fetchMessages() {
            try {
                setIsLoadingList(true);
                setError(null);
                // getMessages now returns a flat array of all messages
                const data = await ecoleDirecteClient.getMessages(activeTab);

                if (isMounted) {
                    // data is now a flat array
                    setMessages(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch messages:', err);
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setIsLoadingList(false);
            }
        }

        fetchMessages();

        return () => { isMounted = false; };
    }, [activeTab]);

    // Fetch message content when selected
    useEffect(() => {
        if (!selectedMessage || selectedMessage.fullContent) return;

        let isMounted = true;

        async function fetchContent() {
            try {
                setIsLoadingContent(true);
                const mode = activeTab === 'sent' ? 'expediteur' : 'destinataire';
                const fullMsg = await ecoleDirecteClient.getMessageContent(selectedMessage.id, mode);

                if (isMounted) {
                    setSelectedMessage(prev => ({
                        ...prev,
                        ...fullMsg,
                        fullContent: true
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch message content:', err);
            } finally {
                if (isMounted) setIsLoadingContent(false);
            }
        }

        fetchContent();

        return () => { isMounted = false; };
    }, [selectedMessage, activeTab]); // Depend on selectedMessage object to handle updates correctly

    // Filter messages by active tab type
    const displayList = messages.filter(msg => msg.type === activeTab);

    const handleSelectMessage = (msg) => {
        setSelectedMessage(msg);
        // Mark as read in local state if received
        if (activeTab === 'received' && !msg.read) {
            setMessages(prev =>
                prev.map(m => m.id === msg.id ? { ...m, read: true } : m)
            );
            // Ideally call API to mark as read here
        }
    };

    return (
        <div className="messages-page">
            {/* Sidebar / List */}
            <div className={`messages-list ${selectedMessage ? 'messages-list--hidden-mobile' : ''}`}>
                <header className="messages-list__header">
                    <div className="messages-header__top">
                        <div className="messages-header__title-group">
                            <h1 className="messages-list__title">
                                <span className="messages-title__icon">💬</span>
                                Messagerie
                            </h1>
                            <span className="messages-header__count">
                                {displayList.filter(m => !m.read && activeTab === 'received').length > 0 && (
                                    <span className="unread-badge">
                                        {displayList.filter(m => !m.read).length} non lu{displayList.filter(m => !m.read).length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </span>
                        </div>
                        <button className="messages-header__refresh" onClick={() => window.location.reload()} title="Rafraîchir">
                            🔄
                        </button>
                    </div>
                    <div className="messages-list__tabs">
                        <button
                            className={`msg-tab ${activeTab === 'received' ? 'msg-tab--active' : ''}`}
                            onClick={() => { setActiveTab('received'); setSelectedMessage(null); }}
                        >
                            <span className="msg-tab__icon">📥</span>
                            <span className="msg-tab__label">Reçus</span>
                            {messages.filter(m => m.type === 'received' && !m.read).length > 0 && (
                                <span className="msg-tab__badge">
                                    {messages.filter(m => m.type === 'received' && !m.read).length}
                                </span>
                            )}
                        </button>
                        <button
                            className={`msg-tab ${activeTab === 'sent' ? 'msg-tab--active' : ''}`}
                            onClick={() => { setActiveTab('sent'); setSelectedMessage(null); }}
                        >
                            <span className="msg-tab__icon">📤</span>
                            <span className="msg-tab__label">Envoyés</span>
                        </button>
                    </div>
                </header>

                <div className="messages-list__content">
                    {error && (
                        <div className="messages-error">
                            <p>Erreur: {error}</p>
                            <button onClick={() => window.location.reload()}>Réessayer</button>
                        </div>
                    )}
                    {isLoadingList ? (
                        <div className="messages-loading">
                            <LoadIndicator size="small" />
                        </div>
                    ) : displayList.length > 0 ? (
                        displayList.map(msg => (
                            <div
                                key={msg.id}
                                className={`message-item ${selectedMessage?.id === msg.id ? 'message-item--active' : ''} ${!msg.read && activeTab === 'received' ? 'message-item--unread' : ''}`}
                                onClick={() => handleSelectMessage(msg)}
                            >
                                <div className="message-item__avatar">
                                    {(activeTab === 'received' ? msg.from : msg.to)?.charAt(0) || '?'}
                                </div>
                                <div className="message-item__info">
                                    <div className="message-item__top">
                                        <span className="message-item__name">
                                            {activeTab === 'received' ? msg.from : `À : ${msg.to}`}
                                        </span>
                                        <span className="message-item__date">
                                            {new Date(msg.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="message-item__subject">
                                        {msg.subject || '(Sans objet)'}
                                    </div>
                                    <div className="message-item__preview">
                                        {msg.content?.replace(/<[^>]*>/g, '').substring(0, 50)}...
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="messages-empty">
                            <span className="messages-empty__icon">📭</span>
                            <p>Aucun message</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content / Detail */}
            <div className={`message-detail ${!selectedMessage ? 'message-detail--hidden-mobile' : ''}`}>
                {selectedMessage ? (
                    <>
                        <header className="message-detail__header">
                            <button
                                className="message-detail__back"
                                onClick={() => setSelectedMessage(null)}
                            >
                                ←
                            </button>

                            <div className="message-detail__content-wrapper">
                                <h2 className="message-detail__subject">{selectedMessage.subject}</h2>

                                <div className="message-detail__meta-row">
                                    <div className="message-detail__avatar">
                                        {(activeTab === 'received' ? selectedMessage.from : selectedMessage.to)?.charAt(0) || '?'}
                                    </div>
                                    <div className="message-detail__info-col">
                                        <span className="message-detail__participants">
                                            {activeTab === 'received' ? selectedMessage.from : `À : ${selectedMessage.to}`}
                                        </span>
                                        <span className="message-detail__time">
                                            {new Date(selectedMessage.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="message-detail__body">
                            {isLoadingContent ? (
                                <div className="messages-loading">
                                    <LoadIndicator />
                                </div>
                            ) : (
                                <div
                                    className="message-content-html"
                                    dangerouslySetInnerHTML={{ __html: selectedMessage.content }}
                                />
                            )}

                            {selectedMessage.files && selectedMessage.files.length > 0 && (
                                <div className="message-attachments">
                                    <h3 className="attachments-title">
                                        📎 Pièces jointes ({selectedMessage.files.length})
                                    </h3>
                                    <div className="attachments-list">
                                        {selectedMessage.files.map((file, idx) => {
                                            const fileName = file.libelle || file.name || 'fichier';
                                            const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                            const icon = getFileIcon(ext);

                                            return (
                                                <button
                                                    key={idx}
                                                    className="attachment-item"
                                                    onClick={async () => {
                                                        try {
                                                            await ecoleDirecteClient.downloadFile(
                                                                file.id,
                                                                file.type || 'PIECE_JOINTE',
                                                                fileName
                                                            );
                                                        } catch (err) {
                                                            console.error('Download failed:', err);
                                                            alert('Échec du téléchargement');
                                                        }
                                                    }}
                                                >
                                                    <span className="attachment-icon">{icon}</span>
                                                    <span className="attachment-name">{fileName}</span>
                                                    {file.taille && (
                                                        <span className="attachment-size">
                                                            {formatFileSize(file.taille)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="message-detail__placeholder">
                        <span className="placeholder-icon">📨</span>
                        <p>Sélectionnez un message pour le lire</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessagesPage;
