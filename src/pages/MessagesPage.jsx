import { useState, useEffect, useRef } from 'react';
import { ecoleDirecteClient } from '../api/ecoleDirecte'; // Adjust path if needed
import './MessagesPage.css';

export function MessagesPage() {
    const [messages, setMessages] = useState({ received: [], sent: [], archived: [] });
    const [currentTab, setCurrentTab] = useState('received');
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [messageDetail, setMessageDetail] = useState(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch message list on mount
    useEffect(() => {
        loadMessages();
    }, []);

    // Fetch detail when selection changes
    useEffect(() => {
        if (selectedMessageId) {
            loadMessageDetail(selectedMessageId);
        } else {
            setMessageDetail(null);
        }
    }, [selectedMessageId]);

    const loadMessages = async () => {
        setIsLoadingList(true);
        try {
            const data = await ecoleDirecteClient.getMessages();
            setMessages(data);
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            setIsLoadingList(false);
        }
    };

    const loadMessageDetail = async (id) => {
        setIsLoadingDetail(true);
        try {
            const detail = await ecoleDirecteClient.getMessageContent(id, currentTab === 'sent' ? 'envoye' : 'recu');
            setMessageDetail(detail);

            // Mark as read locally if needed
            setMessages(prev => ({
                ...prev,
                [currentTab]: prev[currentTab].map(m =>
                    m.id === id ? { ...m, read: true } : m
                )
            }));
        } catch (error) {
            console.error("Failed to load message detail", error);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleArchive = async () => {
        if (!selectedMessageId) return;
        if (window.confirm('Voulez-vous vraiment archiver ce message ?')) {
            try {
                await ecoleDirecteClient.archiveMessages([selectedMessageId]);
                // Remove locally to avoid reload
                setMessages(prev => ({
                    ...prev,
                    [currentTab]: prev[currentTab].filter(m => m.id !== selectedMessageId)
                }));
                setSelectedMessageId(null);
            } catch (error) {
                console.error("Archive failed", error);
                alert("Erreur lors de l'archivage");
            }
        }
    };

    // Filter messages based on search
    const filteredMessages = messages[currentTab].filter(msg => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const subject = (msg.subject || '').toLowerCase();
        const sender = (msg.from?.nom || '' + msg.from?.prenom || '').toLowerCase();
        return subject.includes(q) || sender.includes(q);
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getSenderName = (msg) => {
        if (!msg.from) return 'Inconnu';
        return `${msg.from.prenom} ${msg.from.nom}`;
    };

    const getInitials = (name) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="messages-page">
            {/* Sidebar */}
            <div className="messages-sidebar">
                <div className="messages-sidebar__header">
                    <h2 className="messages-sidebar__title">Messagerie</h2>
                    <div className="messages-folder-tabs">
                        <button
                            className={`messages-folder-tab ${currentTab === 'received' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('received')}
                        >
                            Reçus ({messages.received.filter(m => !m.read).length})
                        </button>
                        <button
                            className={`messages-folder-tab ${currentTab === 'sent' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('sent')}
                        >
                            Envoyés
                        </button>
                        <button
                            className={`messages-folder-tab ${currentTab === 'archived' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('archived')}
                        >
                            Archives
                        </button>
                    </div>
                    {/* Add Search Input if desired */}
                </div>

                <div className="messages-list-container">
                    {isLoadingList ? (
                        <div className="spinner" style={{ margin: '20px auto' }}></div>
                    ) : (
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`message-item ${selectedMessageId === msg.id ? 'active' : ''} ${!msg.read ? 'unread' : ''}`}
                                onClick={() => setSelectedMessageId(msg.id)}
                            >
                                <div className="message-item__header">
                                    <span className="message-item__sender">{getSenderName(msg)}</span>
                                    <span className="message-item__date">{formatDate(msg.date)}</span>
                                </div>
                                <div className="message-item__subject">{msg.subject || '(Sans objet)'}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="message-detail">
                {selectedMessageId ? (
                    isLoadingDetail || !messageDetail ? (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="message-detail__content-wrapper">
                            <div className="message-detail__header">
                                <h1 className="message-detail__subject">{messageDetail.subject}</h1>
                                <div className="message-detail__meta">
                                    <div className="message-detail__sender-info">
                                        <div className="sender-avatar">
                                            {getInitials(`${messageDetail.from.prenom} ${messageDetail.from.nom}`)}
                                        </div>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>
                                                {messageDetail.from.civilite} {messageDetail.from.prenom} {messageDetail.from.nom}
                                            </div>
                                            <div style={{ fontSize: '0.8rem' }}>{formatDate(messageDetail.date)}</div>
                                        </div>
                                    </div>

                                    {currentTab !== 'archived' && (
                                        <button
                                            onClick={handleArchive}
                                            style={{
                                                background: 'rgba(255, 0, 85, 0.2)',
                                                border: '1px solid #ff0055',
                                                color: '#ff0055',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Archiver"
                                        >
                                            🗑️ Archiver
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div
                                className="message-detail__body"
                                dangerouslySetInnerHTML={{ __html: messageDetail.content }}
                            />

                            {messageDetail.files && messageDetail.files.length > 0 && (
                                <div className="message-detail__files">
                                    {messageDetail.files.map(file => (
                                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="file-chip">
                                            📎 {file.libelle}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="message-detail__empty">
                        Sélectionnez un message pour le lire
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessagesPage;
