import React, { useEffect, useState } from 'react';
import { getWorkoutsHistory } from '../utils/api';
import '../styles/components/Statistics.css';

const Statistics = () => {
  const [stats, setStats] = useState([
    { label: 'Wszystkie treningi', value: '—' },
    { label: 'Treningi w tym miesiącu', value: '—' },
    { label: 'Wszystkie sety', value: '—' },
    { label: 'Średni volume / trening', value: '—' },
  ]);

  useEffect(() => {
    let cancelled = false;

    getWorkoutsHistory({ limit: 200, includeStats: true })
      .then((data) => {
        if (cancelled) return;
        const workouts = data?.workouts || [];
        const summary = data?.summary || {};

        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const workoutsThisMonth = workouts.filter((w) => (w.date || '').startsWith(thisMonth)).length;

        setStats([
          { label: 'Wszystkie treningi', value: String(summary.total_workouts ?? workouts.length ?? 0) },
          { label: 'Treningi w tym miesiącu', value: String(workoutsThisMonth) },
          { label: 'Wszystkie sety', value: String(summary.total_sets ?? '0') },
          { label: 'Średni volume / trening', value: String(summary.avg_volume_per_workout ?? '0') },
        ]);
      })
      .catch((e) => {
        console.error('Failed to load stats:', e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="statistics">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Statistics;

