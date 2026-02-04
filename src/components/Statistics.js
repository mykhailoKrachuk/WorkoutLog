import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { getWorkoutsHistory } from '../utils/api';
import '../styles/components/Statistics.css';

const Statistics = forwardRef((props, ref) => {
  const [stats, setStats] = useState([
    { label: 'All workouts', value: '—' },
    { label: 'Workouts this month', value: '—' },
    { label: 'All sets', value: '—' },
    { label: 'Avg volume / workout', value: '—' },
  ]);

  const loadStats = () => {
    let cancelled = false;

    getWorkoutsHistory({ limit: 200, includeStats: true })
      .then((data) => {
        if (cancelled) return;
        const workouts = data?.workouts || [];
        const summary = data?.summary || {};
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const workoutsThisMonth = workouts.filter((w) => (w.date || '').startsWith(thisMonth)).length;
        const totalWorkouts =
          typeof summary.total_workouts === 'number'
            ? summary.total_workouts
            : workouts.length;

        const totalSets =
          typeof summary.total_sets === 'number'
            ? summary.total_sets
            : workouts.reduce((acc, w) => {
                const perWorkoutSets =
                  (w.statistics && typeof w.statistics.sets_count === 'number'
                    ? w.statistics.sets_count
                    : typeof w.sets_count === 'number'
                    ? w.sets_count
                    : 0);
                return acc + perWorkoutSets;
              }, 0);

        let avgVolumePerWorkout =
          typeof summary.avg_volume_per_workout === 'number'
            ? summary.avg_volume_per_workout
            : (() => {
                if (!workouts.length) return 0;
                const totalVolume = workouts.reduce((acc, w) => {
                  const vol =
                    (w.statistics && typeof w.statistics.total_volume === 'number'
                      ? w.statistics.total_volume
                      : typeof w.total_volume === 'number'
                      ? w.total_volume
                      : 0);
                  return acc + vol;
                }, 0);
                return totalVolume / workouts.length || 0;
              })();

        avgVolumePerWorkout = Math.round(avgVolumePerWorkout * 10) / 10;

        setStats([
          { label: 'All workouts', value: String(totalWorkouts) },
          { label: 'Workouts this month', value: String(workoutsThisMonth) },
          { label: 'All sets', value: String(totalSets) },
          { label: 'Avg volume / workout', value: String(avgVolumePerWorkout) },
        ]);
      })
      .catch((e) => {
        console.error('Failed to load stats:', e);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cancel = loadStats();
    return cancel;
  }, []);

  useImperativeHandle(ref, () => ({
    reload: () => loadStats(),
  }));

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
});

export default Statistics;

