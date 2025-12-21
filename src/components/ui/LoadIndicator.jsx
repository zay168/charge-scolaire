/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOAD INDICATOR COMPONENT
 * Visual indicator for workload status (light/medium/heavy/critical)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import './LoadIndicator.css';

const STATUS_CONFIG = {
    light: {
        label: 'Léger',
        emoji: '🟢',
        className: 'load-indicator--light',
    },
    medium: {
        label: 'Modéré',
        emoji: '🟠',
        className: 'load-indicator--medium',
    },
    heavy: {
        label: 'Chargé',
        emoji: '🔴',
        className: 'load-indicator--heavy',
    },
    critical: {
        label: 'Critique',
        emoji: '❌',
        className: 'load-indicator--critical',
    },
};

export function LoadIndicator({
    status = 'light',
    score,
    showLabel = true,
    showScore = false,
    size = 'medium',
    variant = 'badge',
    animated = false,
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.light;

    const classes = [
        'load-indicator',
        config.className,
        `load-indicator--${size}`,
        `load-indicator--${variant}`,
        animated && 'load-indicator--animated',
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <span className="load-indicator__emoji">{config.emoji}</span>
            {showLabel && (
                <span className="load-indicator__label">{config.label}</span>
            )}
            {showScore && score !== undefined && (
                <span className="load-indicator__score">{score}</span>
            )}
        </div>
    );
}

/**
 * Progress bar variant of load indicator
 */
export function LoadProgressBar({
    score,
    maxScore = 15,
    status,
    showLabel = true,
    height = 8,
}) {
    const percentage = Math.min((score / maxScore) * 100, 100);
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.light;

    return (
        <div className="load-progress">
            {showLabel && (
                <div className="load-progress__header">
                    <span className="load-progress__label">Charge</span>
                    <span className={`load-progress__status ${config.className}`}>
                        {config.emoji} {config.label}
                    </span>
                </div>
            )}
            <div
                className="load-progress__track"
                style={{ height: `${height}px` }}
            >
                <div
                    className={`load-progress__fill ${config.className}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="load-progress__footer">
                <span className="load-progress__score">{score}</span>
                <span className="load-progress__max">/ {maxScore}</span>
            </div>
        </div>
    );
}

export default LoadIndicator;
