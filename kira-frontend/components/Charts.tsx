'use client';

import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const BAR_COLORS = ['#2563EB', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#F97316'];
const DONUT_COLORS = ['#2563EB', '#EF4444', '#22C55E', '#EAB308', '#8B5CF6', '#F97316', '#06B6D4'];

export function AssetBarChart({
  labels,
  datasets,
}: {
  labels?: string[];
  datasets?: { label: string; data: number[]; color?: string }[];
}) {
  const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
  const defaultDatasets = [
    { label: 'Maintenance', data: [3, 5, 4, 8, 6, 9], color: '#2563EB' },
  ];

  const resolvedLabels = labels ?? defaultLabels;
  const resolvedDatasets = datasets ?? defaultDatasets;

  const data = {
    labels: resolvedLabels,
    datasets: resolvedDatasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color ?? BAR_COLORS[i % BAR_COLORS.length],
      borderRadius: 8,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="h-80">
      <Bar data={data} options={options} />
    </div>
  );
}

export function AssetDonutChart({
  labels,
  data: values,
}: {
  labels?: string[];
  data?: number[];
}) {
  const defaultLabels = ['AC', 'Printer', 'Laptop', 'Others'];
  const defaultValues = [30, 25, 20, 25];

  const resolvedLabels = labels ?? defaultLabels;
  const resolvedValues = values ?? defaultValues;

  const data = {
    labels: resolvedLabels,
    datasets: [
      {
        data: resolvedValues,
        backgroundColor: DONUT_COLORS.slice(0, resolvedLabels.length),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { position: 'right' as const } },
  };

  return (
    <div className="h-[260px]">
      <Doughnut data={data} options={options} />
    </div>
  );
}
