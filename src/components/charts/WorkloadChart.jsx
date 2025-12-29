/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKLOAD CHART COMPONENT (NEON GLASS V2)
 * Visualizes workload data using Chart.js with Neon aesthetics
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useRef, useEffect, useState } from 'react';
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

// Neon Palette matching index.css
const COLORS = {
    primary: '#00FFA3', // Neon Green
    secondary: '#BF5AF2', // Neon Purple
    success: '#32D74B',
    warning: '#FFD60A',
    critical: '#FF453A',
    text: 'rgba(255, 255, 255, 0.7)',
    grid: 'rgba(255, 255, 255, 0.1)',
    tooltipBg: 'rgba(10, 11, 16, 0.9)',
};

const THRESHOLDS = {
    daily: { light: 2, medium: 4, heavy: 6 },
    weekly: { light: 8, medium: 15, heavy: 20 },
};

function getScoreColor(score, type = 'daily') {
    const t = THRESHOLDS[type];
    if (score <= t.light) return COLORS.success;
    if (score <= t.medium) return COLORS.warning;
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
    // Create gradient for bars
    const chartRef = useRef(null);
    const [chartGradient, setChartGradient] = useState(null);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const ctx = chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 255, 163, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 163, 0.2)');
        setChartGradient(gradient);
    }, []);

    const chartData = useMemo(() => ({
        labels: data.map(d => {
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
                backgroundColor: data.map(d => d.isToday ? COLORS.secondary : (chartGradient || COLORS.primary)),
                borderRadius: 8,
                barThickness: 24,
                borderWidth: 0,
            },
        ],
    }), [data, chartGradient]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: showLegend },
            tooltip: {
                backgroundColor: COLORS.tooltipBg,
                titleColor: '#fff',
                bodyColor: '#ccc',
                borderColor: COLORS.grid,
                borderWidth: 1,
                padding: 10,
                displayColors: false, // Hide color box
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
                }
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: COLORS.text, font: { size: 10 } },
            },
            y: {
                grid: { color: COLORS.grid, borderDash: [4, 4] },
                ticks: { color: COLORS.text, font: { size: 10 } },
                border: { display: false }, // Hide axis line
            },
        },
    }), [data, showLegend]);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar ref={chartRef} data={chartData} options={options} />
        </div>
    );
}

/**
 * Weekly Workload Line Chart (Smooth Wave)
 */
export function WeeklyWorkloadChart({
    data,
    height = 200,
    showLegend = false,
}) {
    const chartRef = useRef(null);
    const [chartGradient, setChartGradient] = useState(null);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const ctx = chart.ctx;
        // Purple/Blue Gradient Fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(191, 90, 242, 0.5)'); // Purple
        gradient.addColorStop(1, 'rgba(10, 132, 255, 0.0)'); // Blue fade to transparent
        setChartGradient(gradient);
    }, []);

    const chartData = useMemo(() => ({
        labels: data.map(d => d.week || `S${d.weekNumber}`),
        datasets: [
            {
                label: 'Points de charge',
                data: data.map(d => d.score),
                fill: true,
                backgroundColor: chartGradient || 'rgba(191, 90, 242, 0.2)',
                borderColor: '#BF5AF2', // Neon Purple Line
                borderWidth: 3,
                tension: 0.4, // Smooth curve
                pointBackgroundColor: '#fff',
                pointBorderColor: '#BF5AF2',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    }), [data, chartGradient]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: COLORS.tooltipBg,
                titleColor: '#fff',
                bodyColor: '#ccc',
                padding: 10,
                borderColor: COLORS.grid,
                borderWidth: 1,
                callbacks: {
                    label: (context) => `${context.raw} points`
                }
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: COLORS.text, font: { size: 10 } },
            },
            y: {
                grid: { color: COLORS.grid, borderDash: [4, 4] },
                ticks: { color: COLORS.text, font: { size: 10 } },
                border: { display: false },
                min: 0,
            },
        },
    }), []);

    return (
        <div className="workload-chart" style={{ height }}>
            <Line ref={chartRef} data={chartData} options={options} />
        </div>
    );
}

/**
 * Subject Distribution Chart (Horizontal Bar)
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
                label: 'Charge',
                data: subjects.map(s => s.totalWeight),
                backgroundColor: [
                    '#00FFA3', // Green
                    '#BF5AF2', // Purple
                    '#0A84FF', // Blue
                    '#FFD60A', // Yellow
                    '#FF453A', // Red
                    '#FF9F0A', // Orange
                ],
                borderRadius: 4,
                barThickness: 12,
            },
        ],
    }), [subjects]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: { displayColors: false },
        },
        scales: {
            x: {
                grid: { color: COLORS.grid, borderDash: [4, 4] },
                ticks: { color: COLORS.text, font: { size: 10 } },
                border: { display: false },
            },
            y: {
                grid: { display: false },
                ticks: {
                    color: '#fff',
                    font: { size: 11, weight: 500 },
                    autoSkip: false,
                },
                border: { display: false },
            },
        },
    }), []);

    return (
        <div className="workload-chart" style={{ height }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

export default DailyWorkloadChart;
