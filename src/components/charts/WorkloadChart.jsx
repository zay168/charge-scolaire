/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKLOAD CHART COMPONENT
 * Visualizes workload data using Chart.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './WorkloadChart.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Color palette
const COLORS = {
    light: 'hsl(142, 70%, 45%)',
    medium: 'hsl(42, 90%, 50%)',
    heavy: 'hsl(4, 85%, 55%)',
    critical: 'hsl(350, 90%, 45%)',
    primary: 'hsl(220, 60%, 50%)',
    primaryLight: 'hsla(220, 60%, 50%, 0.1)',
};

// Thresholds for color coding (new simplified system)
const THRESHOLDS = {
    daily: { light: 2, medium: 4, heavy: 6 },
    weekly: { light: 8, medium: 15, heavy: 20 },
};

/**
 * Get color based on score and thresholds
 */
function getScoreColor(score, type = 'daily') {
    const t = THRESHOLDS[type];
    if (score <= t.light) return COLORS.light;
    if (score <= t.medium) return COLORS.medium;
    if (score <= t.heavy) return COLORS.heavy;
    return COLORS.critical;
}

/**
 * Daily Workload Bar Chart
 */
export function DailyWorkloadChart({
    data,
    height = 200,
    showLegend = false,
}) {
    const chartData = useMemo(() => ({
        labels: data.map(d => {
            // Format date nicely: "Lun 6"
            if (d.day && d.date) {
                const dateObj = new Date(d.date);
                return `${d.day} ${dateObj.getDate()}`;
            }
            return d.dayName || d.day || d.date;
        }),
        datasets: [
            {
                label: 'Points de charge',
                data: data.map(d => d.score),
                backgroundColor: data.map(d =>
                    d.isToday
                        ? COLORS.primary
                        : getScoreColor(d.score, 'daily')
                ),
                borderColor: data.map(d =>
                    d.isToday
                        ? COLORS.primary
                        : getScoreColor(d.score, 'daily')
                ),
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 28,
            },
        ],
    }), [data]);

    const maxScore = Math.max(12, ...data.map(d => d.score || 0));

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: showLegend,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'hsl(220, 20%, 15%)',
                titleColor: 'white',
                bodyColor: 'hsl(220, 10%, 80%)',
                borderColor: 'hsl(220, 15%, 25%)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    title: (context) => {
                        const idx = context[0].dataIndex;
                        const d = data[idx];
                        if (d.date) {
                            return new Date(d.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            });
                        }
                        return context[0].label;
                    },
                    label: (context) => {
                        const score = context.raw;
                        const count = data[context.dataIndex]?.count || 0;
                        let status = 'Léger';
                        if (score > THRESHOLDS.daily.heavy) status = 'Critique';
                        else if (score > THRESHOLDS.daily.medium) status = 'Chargé';
                        else if (score > THRESHOLDS.daily.light) status = 'Modéré';
                        return [
                            `${score} points (${status})`,
                            `${count} ${count > 1 ? 'travaux' : 'travail'}`
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Jour',
                    color: 'hsl(220, 10%, 45%)',
                    font: {
                        size: 11,
                        weight: '600',
                    },
                    padding: { top: 8 },
                },
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'hsl(220, 10%, 40%)',
                    font: {
                        size: 11,
                        weight: '500',
                    },
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Points de charge',
                    color: 'hsl(220, 10%, 45%)',
                    font: {
                        size: 11,
                        weight: '600',
                    },
                    padding: { bottom: 8 },
                },
                beginAtZero: true,
                suggestedMax: maxScore + 2,
                grid: {
                    color: (ctx) => {
                        // Highlight threshold lines
                        if (ctx.tick.value === THRESHOLDS.daily.light) return 'hsla(142, 70%, 45%, 0.3)';
                        if (ctx.tick.value === THRESHOLDS.daily.medium) return 'hsla(42, 90%, 50%, 0.3)';
                        if (ctx.tick.value === THRESHOLDS.daily.heavy) return 'hsla(4, 85%, 55%, 0.3)';
                        return 'hsl(220, 10%, 92%)';
                    },
                    lineWidth: (ctx) => {
                        // Thicker threshold lines
                        if ([THRESHOLDS.daily.light, THRESHOLDS.daily.medium, THRESHOLDS.daily.heavy].includes(ctx.tick.value)) {
                            return 2;
                        }
                        return 1;
                    },
                },
                ticks: {
                    color: 'hsl(220, 10%, 40%)',
                    stepSize: 2,
                    callback: (value) => {
                        // Add labels at thresholds
                        if (value === THRESHOLDS.daily.light) return `${value} (léger)`;
                        if (value === THRESHOLDS.daily.medium) return `${value} (modéré)`;
                        if (value === THRESHOLDS.daily.heavy) return `${value} (chargé)`;
                        return value;
                    },
                    font: {
                        size: 10,
                    },
                },
            },
        },
    }), [data, showLegend, maxScore]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

/**
 * Weekly Workload Bar Chart (changed from line to bar for clarity)
 */
