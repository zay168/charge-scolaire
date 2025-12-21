/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASSIGNMENT CARD COMPONENT
 * Displays a single homework or test assignment
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { LoadIndicator } from './LoadIndicator';
import './AssignmentCard.css';

const WEIGHT_LABELS = {
    LIGHT: 'Léger',
    MEDIUM: 'Moyen',
    HEAVY: 'Lourd',
    CONTROL: 'Contrôle',
    QUIZ: 'Interro',
    DST: 'DST',
    EXAM: 'Examen',
};

const TYPE_ICONS = {
    homework: '📝',
    test: '📋',
    dst: '📊',
    control: '✍️',
};

export function AssignmentCard({
    assignment,
    compact = false,
    showClass = false,
    onClick,
}) {
    const {
        subject,
        subjectCode,
        teacher,
        type,
        weight,
        dueDate,
        content,
        done,
        classId,
    } = assignment;

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return "Aujourd'hui";
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Demain';
        }

        return date.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    // Get status from weight
    const getStatus = () => {
        if (weight === 'LIGHT') return 'light';
        if (weight === 'MEDIUM') return 'medium';
        if (weight === 'HEAVY' || weight === 'CONTROL') return 'heavy';
        if (weight === 'DST' || weight === 'EXAM') return 'critical';
        return 'medium';
    };

    const classes = [
        'assignment-card',
        compact && 'assignment-card--compact',
        done && 'assignment-card--done',
        onClick && 'assignment-card--interactive',
    ].filter(Boolean).join(' ');

    return (
        <article
            className={classes}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="assignment-card__header">
                <div className="assignment-card__icon">
                    {TYPE_ICONS[type] || '📄'}
                </div>
                <div className="assignment-card__meta">
                    <h4 className="assignment-card__subject">{subject}</h4>
                    {teacher && !compact && (
                        <span className="assignment-card__teacher">{teacher}</span>
                    )}
                </div>
                <LoadIndicator
                    status={getStatus()}
                    showLabel={!compact}
                    size={compact ? 'small' : 'medium'}
                />
            </div>

            {!compact && (
                <p className="assignment-card__content">{content}</p>
            )}

            <div className="assignment-card__footer">
                <time className="assignment-card__date">{formatDate(dueDate)}</time>
                {showClass && classId && (
                    <span className="assignment-card__class">{classId}</span>
                )}
                <span className="assignment-card__weight">
                    {WEIGHT_LABELS[weight] || weight}
                </span>
            </div>

            {done && (
                <div className="assignment-card__done-overlay">
                    <span>✓ Fait</span>
                </div>
            )}
        </article>
    );
}

/**
 * Skeleton loader for assignment card
 */
export function AssignmentCardSkeleton({ compact = false }) {
    return (
        <div className={`assignment-card assignment-card--skeleton ${compact ? 'assignment-card--compact' : ''}`}>
            <div className="assignment-card__header">
                <div className="skeleton skeleton--icon" />
                <div className="skeleton skeleton--text" style={{ width: '60%' }} />
                <div className="skeleton skeleton--badge" />
            </div>
            {!compact && (
                <div className="skeleton skeleton--text" style={{ width: '100%', height: '2em' }} />
            )}
            <div className="assignment-card__footer">
                <div className="skeleton skeleton--text" style={{ width: '80px' }} />
                <div className="skeleton skeleton--text" style={{ width: '60px' }} />
            </div>
        </div>
    );
}

export default AssignmentCard;
