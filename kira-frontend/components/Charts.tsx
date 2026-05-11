'use client';

import {
  Bar,
  Doughnut,
} from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export function AssetBarChart() {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'In Use',
        data: [1200, 900, 1400, 500, 1000, 1500],
        backgroundColor: '#2563EB',
        borderRadius: 8,
      },
      {
        label: 'Available',
        data: [800, 1500, 1000, 700, 200, 500],
        backgroundColor: '#22C55E',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="h-[320px]">
      <Bar data={data} options={options} />
    </div>
  );
}

export function AssetDonutChart() {
  const data = {
    labels: ['AC', 'Printer', 'Laptop', 'Others'],
    datasets: [
      {
        data: [1250, 1250, 1250, 1250],
        backgroundColor: [
          '#2563EB',
          '#EF4444',
          '#22C55E',
          '#EAB308',
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  return (
    <div className="h-[260px]">
      <Doughnut data={data} options={options} />
    </div>
  );
}