export function WeeklyWorkloadChart({
    data,
    height = 200,
    showLegend = false,
}) {
    const chartData = useMemo(() => ({
        labels: data.map(d => d.week || `Semaine ${d.weekNumber}`),
        datasets: [
            {
                label: 'Points de charge',
                data: data.map(d => d.score),
                backgroundColor: data.map(d =>
                    d.isCurrent
                        ? COLORS.primary
                        : getScoreColor(d.score, 'weekly')
                ),
                borderColor: data.map(d =>
                    d.isCurrent
                        ? COLORS.primary
                        : getScoreColor(d.score, 'weekly')
                ),
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 40,
            },
        ],
    }), [data]);

    const maxScore = Math.max(25, ...data.map(d => d.score || 0));

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: showLegend,
            },
            tooltip: {
                backgroundColor: 'hsl(220, 20%, 15%)',
                titleColor: 'white',
                bodyColor: 'hsl(220, 10%, 80%)',
                borderColor: 'hsl(220, 15%, 25%)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    title: (context) => {
                        const idx = context[0].dataIndex;
                        const d = data[idx];
                        if (d.isCurrent) return '📍 Cette semaine';
                        return `Semaine du ${d.week}`;
                    },
                    label: (context) => {
                        const score = context.raw;
                        const d = data[context.dataIndex];
                        let status = 'Légère';
                        if (score > THRESHOLDS.weekly.heavy) status = 'Critique';
                        else if (score > THRESHOLDS.weekly.medium) status = 'Chargée';
                        else if (score > THRESHOLDS.weekly.light) status = 'Modérée';

                        const lines = [
                            `${score} points (${status})`,
                        ];

                        if (d.homeworkCount !== undefined) {
                            lines.push(`📝 ${d.homeworkCount} devoir${d.homeworkCount > 1 ? 's' : ''}`);
                        }
                        if (d.testCount !== undefined && d.testCount > 0) {
                            lines.push(`📋 ${d.testCount} évaluation${d.testCount > 1 ? 's' : ''}`);
                        }

                        return lines;
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Semaine',
                    color: 'hsl(220, 10%, 45%)',
                    font: {
                        size: 11,
                        weight: '600',
                    },
                    padding: { top: 8 },
                },
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'hsl(220, 10%, 40%)',
                    font: {
                        size: 10,
                        weight: '500',
                    },
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Points de charge',
                    color: 'hsl(220, 10%, 45%)',
                    font: {
                        size: 11,
                        weight: '600',
                    },
                    padding: { bottom: 8 },
                },
                beginAtZero: true,
                suggestedMax: maxScore + 5,
                grid: {
                    color: (ctx) => {
                        if (ctx.tick.value === THRESHOLDS.weekly.light) return 'hsla(142, 70%, 45%, 0.3)';
                        if (ctx.tick.value === THRESHOLDS.weekly.medium) return 'hsla(42, 90%, 50%, 0.3)';
                        if (ctx.tick.value === THRESHOLDS.weekly.heavy) return 'hsla(4, 85%, 55%, 0.3)';
                        return 'hsl(220, 10%, 92%)';
                    },
                    lineWidth: (ctx) => {
                        if ([THRESHOLDS.weekly.light, THRESHOLDS.weekly.medium, THRESHOLDS.weekly.heavy].includes(ctx.tick.value)) {
                            return 2;
                        }
                        return 1;
                    },
                },
                ticks: {
                    color: 'hsl(220, 10%, 40%)',
                    stepSize: 5,
                    callback: (value) => {
                        if (value === THRESHOLDS.weekly.light) return `${value} (léger)`;
                        if (value === THRESHOLDS.weekly.medium) return `${value} (modéré)`;
                        if (value === THRESHOLDS.weekly.heavy) return `${value} (chargé)`;
                        return value;
                    },
                    font: {
                        size: 10,
                    },
                },
            },
        },
    }), [data, showLegend, maxScore]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

/**
 * Subject Distribution Chart
 */
export function SubjectDistributionChart({
    data,
    height = 200,
}) {
    const subjects = Object.entries(data).map(([name, info]) => ({
        name,
        ...info,
    })).sort((a, b) => b.totalWeight - a.totalWeight);

    const chartData = useMemo(() => ({
        labels: subjects.map(s => s.name),
        datasets: [
            {
                label: 'Charge par matière',
                data: subjects.map(s => s.totalWeight),
                backgroundColor: [
                    'hsl(220, 70%, 55%)',
                    'hsl(4, 85%, 55%)',
                    'hsl(142, 70%, 45%)',
                    'hsl(42, 90%, 50%)',
                    'hsl(280, 65%, 55%)',
                    'hsl(180, 60%, 45%)',
                    'hsl(32, 85%, 55%)',
                    'hsl(340, 75%, 55%)',
                ],
                borderWidth: 0,
                borderRadius: 6,
            },
        ],
    }), [subjects]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'hsl(220, 20%, 15%)',
                titleColor: 'white',
                bodyColor: 'hsl(220, 10%, 80%)',
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        const subjectData = subjects[context.dataIndex];
                        return [
                            `Score total: ${subjectData.totalWeight}`,
                            `${subjectData.count} ${subjectData.count > 1 ? 'devoirs' : 'devoir'}`,
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    color: 'hsl(220, 10%, 92%)',
                },
                ticks: {
                    color: 'hsl(220, 10%, 50%)',
                },
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'hsl(220, 10%, 40%)',
                    font: {
                        weight: 500,
                    },
                },
            },
        },
    }), [subjects]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

export default DailyWorkloadChart;
