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

// Thresholds for color coding
const THRESHOLDS = {
    daily: { light: 4, medium: 7, heavy: 10 },
    weekly: { light: 15, medium: 25, heavy: 35 },
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
        labels: data.map(d => d.dayName || d.date),
        datasets: [
            {
                label: 'Charge',
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
                barThickness: 20,
            },
        ],
    }), [data]);

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
                    label: (context) => {
                        const score = context.raw;
                        let status = 'Léger';
                        if (score > THRESHOLDS.daily.heavy) status = 'Critique';
                        else if (score > THRESHOLDS.daily.medium) status = 'Chargé';
                        else if (score > THRESHOLDS.daily.light) status = 'Modéré';
                        return `Score: ${score} (${status})`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'hsl(220, 10%, 50%)',
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                beginAtZero: true,
                max: Math.max(15, ...data.map(d => d.score)) + 2,
                grid: {
                    color: 'hsl(220, 10%, 92%)',
                },
                ticks: {
                    color: 'hsl(220, 10%, 50%)',
                    stepSize: 5,
                },
            },
        },
    }), [data, showLegend]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

/**
 * Weekly Workload Line Chart
 */
export function WeeklyWorkloadChart({
    data,
    height = 200,
    showLegend = false,
}) {
    const chartData = useMemo(() => ({
        labels: data.map(d => d.week || `S${d.weekNumber}`),
        datasets: [
            {
                label: 'Charge hebdomadaire',
                data: data.map(d => d.score),
                borderColor: COLORS.primary,
                backgroundColor: COLORS.primaryLight,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: data.map(d =>
                    d.isCurrent ? COLORS.primary : 'white'
                ),
                pointBorderColor: data.map(d =>
                    getScoreColor(d.score, 'weekly')
                ),
                pointBorderWidth: 2,
                pointRadius: data.map(d => d.isCurrent ? 6 : 4),
                pointHoverRadius: 8,
            },
        ],
    }), [data]);

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
                    label: (context) => {
                        const score = context.raw;
                        const count = data[context.dataIndex]?.count || 0;
                        return [
                            `Score: ${score}`,
                            `${count} ${count > 1 ? 'devoirs' : 'devoir'}`,
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'hsl(220, 10%, 50%)',
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'hsl(220, 10%, 92%)',
                },
                ticks: {
                    color: 'hsl(220, 10%, 50%)',
                },
            },
        },
    }), [data, showLegend]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Line data={chartData} options={options} />
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
